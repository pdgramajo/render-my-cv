/**
 * Typst compile engine (PR-4 tasks 4.8–4.11).
 *
 * Wraps `@myriaddreamin/typst.ts@0.7.0` class-level compiler API:
 *
 * ```
 * createTypstCompiler()
 *   → init({ beforeBuild: [loadFonts(bytes, { assets: false })] })
 *   → addSource(path, content)   // virtual filesystem
 *   → compile({ format: pdf, mainFilePath: '/main.typ' })
 * ```
 *
 * Offline guarantees:
 * - `assets: false` disables the default remote font assets (DejaVu &
 *   Libertinus pulled from cdn.jsdelivr.net by default) — the engine only
 *   uses the vendored Raleway/FA blobs.
 * - Wasm: the browser worker passes the bundled asset URL via `getModule`;
 *   plain-Node ESM runs rely on the package shim; vitest hands over the
 *   `node_modules` bytes directly (`assets.node.ts`).
 *
 * Failures map to the canonical "Typst compilation failed" `PipelineError`
 * (design decision D5) with human-readable `details` from the compiler
 * diagnostics — never a raw stack trace.
 */

import { createTypstCompiler, loadFonts, type TypstCompiler } from '@myriaddreamin/typst.ts';
import { CompileFormatEnum } from '@myriaddreamin/typst.ts/compiler';

import { compileError } from '../rendercv/errors';
import type { CompilePhase } from '../types/worker';
import type { FontBlob, TypstSource } from './assets';
import { MAIN_ENTRY_PATH } from './packageConfig';

export type { CompilePhase };

/**
 * A WebAssembly source for the engine (mirrors the package's
 * `WebAssemblyModuleRef`, which is not re-exported from the entry point).
 */
export type WasmModuleRef =
  | RequestInfo
  | URL
  | Response
  | BufferSource
  | WebAssembly.Module;

/** One compile request: the generated entry plus optional asset overrides. */
export interface CompileRequest {
  /** Generated Typst entry document (mounted at `/main.typ`). */
  entry: string;
  /**
   * Optional virtual-source overrides (virtual path → content). When absent
   * the backend registers the bundled vendored sources.
   */
  sources?: Map<string, string>;
  /**
   * Optional font overrides (public/-relative path → bytes). When absent the
   * backend registers the bundled vendored fonts. Fonts must be decided
   * before engine init, so an override on an already-initialized engine is
   * ignored for the running engine.
   */
  fonts?: Map<string, Uint8Array>;
}

/** Progress callback; `loading-wasm` fires once before the first compile. */
export type CompileProgressListener = (phase: CompilePhase) => void;

/**
 * Asset source abstraction so the same engine runs in the browser
 * (`assets.ts`, fetch) and in Node (`assets.node.ts`, fs).
 */
export interface AssetSource {
  loadSources(): Promise<TypstSource[]>;
  loadFonts(): Promise<FontBlob[]>;
}

/** A Typst compile provider (in-process or worker-backed). */
export interface CompileBackend {
  /**
   * Compile the entry to raw PDF bytes (starting with the `%PDF-` magic
   * header). Lazily initializes the engine on first use.
   *
   * @throws PipelineError "Typst compilation failed" (+ human-readable
   *         `details`) when the engine cannot initialize or the document has
   *         compile errors.
   */
  compile(request: CompileRequest, onProgress?: CompileProgressListener): Promise<Uint8Array>;
}

/** Engine init options. */
export interface TypstEngineOptions {
  /** Loader for the bundled default assets (sources + fonts). */
  assets: AssetSource;
  /**
   * Wasm source for the engine. In the browser, the worker passes the
   * bundled asset URL. In vitest, the suite passes the web-compiler wasm
   * bytes read from `node_modules` (the package's own Node shim reads via
   * `import.meta.url`, which vite-node virtualizes to http and breaks — see
   * `assets.node.ts`). Omit in plain-Node ESM runs to use the shim.
   */
  getModule?: () => WasmModuleRef;
}

/**
 * The in-process Typst engine: lazy init, virtual filesystem, PDF compile.
 * Shared by the main-thread backend (Node tests, browser fallback) and the
 * worker.
 */
export class TypstEngine {
  private compiler: TypstCompiler | undefined;
  private readonly assets: AssetSource;
  private readonly getWasmModule: (() => WasmModuleRef) | undefined;

  constructor(options: TypstEngineOptions) {
    this.assets = options.assets;
    this.getWasmModule = options.getModule;
  }

  /**
   * Initialize the wasm engine once: register the vendored fonts (remote
   * assets disabled) so no network request happens at compile time. A
   * `fontsOverride` (protocol `request.fonts`) replaces the bundled set on
   * first init; the engine's font loader is immutable afterwards.
   */
  async ensure(fontsOverride?: Uint8Array[]): Promise<void> {
    if (this.compiler !== undefined) {
      return;
    }
    const fonts =
      fontsOverride ??
      (await this.assets.loadFonts()).map((font) => font.data);
    const compiler = createTypstCompiler();
    await compiler.init({
      beforeBuild: [loadFonts(fonts, { assets: false })],
      ...(this.getWasmModule !== undefined ? { getModule: this.getWasmModule } : {}),
    });
    this.compiler = compiler;
  }

  /**
   * Compile an entry; the request's optional `sources` override the bundled
   * defaults. Returns the PDF bytes, or throws a canonical PipelineError.
   */
  async compile(request: CompileRequest): Promise<Uint8Array> {
    if (this.compiler === undefined) {
      throw compileError('Engine not initialized; call ensure() first.');
    }
    const sources = request.sources ?? new Map<string, string>();
    const bundled = await this.assets.loadSources();
    for (const source of bundled) {
      this.compiler.addSource(source.path, source.content);
    }
    for (const [path, content] of sources) {
      this.compiler.addSource(path, content);
    }
    this.compiler.addSource(MAIN_ENTRY_PATH, request.entry);

    const result = await this.compiler.compile({
      format: CompileFormatEnum.pdf,
      mainFilePath: MAIN_ENTRY_PATH,
    });
    const diagnostics = result.diagnostics ?? [];
    const errors = diagnostics.filter(
      (diagnostic): diagnostic is DiagnosticMessage =>
        typeof diagnostic === 'object' && diagnostic.severity === 'error',
    );
    if (errors.length > 0) {
      throw compileError(formatDiagnostics(errors));
    }
    const pdf = result.result;
    if (pdf === undefined || pdf.byteLength === 0) {
      throw compileError('Compiler produced no output');
    }
    return pdf;
  }
}

/**
 * Compiler diagnostics (structural mirror of the package's `DiagnosticMessage`,
 * which is not exported from the entry point).
 */
interface DiagnosticMessage {
  /** Package id ("" for the main document). */
  package: string;
  path: string;
  severity: string;
  range: string;
  message: string;
}

/**
 * Human-readable, file-anchored diagnostic details (design D5: never a raw
 * stack trace). The first few error diagnostics, one per line.
 */
function formatDiagnostics(diagnostics: DiagnosticMessage[]): string {
  return diagnostics
    .slice(0, 3)
    .map((diagnostic) => `${diagnostic.path}:${diagnostic.range} — ${diagnostic.message}`)
    .join('\n');
}

/**
 * Coerce an unknown compile failure into the canonical PipelineError. If the
 * failure is already a PipelineError it passes through unchanged; otherwise
 * the message becomes the `details` (never a raw stack trace).
 */
export function toCompileError(error: unknown): ReturnType<typeof compileError> {
  if (error instanceof Error && 'stage' in error && error.name === 'PipelineError') {
    return error as ReturnType<typeof compileError>;
  }
  const details = error instanceof Error ? error.message : String(error);
  return compileError(details);
}