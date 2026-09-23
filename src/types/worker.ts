/**
 * Typst worker protocol messages.
 *
 * Main thread → worker: `compile`. Worker → main: `ready`, `progress`,
 * `result`, `error`. Requests and their results are correlated by
 * `requestId`; the PDF bytes in `result` are transferable.
 */

export type CompilePhase = 'loading-wasm' | 'compiling';

export interface CompileRequestMessage {
  type: 'compile';
  requestId: string;
  /** Generated Typst entry document. */
  entry: string;
  /** Optional overrides; when absent the worker uses the bundled defaults. */
  fonts?: Map<string, Uint8Array>;
  sources?: Map<string, string>;
}

export type WorkerRequestMessage = CompileRequestMessage;

export interface WorkerReadyMessage {
  type: 'ready';
}

export interface WorkerProgressMessage {
  type: 'progress';
  requestId: string;
  phase: CompilePhase;
}

export interface WorkerResultMessage {
  type: 'result';
  requestId: string;
  /** PDF bytes, transferable to the main thread. */
  pdf: ArrayBuffer;
}

export interface WorkerErrorMessage {
  type: 'error';
  requestId: string;
  /** Canonical message: "Typst compilation failed". */
  message: string;
  details?: string;
}

export type WorkerResponseMessage =
  | WorkerReadyMessage
  | WorkerProgressMessage
  | WorkerResultMessage
  | WorkerErrorMessage;