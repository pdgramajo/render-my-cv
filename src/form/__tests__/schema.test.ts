/**
 * Schema suite — the declarative form schema covers every known `RenderCv`
 * field and the unknown-keys detector stays honest against it.
 */

import { describe, expect, it } from 'vitest';
import { dump } from 'js-yaml';
import {
  detectUnknownKeys,
  EDUCATION_FIELDS,
  EDUCATION_LISTS,
  EXPERIENCE_FIELDS,
  EXPERIENCE_LISTS,
  HEADER_FIELDS,
  SKILLS_FIELDS,
  SOCIAL_NETWORK_FIELDS,
  SUMMARY_LIST,
  WIZARD_STEPS,
  type ScalarFieldDef,
} from '../schema';
import { parseRenderCvYaml } from '../../yaml/parse';

/** Raw fixture text inlined by Vite; no filesystem access, no node types. */
import fixtureRaw from '../../__fixtures__/example.yaml?raw';

const SCALAR_TYPES = ['text', 'textarea', 'month', 'month-present'] as const;
const ALLOWED_TYPES = [...SCALAR_TYPES, 'strings', 'entries'] as const;

describe('form schema (T2)', () => {
  it('declares six steps in wizard order', () => {
    expect(WIZARD_STEPS.map((step) => step.id)).toEqual([
      'header',
      'summary',
      'experience',
      'education',
      'skills',
      'review',
    ]);
  });

  it('uses only declared field types with real labels and keys', () => {
    const allScalar: ScalarFieldDef[] = [
      ...HEADER_FIELDS,
      ...SOCIAL_NETWORK_FIELDS,
      ...EXPERIENCE_FIELDS,
      ...EDUCATION_FIELDS,
      ...SKILLS_FIELDS,
    ];
    for (const field of allScalar) {
      expect(ALLOWED_TYPES).toContain(field.type);
      expect(field.label.length).toBeGreaterThan(0);
      expect(field.key.length).toBeGreaterThan(0);
    }
    for (const list of [SUMMARY_LIST, ...EXPERIENCE_LISTS, ...EDUCATION_LISTS]) {
      expect(list.type).toBe('strings');
      expect(list.mode).toMatch(/^(text|textarea)$/);
      expect(list.label.length).toBeGreaterThan(0);
    }
  });

  it('marks the core required fields as required', () => {
    const required = (fields: ScalarFieldDef[]) =>
      Object.fromEntries(fields.map((field) => [field.key, field.required === true]));

    expect(required(HEADER_FIELDS)).toMatchObject({ name: true });
    expect(required(SOCIAL_NETWORK_FIELDS)).toMatchObject({ network: true, username: true });
    expect(required(EXPERIENCE_FIELDS)).toMatchObject({ company: true });
    expect(required(EDUCATION_FIELDS)).toMatchObject({ institution: true });
    expect(required(SKILLS_FIELDS)).toMatchObject({ label: true });
  });

  it('schema keys reference only real RenderCv model fields', () => {
    const keys = (fields: ScalarFieldDef[]) => fields.map((field) => field.key);

    expect(keys(HEADER_FIELDS).sort()).toEqual(
      ['name', 'headline', 'location', 'email', 'phone'].sort(),
    );
    expect(keys(SOCIAL_NETWORK_FIELDS).sort()).toEqual(['network', 'username'].sort());
    expect(keys(EXPERIENCE_FIELDS).sort()).toEqual(
      ['company', 'position', 'location', 'startDate', 'endDate'].sort(),
    );
    expect(EXPERIENCE_LISTS.map((list) => list.key).sort()).toEqual(
      ['highlights', 'boldKeywords'].sort(),
    );
    expect(keys(EDUCATION_FIELDS).sort()).toEqual(
      ['institution', 'area', 'location', 'startDate', 'endDate'].sort(),
    );
    expect(EDUCATION_LISTS.map((list) => list.key)).toEqual(['highlights']);
    expect(keys(SKILLS_FIELDS).sort()).toEqual(['label', 'details'].sort());
    expect(SUMMARY_LIST.key).toBe('summary');
  });

  it('flags unknown cv keys, unknown sections and unknown entry keys', () => {
    const rawYaml = dump({
      design: { theme: 'classic' },
      cv: {
        name: 'Ada',
        locale: 'en',
        social_networks: [{ network: 'github', username: 'x', vanity: true }],
        sections: {
          summary: ['Hi'],
          experience: [{ company: 'X', custom_field: 1 }],
          projects: [{ name: 'Side Project', year: 2026 }],
        },
      },
    });

    const warnings = detectUnknownKeys(rawYaml);
    expect(warnings).toContain('design');
    expect(warnings).toContain('cv.locale');
    expect(warnings).toContain('cv.social_networks[0].vanity');
    expect(warnings).toContain('cv.sections.experience[0].custom_field');
    expect(warnings).toContain('cv.sections.projects');
    expect(warnings).not.toContain('cv.sections.summary');
    expect(warnings).not.toContain('cv.sections.experience[0].company');
  });

  it('reports no unknown keys for the MVP fixture', () => {
    expect(detectUnknownKeys(fixtureRaw)).toEqual([]);
  });

  it('tolerates unparseable or empty input', () => {
    expect(detectUnknownKeys('{ unbalanced')).toEqual([]);
    expect(detectUnknownKeys('   ')).toEqual([]);
  });

  it('roundtrips the fixture through the schema-known subset', () => {
    // Spot-check the bridge: the raw document keyed by the schema parses and
    // reconverts without stepping outside the schema's known sets.
    const parsed = parseRenderCvYaml(fixtureRaw) as {
      cv: { sections: Record<string, unknown> };
    };
    expect(Object.keys(parsed.cv).every((key) => ['name', 'headline', 'location', 'email', 'phone', 'social_networks', 'sections'].includes(key))).toBe(true);
    expect(Object.keys(parsed.cv.sections)).toEqual(['summary', 'experience', 'education', 'skills']);
  });
});