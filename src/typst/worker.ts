/**
 * Typst compile Web Worker (PR-4 task 4.9).
 *
 * Implements the `src/types/worker.ts` protocol: `compile` in, `ready` /
 * `progress` / `result` / `error` out. The engine initializes lazily on the
 * first compile (wasm fetch + font registration → progress `loading-wasm`),
 * and the PDF bytes are transferred back without a copy.
 *
 * This module is browser-only: it statically imports the vendored asset
 * loader (`assets.ts`, fetch) and the bundled wasm URL (`?url`), and is never
 * imported by the Vitest suites.
 */

import wasmUrl from '@myriaddreamin/typst-ts-web-compiler/wasm?url';

import type {
  WorkerErrorMessage,
  WorkerProgressMessage,
  WorkerReadyMessage,
  WorkerRequestMessage,
  WorkerResultMessage,
} from '../types/worker';

import { loadVendoredFonts, loadVendoredSources } from './assets';
import { MainThreadBackend } from './backends/mainThread';
import { toCompileError } from './compile';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

const backend = new MainThreadBackend({
  assets: { loadSources: loadVendoredSources, loadFonts: loadVendoredFonts },
  getModule: (): string => wasmUrl,
});

let ready = false;
let readyNotified = false;

async function notifyReadyIfNeeded(): Promise<void> {
  if (ready && !readyNotified) {
    readyNotified = true;
    const message: WorkerReadyMessage = { type: 'ready' };
    ctx.postMessage(message);
  }
}

function reportCompiling(requestId: string): void {
  const progress: WorkerProgressMessage = { type: 'progress', requestId, phase: 'compiling' };
  ctx.postMessage(progress);
}

ctx.onmessage = async (event: MessageEvent<WorkerRequestMessage>): Promise<void> => {
  const request = event.data;
  if (request.type !== 'compile') {
    return;
  }
  const { requestId } = request;
  try {
    await backend.ensure(
      () => {
        const progress: WorkerProgressMessage = {
          type: 'progress',
          requestId,
          phase: 'loading-wasm',
        };
        ctx.postMessage(progress);
      },
      // Fonts must be registered at engine init; an override only applies
      // when the engine has not been created yet (first compile).
      request.fonts === undefined ? undefined : [...request.fonts.values()],
    );
    ready = true;
    await notifyReadyIfNeeded();

    reportCompiling(requestId);
    const pdf = await backend.compile({
      entry: request.entry,
      sources: request.sources,
      fonts: request.fonts,
    });
    // Detach the bytes into a fresh ArrayBuffer so the transfer is exact
    // (TypedArray views can otherwise back a SharedArrayBuffer).
    const transfer = new Uint8Array(pdf.length);
    transfer.set(pdf);
    const pdfBuffer = transfer.buffer;
    const result: WorkerResultMessage = { type: 'result', requestId, pdf: pdfBuffer };
    ctx.postMessage(result, [pdfBuffer]);
  } catch (error) {
    const pipelineError = toCompileError(error);
    const failure: WorkerErrorMessage = {
      type: 'error',
      requestId,
      message: pipelineError.message,
      details: pipelineError.details,
    };
    ctx.postMessage(failure);
  }
};