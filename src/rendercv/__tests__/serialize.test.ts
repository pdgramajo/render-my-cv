/**
 * Serializer suite — model → YAML is the exact inverse of `convertToModel`.
 *
 * Acceptance: roundtrip `parse(example.yaml) → model → serialize → parse →
 * model` is equal for the known subset (equality on the model, not on raw
 * text — cosmetic YAML diffs are accepted). Key inversion, optional-field
 * omission and section-order preservation are checked explicitly.
 */

import { describe, expect, it } from 'vitest';
import { parseRenderCvYaml, validateRenderCv } from '../../yaml/parse';
import { renderCvToYaml } from '../serialize';
import type { RenderCv } from '../../types/rendercv';

/** Raw fixture text inlined by Vite; no filesystem access, no node types. */
import fixtureRaw from '../../__fixtures__/example.yaml?raw';

function fixtureModel(): RenderCv {
  return validateRenderCv(parseRenderCvYaml(fixtureRaw));
}

describe('renderCvToYaml (serializer)', () => {
  it('roundtrips the fixture: parse → model → serialize → parse → model is equal', () => {
    const model = fixtureModel();
    const yaml = renderCvToYaml(model);
    const again = validateRenderCv(parseRenderCvYaml(yaml));

    expect(again).toEqual(model);
  });

  it('inverts camelCase keys to the snake_case YAML schema', () => {
    const yaml = renderCvToYaml(fixtureModel());

    expect(yaml).toMatch(/social_networks:/);
    expect(yaml).toMatch(/start_date:/);
    expect(yaml).not.toMatch(/socialNetworks/);
    expect(yaml).not.toMatch(/startDate/);
  });

  it('keeps "present" end dates and maps bold_keywords', () => {
    const model: RenderCv = {
      name: 'Ada',
      sections: {
        experience: [
          {
            company: 'Fictitious Labs',
            startDate: '2022-01',
            endDate: 'present',
            boldKeywords: ['React', 'TypeScript'],
          },
        ],
      },
    };

    const yaml = renderCvToYaml(model);
    expect(yaml).toMatch(/end_date: present/);
    expect(yaml).toMatch(/bold_keywords:/);

    const back = validateRenderCv(parseRenderCvYaml(yaml));
    expect(back).toEqual(model);
  });

  it('omits optional fields that are undefined instead of writing empty keys', () => {
    const model: RenderCv = { name: 'Ada', sections: { summary: ['Hi there.'] } };

    const yaml = renderCvToYaml(model);
    expect(yaml).not.toMatch(/headline:/);
    expect(yaml).not.toMatch(/phone:/);
    expect(yaml).not.toMatch(/social_networks:/);
    expect(yaml).toMatch(/summary:/);

    const back = validateRenderCv(parseRenderCvYaml(yaml));
    expect(back).toEqual(model);
  });

  it('preserves section order from the model insertion order', () => {
    const yaml = renderCvToYaml(fixtureModel());
    const markers = ['summary:', 'experience:', 'education:', 'skills:'];
    const indexes = markers.map((marker) => yaml.indexOf(marker));

    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
  });

  it('passes unknown sections through untouched', () => {
    const model = fixtureModel();
    (model.sections as Record<string, unknown>).projects = [{ name: 'Side Project' }];

    const yaml = renderCvToYaml(model);
    expect(yaml).toMatch(/projects:/);
    expect(yaml).toMatch(/Side Project/);

    const back = validateRenderCv(parseRenderCvYaml(yaml));
    expect(back.name).toBe('John Doe');
  });
});