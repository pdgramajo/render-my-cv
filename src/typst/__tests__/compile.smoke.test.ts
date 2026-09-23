/**
 * PR-4 smoke suite (tasks 4.6, 4.7, 4.8, design decisions D5/D6).
 *
 * Three guarantees, exercised against the REAL vendored assets:
 *
 * 1. The vendored sources/fonts load from the repo `public/typst/` tree and
 *    match the manifest — including the patched rendercv entry import
 *    (`typst_fontawesome/lib.typ` instead of `@preview/fontawesome:0.6.0`).
 * 2. A RenderCV-2.8-shaped document (star import + `rendercv.with` +
 *    connections with `connection-with-icon`, mirroring Preamble.j2.typ and
 *    Header.j2.typ) compiles to a real PDF with `fetch` stubbed to throw:
 *    zero network traffic (fonts are vendored and `assets: false` disables
 *    the remote DejaVu/Libertinus loader).
 * 3. Compile failures surface as the canonical "Typst compilation failed"
 *    PipelineError with human-readable details (D5).
 *
 * The suite runs the in-process MainThreadBackend with the Node asset source;
 * the browser worker path behind it shares the same engine.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { PipelineError } from '../../types/pipeline';
import { loadNodeWasmBytes, loadVendoredFonts, loadVendoredSources } from '../assets.node';
import { MainThreadBackend } from '../backends/mainThread';
import { FONT_MANIFEST } from '../fontConfig';
import {
  RENDERCV_ENTRY_PATH,
  VENDORED_SOURCE_FILES,
} from '../packageConfig';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('vendored typst assets (task 4.6/4.7)', () => {
  it('ships the full vendored source manifest', async () => {
    const sources = await loadVendoredSources();
    expect(sources).toHaveLength(VENDORED_SOURCE_FILES.length);
    expect(sources.map((source) => source.path)).toEqual(
      VENDORED_SOURCE_FILES.map((file) => file.path),
    );
  });

  it('carries the patched rendercv entry import (fontawesome vendored)', async () => {
    const sources = await loadVendoredSources();
    const rendercv = sources.find((source) => source.path === RENDERCV_ENTRY_PATH);
    expect(rendercv).toBeDefined();
    expect(rendercv!.content.startsWith('#import "typst_fontawesome/lib.typ": fa-icon')).toBe(
      true,
    );
  });

  it('ships the four manifest fonts (Raleway 400/700, FA6 regular/solid)', async () => {
    const fonts = await loadVendoredFonts();
    expect(fonts.map((font) => font.path)).toEqual(FONT_MANIFEST.map((entry) => entry.file));
    const raleway = FONT_MANIFEST.filter((entry) => entry.family === 'Raleway');
    expect(raleway.map((entry) => entry.weight)).toEqual([400, 700]);
    expect(FONT_MANIFEST.some((entry) => entry.file.endsWith('fa-regular-400.ttf'))).toBe(true);
    expect(FONT_MANIFEST.some((entry) => entry.file.endsWith('fa-solid-900.ttf'))).toBe(true);
  });
});

describe('typst compile via MainThreadBackend (task 4.8)', () => {
  /** Real RenderCV shape: Preamble.j2 star-import + Header.j2 connections. */
  const REAL_CV_ENTRY = `#import "/rendercv/lib.typ": *

#show: rendercv.with()

= John Doe

#connections(
  [#link("https://github.com/example", icon: false, if-underline: false, if-color: false)[#connection-with-icon("github")[example]]],
)`;

  it('compiles a RenderCV-shaped document to a PDF with zero network traffic', async () => {
    // Any fetch (remote fonts, wasm, assets) must fail the compile.
    const fetch = vi.fn().mockRejectedValue(new Error('network blocked'));
    vi.stubGlobal('fetch', fetch);

    const backend = new MainThreadBackend({
      assets: { loadSources: loadVendoredSources, loadFonts: loadVendoredFonts },
      getModule: loadNodeWasmBytes,
    });
    const phases: string[] = [];
    const pdf = await backend.compile(
      { entry: REAL_CV_ENTRY },
      (phase) => phases.push(phase),
    );

    expect(phases).toEqual(['loading-wasm', 'compiling']);
    expect(pdf.length).toBeGreaterThan(1000);
    expect(new TextDecoder().decode(pdf.subarray(0, 5))).toBe('%PDF-');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('maps Typst diagnostics to the canonical compile PipelineError (D5)', async () => {
    const backend = new MainThreadBackend({
      assets: { loadSources: loadVendoredSources, loadFonts: loadVendoredFonts },
      getModule: loadNodeWasmBytes,
    });

    try {
      await backend.compile({ entry: '#let broken = (' });
    } catch (error) {
      expect(error).toBeInstanceOf(PipelineError);
      const failure = error as PipelineError;
      expect(failure.stage).toBe('compile');
      expect(failure.message).toBe('Typst compilation failed');
      expect(failure.details).toContain('main.typ');
      return;
    }
    throw new Error('expected the compile to fail');
  });
});