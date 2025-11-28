/* src/services/ai/processing-queue.ts
 *
 * Runtime-agnostic processing queue for Darkroom.
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';

/* ---------- Types ---------- */

export type JobType =
  | 'super_res'
  | 'inpaint'
  | 'object_detect'
  | 'object_replace'
  | 'export'
  | 'import'
  | 'custom';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface JobOptions {
  [key: string]: any;
}

export interface Job {
  id: string;
  type: JobType;
  inputPath?: string;
  outputPath?: string;
  options?: JobOptions;
  status: JobStatus;
  progress: number;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  result?: any;
  error?: string;
}

export interface JobResult {
  success: boolean;
  outputPath?: string;
  meta?: any;
  error?: string;
}

/* ---------- Cancellation Token ---------- */

export class CancellationToken {
  private _cancelled = false;
  private _reason?: string;

  cancel(reason?: string): void {
    this._cancelled = true;
    this._reason = reason;
  }

  get isCancelled(): boolean {
    return this._cancelled;
  }

  get reason(): string | undefined {
    return this._reason;
  }
}

/* ---------- Runner abstraction ---------- */

export interface Runner {
  id: string;
  name: string;
  capabilities: JobType[];
  run(job: Job, onProgress: (p: number) => void, cancellation: CancellationToken): Promise<JobResult>;
  shutdown?: () => Promise<void>;
}

/* ---------- Utility helpers ---------- */

function makeId(prefix = ''): string {
  try {
    return (prefix ? prefix + '-' : '') + crypto.randomUUID();
  } catch {
    return (prefix ? prefix + '-' : '') + `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

function safeJsonStringify(v: any): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return '"[unserializable]"';
  }
}

/* ---------- ProcessingQueue implementation ---------- */

export class ProcessingQueue extends EventEmitter {
  private concurrency: number;
  private runners: Map<string, Runner> = new Map();
  private queue: Job[] = [];
  private activeCount = 0;
  private activeJobs: Map<string, { job: Job; cancellation: CancellationToken }> = new Map();
  private isProcessing = false;

  constructor(concurrency = 2) {
    super();
    this.concurrency = Math.max(1, concurrency);
  }

  setConcurrency(n: number): void {
    this.concurrency = Math.max(1, n);
    this._tick();
  }

  addRunner(runner: Runner): void {
    this.runners.set(runner.id, runner);
    this.emit('runner-added', runner);
    this._tick();
  }

  removeRunner(runnerId: string): void {
    const r = this.runners.get(runnerId);
    if (!r) return;
    if (typeof r.shutdown === 'function') {
      r.shutdown().catch((err) => console.warn('Runner shutdown error', err));
    }
    this.runners.delete(runnerId);
    this.emit('runner-removed', runnerId);
  }

  enqueue(jobSpec: {
    type: JobType;
    inputPath?: string;
    outputPath?: string;
    options?: JobOptions;
  }): Job {
    const job: Job = {
      id: makeId('job'),
      type: jobSpec.type,
      inputPath: jobSpec.inputPath,
      outputPath: jobSpec.outputPath,
      options: jobSpec.options || {},
      status: 'queued',
      progress: 0,
      createdAt: Date.now(),
    };
    this.queue.push(job);
    this.emit('job-queued', job);
    this._tick();
    return job;
  }

  listJobs(): Job[] {
    return [...this.queue, ...Array.from(this.activeJobs.values()).map((o) => o.job)];
  }

  getJob(jobId: string): Job | null {
    const inQueue = this.queue.find((j) => j.id === jobId);
    if (inQueue) return inQueue;
    const active = this.activeJobs.get(jobId);
    return active ? active.job : null;
  }

  async cancel(jobId: string): Promise<boolean> {
    const idx = this.queue.findIndex((j) => j.id === jobId);
    if (idx >= 0) {
      const [job] = this.queue.splice(idx, 1);
      job.status = 'cancelled';
      job.finishedAt = Date.now();
      job.progress = 0;
      this.emit('job-cancelled', job);
      return true;
    }

    const active = this.activeJobs.get(jobId);
    if (active) {
      active.cancellation.cancel('user_cancelled');
      return true;
    }
    return false;
  }

  private _findAvailableRunnerFor(job: Job): Runner | null {
    for (const runner of this.runners.values()) {
      if (runner.capabilities.includes(job.type)) return runner;
    }
    return null;
  }

  private async _tick(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      while (this.activeCount < this.concurrency && this.queue.length > 0) {
        const job = this.queue.shift() as Job;
        const runner = this._findAvailableRunnerFor(job);
        if (!runner) {
          this.queue.unshift(job);
          break;
        }
        // Start job (don't await here so multiple can run in parallel)
        this._startJobWithRunner(job, runner).catch((err) => {
          console.error('Unexpected processing error', err);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async _startJobWithRunner(job: Job, runner: Runner): Promise<void> {
    this.activeCount++;
    job.status = 'running';
    job.startedAt = Date.now();
    job.progress = 0;
    this.emit('job-start', job, runner);

    const cancellation = new CancellationToken();
    this.activeJobs.set(job.id, { job, cancellation });

    const onProgress = (p: number) => {
      const pct = Math.max(0, Math.min(100, Math.floor(p)));
      job.progress = pct;
      this.emit('job-progress', job, pct);
    };

    try {
      const result = await runner.run(job, onProgress, cancellation);
      if (cancellation.isCancelled) {
        job.status = 'cancelled';
        job.finishedAt = Date.now();
        job.result = result;
        this.emit('job-cancelled', job);
      } else if (result.success) {
        job.status = 'completed';
        job.progress = 100;
        job.result = { ...result.meta, outputPath: result.outputPath };
        job.finishedAt = Date.now();
        job.outputPath = result.outputPath ?? job.outputPath;
        this.emit('job-complete', job, result);
      } else {
        job.status = 'failed';
        job.error = result.error || 'unknown error';
        job.finishedAt = Date.now();
        this.emit('job-failed', job, result.error);
      }
    } catch (err: any) {
      job.status = 'failed';
      job.error = String(err?.message ?? err);
      job.finishedAt = Date.now();
      this.emit('job-failed', job, job.error);
    } finally {
      this.activeJobs.delete(job.id);
      this.activeCount = Math.max(0, this.activeCount - 1);
      this._tick();
    }
  }

  async shutdown(): Promise<void> {
    while (this.queue.length) {
      const job = this.queue.shift()!;
      job.status = 'cancelled';
      job.finishedAt = Date.now();
      this.emit('job-cancelled', job);
    }

    for (const entry of this.activeJobs.values()) {
      entry.cancellation.cancel('shutdown');
    }

    for (const runner of this.runners.values()) {
      if (typeof runner.shutdown === 'function') {
        try {
          await runner.shutdown();
        } catch (err) {
          console.warn('Runner shutdown error', err);
        }
      }
    }
  }
}

/* ---------- PresetManager (simple JSON-based) ---------- */

export type Preset = {
  name: string;
  createdAt: number;
  updatedAt: number;
  operations: any[];
  meta?: any;
};

export class PresetManager {
  private filePath: string;
  private cache: Map<string, Preset> | null = null;

  constructor(filePath?: string) {
    const base = filePath || path.join(os.homedir(), '.darkroom', 'presets.json');
    this.filePath = base;
  }

  private async ensureDir(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  private async readAll(): Promise<Map<string, Preset>> {
    if (this.cache) return this.cache;
    try {
      const str = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(str);
      const map = new Map<string, Preset>();
      if (parsed?.presets && typeof parsed.presets === 'object') {
        for (const [k, v] of Object.entries(parsed.presets)) {
          map.set(k, v as Preset);
        }
      }
      this.cache = map;
      return map;
    } catch (err: any) {
      if ((err as any)?.code === 'ENOENT') {
        this.cache = new Map();
        return this.cache;
      }
      throw err;
    }
  }

  private async writeAll(map: Map<string, Preset>): Promise<void> {
    await this.ensureDir();
    const obj: any = { version: 1, presets: Object.create(null) };
    for (const [k, v] of map.entries()) obj.presets[k] = v;
    const tmp = this.filePath + '.tmp';
    await fs.writeFile(tmp, safeJsonStringify(obj), 'utf-8');
    await fs.rename(tmp, this.filePath);
    this.cache = new Map(map);
  }

  async savePreset(name: string, operations: any[], meta?: any): Promise<Preset> {
    if (!name || typeof name !== 'string') throw new Error('Preset name required');
    const map = await this.readAll();
    const now = Date.now();
    const existing = map.get(name);
    const preset: Preset = {
      name,
      operations,
      meta,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
    map.set(name, preset);
    await this.writeAll(map);
    return preset;
  }

  async getPreset(name: string): Promise<Preset | null> {
    const map = await this.readAll();
    return map.get(name) ?? null;
  }

  async listPresets(): Promise<Preset[]> {
    const map = await this.readAll();
    return Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deletePreset(name: string): Promise<boolean> {
    const map = await this.readAll();
    const existed = map.delete(name);
    if (existed) await this.writeAll(map);
    return existed;
  }
}

/* ---------- Stub runners for local testing ---------- */

export class StubOnnxRunner implements Runner {
  id: string;
  name = 'stub-onnx';
  capabilities: JobType[];

  constructor(capabilities: JobType[] = ['super_res', 'object_detect']) {
    this.id = makeId('onnx');
    this.capabilities = capabilities;
  }

  async run(job: Job, onProgress: (p: number) => void, cancellation: CancellationToken): Promise<JobResult> {
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      if (cancellation.isCancelled) {
        return { success: false, error: 'cancelled' };
      }
      await new Promise((res) => setTimeout(res, 120));
      onProgress(Math.round((i / steps) * 80));
    }

    const outPath =
      job.outputPath ||
      path.join(os.tmpdir(), `${job.id}-onnx-output${path.extname(job.inputPath || '.png')}`);

    try {
      if (job.inputPath && fsSync.existsSync(job.inputPath)) {
        await fs.copyFile(job.inputPath, outPath);
      } else {
        await fs.writeFile(outPath, 'stub-onnx-output', 'utf8');
      }
    } catch (err: any) {
      return { success: false, error: String(err?.message ?? err) };
    }

    onProgress(100);
    return { success: true, outputPath: outPath, meta: { runner: this.name } };
  }
}

export class StubPythonRunner implements Runner {
  id: string;
  name = 'stub-python';
  capabilities: JobType[];

  constructor(capabilities: JobType[] = ['inpaint', 'object_replace', 'export']) {
    this.id = makeId('py');
    this.capabilities = capabilities;
  }

  async run(job: Job, onProgress: (p: number) => void, cancellation: CancellationToken): Promise<JobResult> {
    const phases = [20, 40, 70, 90];
    for (let i = 0; i < phases.length; i++) {
      if (cancellation.isCancelled) return { success: false, error: 'cancelled' };
      await new Promise((res) => setTimeout(res, 400 + Math.random() * 300));
      onProgress(phases[i]);
    }

    const outPath =
      job.outputPath ||
      path.join(os.tmpdir(), `${job.id}-py-output${path.extname(job.inputPath || '.png')}`);

    try {
      if (job.inputPath && fsSync.existsSync(job.inputPath)) {
        await fs.copyFile(job.inputPath, outPath);
      } else {
        await fs.writeFile(outPath, 'stub-python-output', 'utf8');
      }
    } catch (err: any) {
      return { success: false, error: String(err?.message ?? err) };
    }
    onProgress(100);
    return { success: true, outputPath: outPath, meta: { runner: this.name } };
  }
}

export default ProcessingQueue;