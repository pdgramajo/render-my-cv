/**
 * In-process compile backend (PR-4 task 4.8).
 *
 * Runs the Typst engine on the calling thread — inside the worker, as the
 * Node/Vitest path, and as a browser fallback. Progress is reported through
 * the shared `CompilePhase` ('loading-wasm' → 'compiling').
 */

import type {
  AssetSource,
  CompileBackend,
  CompileProgressListener,
  CompileRequest,
  WasmModuleRef,
} from '../compile';
import { TypstEngine, toCompileError } from '../compile';

export interface MainThreadBackendOptions {
  /** Bundled default assets (browser fetch or Node fs). */
  assets: AssetSource;
  /** Wasm source for the engine (browser asset URL; test bytes in vitest). */
  getModule?: () => WasmModuleRef;
}

/** `CompileBackend` that compiles in-process via `TypstEngine`. */
export class MainThreadBackend implements CompileBackend {
  private readonly engine: TypstEngine;
  private ready = false;

  constructor(options: MainThreadBackendOptions) {
    this.engine = new TypstEngine({ assets: options.assets, getModule: options.getModule });
  }

  /** Initialize the engine now (wasm + fonts); used for warm-ups and tests. */
  async ensure(
    onProgress?: CompileProgressListener,
    fontsOverride?: Uint8Array[],
  ): Promise<void> {
    if (this.ready) {
      return;
    }
    onProgress?.('loading-wasm');
    try {
      await this.engine.ensure(fontsOverride);
      this.ready = true;
    } catch (error) {
      throw toCompileError(error);
    }
  }

  async compile(
    request: CompileRequest,
    onProgress?: CompileProgressListener,
  ): Promise<Uint8Array> {
    const fontsOverride =
      request.fonts === undefined ? undefined : [...request.fonts.values()];
    await this.ensure(onProgress, fontsOverride);
    try {
      onProgress?.('compiling');
      return await this.engine.compile(request);
    } catch (error) {
      throw toCompileError(error);
    }
  }
}