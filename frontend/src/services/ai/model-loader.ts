// Node.js modules
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as stream from 'stream';
import * as util from 'util';

// Promisify for streaming pipelines
const pipeline = util.promisify(stream.pipeline) as (...args: any[]) => Promise<void>;

type DownloadOptions = {
  url: string;
  sha256?: string; // Optional checksum for integrity validation
  filename?: string; // Optional filename
  onProgress?: (downloadedBytes: number, totalBytes?: number) => void;
};

type LoadedModel = {
  name: string;
  path: string; // The resolved model file path
  runtimeSession?: any; // Dynamic runtime type, e.g., ONNX inference session
};

export class ModelLoader {
  private static loadedModels: Map<string, LoadedModel> = new Map();
  private static baseDir: string | null = null;

  /**
   * Initialize ModelLoader - creates/sets directory defaults for model storage
   */
  static init(modelsDir?: string) {
    if (modelsDir) {
      this.baseDir = modelsDir;
    } else if (!this.baseDir) {
      this.baseDir = path.join(os.homedir(), '.darkroom', 'models');
    }
  }

  private static ensureBaseDir(): string {
    if (!this.baseDir) {
      this.init();
    }
    return this.baseDir as string;
  }

  /**
   * Get list of available model files in directory
   */
  static async listAvailableOnDisk(): Promise<string[]> {
    const dir = this.ensureBaseDir();
    try {
      const files = await fsPromises.readdir(dir);
      return files;
    } catch (err: any) {
      if ((err.code as string) === 'ENOENT') return [];
      throw err;
    }
  }

  /**
   * Check if a file exists in the models directory
   */
  static async modelExistsOnDisk(filename: string): Promise<boolean> {
    const dir = this.ensureBaseDir();
    const filepath = path.join(dir, filename);
    try {
      const stats = await fsPromises.stat(filepath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Compute sha256 checksum for a file
   */
  private static async computeSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const readStream = fs.createReadStream(filePath);

      readStream.on('error', reject);
      readStream.on('data', (chunk: Buffer | string) => {
        if (typeof chunk === 'string') {
          hash.update(Buffer.from(chunk));
        } else {
          hash.update(chunk);
        }
      });

      readStream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  /**
   * Download a model, verify checksum, and save locally
   */
  static async downloadModel(modelName: string, options: DownloadOptions): Promise<string> {
    if (!options?.url) {
      throw new Error('downloadModel requires a valid URL');
    }

    const dir = this.ensureBaseDir();
    await fsPromises.mkdir(dir, { recursive: true });

    const filename = options.filename ?? path.basename(new URL(options.url).pathname) ?? `${modelName}.bin`;
    const finalPath = path.join(dir, filename);
    const tmpPath = `${finalPath}.download`;

    if (await this.modelExistsOnDisk(filename)) {
      if (options.sha256) {
        const existingHash = await this.computeSha256(finalPath);
        if (existingHash === options.sha256.toLowerCase()) {
          return finalPath;
        }
        await fsPromises.unlink(finalPath).catch(() => {});
      } else {
        return finalPath;
      }
    }

    let axios: any;
    try {
      axios = (await import('axios')).default;
    } catch {
      throw new Error('axios is required. Install: npm install axios');
    }

    const response = await axios.get(options.url, { responseType: 'stream' });

    const totalBytes = response.headers['content-length'] ? parseInt(response.headers['content-length'], 10) : undefined;
    let downloaded = 0;

    response.data.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;
      options.onProgress?.(downloaded, totalBytes);
    });

    await pipeline(response.data, fs.createWriteStream(tmpPath));

    if (options.sha256) {
      const hash = await this.computeSha256(tmpPath);
      if (hash.toLowerCase() !== options.sha256.toLowerCase()) {
        await fsPromises.unlink(tmpPath).catch(() => {});
        throw new Error(`Checksum mismatch for ${modelName}. Expected: ${options.sha256}, Got: ${hash}`);
      }
    }

    await fsPromises.rename(tmpPath, finalPath);
    return finalPath;
  }

  /**
   * Load model with runtime support
   */
  static async loadModel(modelName: string, modelPath?: string): Promise<LoadedModel> {
    if (this.loadedModels.has(modelName)) {
      return this.loadedModels.get(modelName) as LoadedModel;
    }

    const dir = this.ensureBaseDir();
    if (!modelPath) {
      const candidates = await this.listAvailableOnDisk();
      const match = candidates.find((file) => file.includes(modelName));
      if (!match) {
        throw new Error(`Model ${modelName} not found on disk. Provide a path or download the model.`);
      }
      modelPath = path.join(dir, match);
    }

    if (!modelPath) {
      throw new Error(`Failed to resolve model path for model: ${modelName}`);
    }

    const model: LoadedModel = { name: modelName, path: modelPath };

    try {
      const ort = require('onnxruntime-node'); // Dynamically import ONNX runtime (optional)
      if (ort.InferenceSession?.create) {
        model.runtimeSession = await ort.InferenceSession.create(modelPath);
      }
    } catch {
      console.debug('onnxruntime-node not available; skipping runtime loading');
    }

    this.loadedModels.set(modelName, model);
    return model;
  }
}