/**
 * Worker client (PR-4 task 4.10).
 *
 * Spawns the compile worker lazily (never in Node tests), correlates
 * responses by `requestId`, and surfaces worker failures as the canonical
 * "Typst compilation failed" PipelineError (with the worker's `details`).
 */

import { compileError } from '../rendercv/errors';
import type { WorkerResponseMessage } from '../types/worker';

import type { CompileBackend, CompileProgressListener, CompileRequest } from './compile';

export interface PendingCompile {
  onProgress?: CompileProgressListener;
  resolve: (pdf: ArrayBuffer) => void;
  reject: (error: Error) => void;
}

/** Creates the underlying Web Worker; isolated for testability. */
function createCompileWorker(): Worker {
  return new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
}

/** Pending-compile map keyed by requestId. */
export class WorkerClient implements CompileBackend {
  private worker: Worker | undefined;
  private readonly pending = new Map<string, PendingCompile>();
  private nextRequestId = 0;
  private spawnPromise: Promise<Worker> | undefined;

  private async spawn(): Promise<Worker> {
    if (this.worker !== undefined) {
      return this.worker;
    }
    this.spawnPromise ??= new Promise<Worker>((resolve, reject) => {
      const worker = createCompileWorker();
      worker.addEventListener('message', (event: MessageEvent<WorkerResponseMessage>) => {
        this.handleMessage(event.data);
      });
      worker.addEventListener('error', (event: ErrorEvent) => {
        this.failAll(event.message ?? 'Worker crashed');
        reject(new Error(event.message ?? 'Worker crashed'));
      });
      this.worker = worker;
      resolve(worker);
    });
    return this.spawnPromise;
  }

  private handleMessage(message: WorkerResponseMessage): void {
    switch (message.type) {
      case 'ready':
        return;
      case 'progress': {
        const pending = this.pending.get(message.requestId);
        pending?.onProgress?.(message.phase);
        return;
      }
      case 'result': {
        const pending = this.pending.get(message.requestId);
        if (pending !== undefined) {
          this.pending.delete(message.requestId);
          pending.resolve(message.pdf);
        }
        return;
      }
      case 'error': {
        const pending = this.pending.get(message.requestId);
        if (pending !== undefined) {
          this.pending.delete(message.requestId);
          pending.reject(compileError(message.details));
        }
        return;
      }
    }
  }

  private failAll(reason: string): void {
    for (const [, pending] of this.pending) {
      pending.reject(new Error(reason));
    }
    this.pending.clear();
  }

  compile(
    request: CompileRequest,
    onProgress?: CompileProgressListener,
  ): Promise<Uint8Array> {
    return this.spawn().then((worker) => {
      const requestId = `compile-${++this.nextRequestId}`;
      const response = new Promise<ArrayBuffer>((resolve, reject) => {
        this.pending.set(requestId, { onProgress, resolve, reject });
      });
      worker.postMessage({
        type: 'compile',
        requestId,
        entry: request.entry,
        ...(request.fonts !== undefined ? { fonts: request.fonts } : {}),
        ...(request.sources !== undefined ? { sources: request.sources } : {}),
      });
      return response.then((pdf) => new Uint8Array(pdf));
    });
  }
}