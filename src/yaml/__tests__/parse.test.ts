/**
 * Parse suite — spec acceptance case 1 (YAML parsing).
 *
 * Covers: valid fixture parses; fixture YAML → typed RenderCv model
 * (fields, sections, order); malformed YAML fails with "Invalid YAML
 * structure" + details; missing `cv.name` fails with the canonical message;
 * missing optional fields and empty lists are tolerated.
 */

import { describe, expect, it } from 'vitest';
import { parseRenderCvYaml, validateRenderCv } from '../parse';
import { PipelineError } from '../../types/pipeline';
import type { ExperienceEntry, RenderCv, SectionEntry, SkillEntry } from '../../types/rendercv';

/** Raw fixture text inlined by Vite; no filesystem access, no node types. */
import fixtureRaw from '../../__fixtures__/example.yaml?raw';

function readFixture(): string {
  return fixtureRaw;
}

describe('parseRenderCvYaml', () => {
  it('parses the fixture into a structured object', () => {
    const parsed = parseRenderCvYaml(readFixture());

    expect(parsed).toBeTypeOf('object');
    expect(parsed).not.toBeNull();

    const cv = (parsed as { cv: Record<string, unknown> }).cv;
    expect(cv.name).toBe('John Doe');
    expect(cv.headline).toBe('Software Engineer');
    expect(cv.location).toBe('Remote');
    expect(cv.email).toBe('johndoe@example.com');
    expect(cv.phone).toBe('+1 555 010 0000');
  });

  it('fails with "Invalid YAML structure" for malformed YAML and carries details', () => {
    const malformed = [
      'cv:\n  name: John Doe\n    headline: bad indentation',
      '- a\n- b\n : c: [unclosed',
    ];

    for (const raw of malformed) {
      expect(() => parseRenderCvYaml(raw)).toThrowError(PipelineError);
      try {
        parseRenderCvYaml(raw);
      } catch (error) {
        const pipelineError = error as PipelineError;
        expect(pipelineError.stage).toBe('parse');
        expect(pipelineError.message).toBe('Invalid YAML structure');
        expect(pipelineError.details).toBeTruthy();
        expect(pipelineError.details).not.toContain(' at ');
      }
    }
  });

  it('fails with "Unable to read YAML file" for empty and whitespace-only input', () => {
    for (const raw of ['', '   \n\t \n  ']) {
      expect(() => parseRenderCvYaml(raw)).toThrowError(PipelineError);
      try {
        parseRenderCvYaml(raw);
      } catch (error) {
        const pipelineError = error as PipelineError;
        expect(pipelineError.stage).toBe('read');
        expect(pipelineError.message).toBe('Unable to read YAML file');
      }
    }
  });
});

describe('validateRenderCv', () => {
  it('maps the fixture document onto the RenderCv model', () => {
    const model: RenderCv = validateRenderCv(parseRenderCvYaml(readFixture()));

    expect(model.name).toBe('John Doe');
    expect(model.headline).toBe('Software Engineer');
    expect(model.location).toBe('Remote');
    expect(model.email).toBe('johndoe@example.com');
    expect(model.phone).toBe('+1 555 010 0000');

    expect(model.socialNetworks).toEqual([
      { network: 'github', username: 'johndoe-fake' },
      { network: 'linkedin', username: 'johndoe-fake' },
    ]);

    expect(Object.keys(model.sections)).toEqual(['summary', 'experience', 'education', 'skills']);

    const experienceEntry = model.sections.experience as SectionEntry;
    expect(experienceEntry.name).toBe('experience');
    expect(experienceEntry.type).toBe('experience');
    expect(experienceEntry.payload).toHaveLength(2);
    const experiencePayload = experienceEntry.payload as ExperienceEntry[];
    expect(experiencePayload[0].company).toBe('Fictitious Labs');
    expect(experiencePayload[1].company).toBe('Example Corp');

    const skillsEntry = model.sections.skills as SectionEntry;
    expect(skillsEntry.name).toBe('skills');
    expect(skillsEntry.type).toBe('skills');
    expect(skillsEntry.payload).toHaveLength(5);
    expect((skillsEntry.payload as SkillEntry[])[0].label).toBe('React');
  });

  it('preserves section order from the source YAML', () => {
    const model = validateRenderCv(parseRenderCvYaml(readFixture()));
    expect(Object.keys(model.sections)).toEqual(['summary', 'experience', 'education', 'skills']);
  });

  it('fails with "Missing required field: cv.name" when cv.name is absent or empty', () => {
    const cases = [
      { cv: { headline: 'No name here' } },
      { cv: { name: '' } },
      { cv: { name: '   ' } },
      {},
    ];

    for (const document of cases) {
      expect(() => validateRenderCv(document)).toThrowError(PipelineError);
      try {
        validateRenderCv(document);
      } catch (error) {
        const pipelineError = error as PipelineError;
        expect(pipelineError.stage).toBe('validate');
        expect(pipelineError.message).toBe('Missing required field: cv.name');
        expect(pipelineError.details).toContain('cv.name');
      }
    }
  });

  it('tolerates missing optional fields', () => {
    const minimal = {
      cv: {
        name: 'Ada Lovelace',
        sections: {
          summary: ['Mathematician and writer.'],
        },
      },
    };

    const model = validateRenderCv(minimal);

    expect(model.name).toBe('Ada Lovelace');
    expect(model.headline).toBeUndefined();
    expect(model.location).toBeUndefined();
    expect(model.email).toBeUndefined();
    expect(model.phone).toBeUndefined();
    expect(model.socialNetworks).toBeUndefined();
    expect(Object.keys(model.sections)).toEqual(['summary']);
    const summaryEntry = model.sections.summary as SectionEntry;
    expect(summaryEntry.name).toBe('summary');
    expect(summaryEntry.type).toBe('summary');
    expect(summaryEntry.payload).toEqual(['Mathematician and writer.']);
  });

  it('tolerates empty lists in sections', () => {
    const withEmptyLists = {
      cv: {
        name: 'Ada Lovelace',
        sections: {
          summary: [],
          experience: [],
          education: [],
          skills: [],
        },
      },
    };

    const model = validateRenderCv(withEmptyLists);

    expect(model.name).toBe('Ada Lovelace');
    const summaryEntry = model.sections.summary as SectionEntry;
    expect(summaryEntry.name).toBe('summary');
    expect(summaryEntry.type).toBe('summary');
    expect(summaryEntry.payload).toEqual([]);

    const experienceEntry = model.sections.experience as SectionEntry;
    expect(experienceEntry.name).toBe('experience');
    expect(experienceEntry.type).toBe('experience');
    expect(experienceEntry.payload).toEqual([]);

    const educationEntry = model.sections.education as SectionEntry;
    expect(educationEntry.name).toBe('education');
    expect(educationEntry.type).toBe('education');
    expect(educationEntry.payload).toEqual([]);

    const skillsEntry = model.sections.skills as SectionEntry;
    expect(skillsEntry.name).toBe('skills');
    expect(skillsEntry.type).toBe('skills');
    expect(skillsEntry.payload).toEqual([]);
  });
});