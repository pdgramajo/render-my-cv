/**
 * Worker-backed compile backend (PR-4 task 4.11).
 *
 * The production path: `compile()` delegates to the main-thread client, which
 * forwards the request to the compile worker and correlates the response.
 */

import type { CompileProgressListener, CompileRequest } from '../compile';
import type { CompileBackend } from '../compile';
import { WorkerClient } from '../client';

export type { CompileProgressListener };

/** `CompileBackend` that compiles off-thread in the Typst worker. */
export class WorkerBackend implements CompileBackend {
  private readonly client = new WorkerClient();

  compile(
    request: CompileRequest,
    onProgress?: CompileProgressListener,
  ): Promise<Uint8Array> {
    return this.client.compile(request, onProgress);
  }
}