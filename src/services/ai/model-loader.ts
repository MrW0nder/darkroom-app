import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as stream from 'stream';
import * as util from 'util';

const pipeline = util.promisify(stream.pipeline) as unknown as (...args: any[]) => Promise<void>;

type DownloadOptions = {
  url: string;
  sha256?: string; // optional checksum to verify integrity
  filename?: string; // optional preferred filename
  onProgress?: (downloadedBytes: number, totalBytes?: number) => void;
};

type LoadedModel = {
  name: string;
  path: string;
  runtimeSession?: any; // optional runtime session (e.g., ONNX session) if created
};

export class ModelLoader {
  private static loadedModels: Map<string, LoadedModel> = new Map();
  private static baseDir: string | null = null;

  /**
   * Initialize ModelLoader with an explicit models directory.
   * If not called, a default will be used: ~/.darkroom/models
   */
  static init(modelsDir?: string) {
    if (modelsDir) {
      this.baseDir = modelsDir;
    } else if (!this.baseDir) {
      this.baseDir = path.join(os.homedir(), '.darkroom', 'models');
    }
  }

  private static ensureBaseDir() {
    if (!this.baseDir) {
      this.init();
    }
    return this.baseDir as string;
  }

  static async listAvailableOnDisk(): Promise<string[]> {
    const dir = this.ensureBaseDir();
    try {
      const files = await fsPromises.readdir(dir);
      return files;
    } catch (err) {
      if ((err as any)?.code === 'ENOENT') return [];
      throw err;
    }
  }

  static async modelExistsOnDisk(filename: string): Promise<boolean> {
    const dir = this.ensureBaseDir();
    const filepath = path.join(dir, filename);
    try {
      const st = await fsPromises.stat(filepath);
      return st.isFile();
    } catch {
      return false;
    }
  }

  private static async computeSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const s = fs.createReadStream(filePath);
      s.on('error', reject);
      s.on('data', (chunk: Buffer) => hash.update(chunk));
      s.on('end', () => resolve(hash.digest('hex')));
    });
  }

  /**
   * Download a model to the local models directory. If sha256 is provided,
   * verifies file integrity. Emits progress via onProgress callback.
   *
   * Returns the absolute path to the saved file.
   */
  static async downloadModel(modelName: string, options: DownloadOptions): Promise<string> {
    if (!options?.url) throw new Error('downloadModel requires a url');

    const dir = this.ensureBaseDir();
    await fsPromises.mkdir(dir, { recursive: true });

    const filename =
      options.filename ||
      path.basename(new URL(options.url).pathname) ||
      `${modelName}.bin`;
    const finalPath = path.join(dir, filename);
    const tmpPath = finalPath + '.download';

    // If file already exists and checksum matches (if provided), skip download
    if (await this.modelExistsOnDisk(filename)) {
      if (options.sha256) {
        const existingHash = await this.computeSha256(finalPath);
        if (existingHash === options.sha256.toLowerCase()) {
          return finalPath;
        }
        // If checksum mismatch, remove and re-download
        await fsPromises.unlink(finalPath).catch(() => {});
      } else {
        // No checksum provided — assume existing is fine
        return finalPath;
      }
    }

    // Lazy-dynamic import of axios to avoid hard dependency at top-level
    let axios: any;
    try {
      axios = (await import('axios')).default;
    } catch (err) {
      throw new Error('axios is required for downloading models. Please install it: npm install axios');
    }

    const response = await axios.get(options.url, { responseType: 'stream', timeout: 120000 });

    const totalBytes = response.headers?.['content-length']
      ? parseInt(response.headers['content-length'], 10)
      : undefined;
    let downloaded = 0;

    response.data.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;
      if (typeof options.onProgress === 'function') {
        try {
          options.onProgress(downloaded, totalBytes);
        } catch (err) {
          // swallow user callback errors
          // eslint-disable-next-line no-console
          console.error('onProgress callback error', err);
        }
      }
    });

    // Stream to temp file then verify and rename
    await pipeline(response.data, fs.createWriteStream(tmpPath));

    if (options.sha256) {
      const hash = await this.computeSha256(tmpPath);
      if (hash.toLowerCase() !== options.sha256.toLowerCase()) {
        // remove tmp and throw
        try {
          await fsPromises.unlink(tmpPath);
        } catch {
          // ignore
        }
        throw new Error(`Checksum mismatch for downloaded model ${modelName}. expected=${options.sha256} got=${hash}`);
      }
    }

    // Move tmp to final
    await fsPromises.rename(tmpPath, finalPath);
    return finalPath;
  }

  /**
   * Load a model into memory / runtime if possible.
   * - If onnxruntime-node is installed, tries to create an InferenceSession.
   * - Otherwise returns the path to the model file.
   *
   * Note: heavy runtime loading should be done in a worker or the main process, not the renderer.
   */
  static async loadModel(modelName: string, modelPath?: string): Promise<LoadedModel> {
    if (this.loadedModels.has(modelName)) {
      return this.loadedModels.get(modelName) as LoadedModel;
    }

    if (!modelPath) {
      // try to locate by name in base dir
      const dir = this.ensureBaseDir();
      const candidates = await this.listAvailableOnDisk();
      const match = candidates.find((f) => f.includes(modelName));
      if (!match) {
        throw new Error(`Model ${modelName} not found on disk. Call downloadModel first or pass modelPath.`);
      }
      modelPath = path.join(dir, match);
    }

    const loaded: LoadedModel = { name: modelName, path: modelPath };

    // Attempt to load ONNX runtime session if available
    try {
      // dynamic require allows graceful degradation if the package isn't installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ort = require('onnxruntime-node');
      if (ort) {
        // Some runtimes use InferenceSession.create; handle both patterns
        if (typeof ort.InferenceSession?.create === 'function') {
          loaded.runtimeSession = await ort.InferenceSession.create(modelPath);
        } else if (typeof ort.InferenceSession === 'function') {
          // older API: maybe new ort.InferenceSession(options) or similar
          // call as a constructor if available
          try {
            // @ts-ignore - runtime-specific API
            loaded.runtimeSession = await new ort.InferenceSession({ modelPath });
          } catch {
            // ignore constructor failures
          }
        }
      }
    } catch (err) {
      // onnxruntime-node not available or session failed; fallback to providing path only
      // eslint-disable-next-line no-console
      console.debug('onnxruntime-node unavailable or failed to load model; continuing with path-only model.', (err as any)?.message || err);
    }

    this.loadedModels.set(modelName, loaded);
    return loaded;
  }

  static isModelLoaded(modelName: string): boolean {
    return this.loadedModels.has(modelName);
  }

  static getLoadedModels(): string[] {
    return Array.from(this.loadedModels.keys());
  }

  static async unloadModel(modelName: string): Promise<void> {
    const entry = this.loadedModels.get(modelName);
    if (!entry) return;
    // If runtimeSession supports dispose, call it
    try {
      if (entry.runtimeSession && typeof entry.runtimeSession.dispose === 'function') {
        await entry.runtimeSession.dispose();
      }
    } catch {
      // ignore
    }
    this.loadedModels.delete(modelName);
  }

  /**
   * Helper to get absolute path to a model file by name (if it exists)
   */
  static async getModelPathByName(modelName: string): Promise<string | null> {
    const dir = this.ensureBaseDir();
    const candidates = await this.listAvailableOnDisk();
    const match = candidates.find((f) => f.includes(modelName));
    if (!match) return null;
    return path.join(dir, match);
  }
}