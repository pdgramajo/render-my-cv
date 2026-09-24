/**
 * Model suite — spec acceptance cases 2 (YAML → model conversion) and 7
 * (invalid-YAML validation), plus the canonical-message factory contract.
 *
 * Case 2: fixture maps every MVP field; section/entry order preserved;
 * unknown sections and unknown top-level fields tolerated.
 * Case 7: missing `cv.name` → canonical message; `cv.email` as a list →
 * structured error + details; bad dates → error; valid model passes.
 */

import { describe, expect, it } from 'vitest';
import { parseRenderCvYaml } from '../../yaml/parse';
import { convertToModel } from '../model';
import { validateRenderCv } from '../validateRenderCv';
import {
  compileError,
  missingNameError,
  parseError,
  readError,
  renderError,
  validationError,
} from '../errors';
import { PipelineError } from '../../types/pipeline';
import type { RenderCv } from '../../types/rendercv';

/** Raw fixture text inlined by Vite; no filesystem access, no node types. */
import fixtureRaw from '../../__fixtures__/example.yaml?raw';

function parsedFixture(): unknown {
  return parseRenderCvYaml(fixtureRaw);
}

function parsedCv(parsed: unknown): Record<string, unknown> {
  return (parsed as { cv: Record<string, unknown> }).cv;
}

describe('convertToModel (case 2)', () => {
  it('maps every MVP field of the fixture onto the model', () => {
    const model = convertToModel(parsedFixture());

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
  });

  it('preserves section and entry order from the source YAML', () => {
    const model = convertToModel(parsedFixture());

    const experience = model.sections.experience as unknown as Array<{ company: string }>;
    expect(experience.map((entry) => entry.company)).toEqual(['Fictitious Labs', 'Example Corp']);

    const skills = model.sections.skills as unknown as Array<{ label: string }>;
    expect(skills.map((entry) => entry.label)).toEqual([
      'React',
      'TypeScript',
      'Node.js',
      'Python',
      'PostgreSQL',
    ]);
  });

  it('maps experience/education/skills entry fields', () => {
    const model = convertToModel(parsedFixture());

    const first = model.sections.experience as unknown as Array<Record<string, unknown>>;
    expect(first[0]).toMatchObject({
      company: 'Fictitious Labs',
      position: 'Senior Software Engineer',
      location: 'Remote',
      startDate: '2022-01',
      endDate: 'present',
    });
    expect(first[0].highlights).toHaveLength(2);
    expect(first[0].boldKeywords).toBeUndefined();

    const education = model.sections.education as unknown as Array<Record<string, unknown>>;
    expect(education[0]).toMatchObject({
      institution: 'Fictional State University',
      area: 'Computer Science',
      startDate: '2014-03',
      endDate: '2018-05',
    });

    const skills = model.sections.skills as unknown as Array<Record<string, unknown>>;
    expect(skills[2]).toEqual({ label: 'Node.js' });
  });

  it('tolerates unknown sections without failing and keeps their order', () => {
    const parsed = parsedFixture() as {
      cv: { sections: Record<string, unknown> };
    };
    parsed.cv.sections.projects = [{ name: 'Side Project' }];

    const model = convertToModel(parsed);

    expect(Object.keys(model.sections)).toEqual([
      'summary',
      'experience',
      'education',
      'skills',
      'projects',
    ]);
  });

  it('drops unknown top-level fields silently', () => {
    const parsed = parsedFixture();
    parsedCv(parsed).design = { theme: 'classic' };
    parsedCv(parsed).locale = 'en';

    const model = convertToModel(parsed);

    expect(model.name).toBe('John Doe');
    expect('design' in model).toBe(false);
    expect('locale' in model).toBe(false);
  });

  it('does not enforce cv.name at convert time (validation owns that check)', () => {
    const model = convertToModel({ cv: { sections: { summary: [] } } });
    expect(model.name).toBe('');
    expect(Object.keys(model.sections)).toEqual(['summary']);
  });
});

describe('validateRenderCv (case 7)', () => {
  it('passes a valid MVP document and returns the typed model', () => {
    const model: RenderCv = validateRenderCv(parsedFixture());

    expect(model.name).toBe('John Doe');
    expect(model.socialNetworks).toHaveLength(2);
    expect(Object.keys(model.sections)).toEqual(['summary', 'experience', 'education', 'skills']);
  });

  it('fails with "Missing required field: cv.name" when cv.name is absent, empty or not a string', () => {
    const cases = [
      {},
      { cv: { headline: 'No name here' } },
      { cv: { name: '' } },
      { cv: { name: '   ' } },
      { cv: { name: 123 } },
      { cv: null },
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

  it('fails with "Unable to generate PDF" + details when an MVP field has the wrong type', () => {
    const cases = [
      {
        document: { cv: { name: 'Ada', email: ['a@b.com'] } },
        detailFragment: 'cv.email',
      },
      {
        document: { cv: { name: 'Ada', headline: 42 } },
        detailFragment: 'cv.headline',
      },
      {
        document: { cv: { name: 'Ada', social_networks: 'github' } },
        detailFragment: 'cv.social_networks',
      },
      {
        document: {
          cv: {
            name: 'Ada',
            sections: { summary: 'not a list' },
          },
        },
        detailFragment: 'cv.sections.summary',
      },
    ];

    for (const { document, detailFragment } of cases) {
      expect(() => validateRenderCv(document)).toThrowError(PipelineError);
      try {
        validateRenderCv(document);
      } catch (error) {
        const pipelineError = error as PipelineError;
        expect(pipelineError.stage).toBe('validate');
        expect(pipelineError.message).toBe('Unable to generate PDF');
        expect(pipelineError.details).toContain(detailFragment);
      }
    }
  });

  it('reports the email type violation with a precise details path', () => {
    try {
      validateRenderCv({ cv: { name: 'Ada', email: ['a@b.com'] } });
      expect.unreachable('should have thrown');
    } catch (error) {
      const pipelineError = error as PipelineError;
      expect(pipelineError.details).toBe(
        'cv.email: expected string, found list (path: cv.email)',
      );
    }
  });

  it('fails on invalid dates (2025-13, yesterday, non-date end) with the field path', () => {
    const cases = [
      {
        document: {
          cv: {
            name: 'Ada',
            sections: {
              experience: [{ company: 'X', start_date: '2025-13', end_date: 'present' }],
            },
          },
        },
        fragment: 'start_date',
      },
      {
        document: {
          cv: {
            name: 'Ada',
            sections: {
              experience: [{ company: 'X', start_date: 'yesterday' }],
            },
          },
        },
        fragment: 'start_date',
      },
      {
        document: {
          cv: {
            name: 'Ada',
            sections: {
              experience: [{ company: 'X', end_date: 'next year' }],
            },
          },
        },
        fragment: 'end_date',
      },
      {
        document: {
          cv: {
            name: 'Ada',
            sections: {
              education: [{ institution: 'U', start_date: '2008-13' }],
            },
          },
        },
        fragment: 'education',
      },
    ];

    for (const { document, fragment } of cases) {
      expect(() => validateRenderCv(document)).toThrowError(PipelineError);
      try {
        validateRenderCv(document);
      } catch (error) {
        const pipelineError = error as PipelineError;
        expect(pipelineError.stage).toBe('validate');
        expect(pipelineError.message).toBe('Unable to generate PDF');
        expect(pipelineError.details).toContain(fragment);
      }
    }
  });

  it('accepts `present` as an end date and valid YYYY-MM months', () => {
    const document = {
      cv: {
        name: 'Ada',
        sections: {
          experience: [
            {
              company: 'X',
              start_date: '2019-08',
              end_date: 'present',
              highlights: ['Work'],
            },
            { company: 'Y', start_date: '2020-01', end_date: '2021-12' },
          ],
        },
      },
    };

    expect(() => validateRenderCv(document)).not.toThrow();
  });

  it('fails when an entry misses a required field (company, institution, label)', () => {
    const documents = [
      {
        document: { cv: { name: 'Ada', sections: { experience: [{ position: 'Dev' }] } } },
        fragment: 'company',
      },
      {
        document: { cv: { name: 'Ada', sections: { education: [{ start_date: '2008-03' }] } } },
        fragment: 'institution',
      },
      {
        document: { cv: { name: 'Ada', sections: { skills: [{ details: 'x' }] } } },
        fragment: 'label',
      },
      {
        document: { cv: { name: 'Ada', sections: { experience: ['not an object'] } } },
        fragment: 'experience[0]',
      },
    ];

    for (const { document, fragment } of documents) {
      expect(() => validateRenderCv(document)).toThrowError(PipelineError);
      try {
        validateRenderCv(document);
      } catch (error) {
        const pipelineError = error as PipelineError;
        expect(pipelineError.message).toBe('Unable to generate PDF');
        expect(pipelineError.details).toContain(fragment);
      }
    }
  });

  it('tolerates empty section lists and missing optional fields', () => {
    const document = {
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

    const model = validateRenderCv(document);

    expect(model.name).toBe('Ada Lovelace');
    expect(model.sections.summary).toEqual([]);
    expect(model.sections.experience).toEqual([]);
    expect(model.sections.education).toEqual([]);
    expect(model.sections.skills).toEqual([]);
    expect(model.headline).toBeUndefined();
    expect(model.phone).toBeUndefined();
  });

  it('never fails on unknown sections (e.g. projects)', () => {
    const parsed = parsedFixture() as {
      cv: { sections: Record<string, unknown>; design?: unknown };
    };
    parsed.cv.sections.projects = [{ name: 'Side Project', year: 2026 }];
    parsed.cv.design = { theme: 'classic' };

    const model = validateRenderCv(parsed);

    expect(model.name).toBe('John Doe');
  });
});

describe('canonical-message factories', () => {
  it('maps every stage factory to exactly one canonical message and stage', () => {
    const factories = [
      { factory: readError, stage: 'read', message: 'Unable to read YAML file' },
      { factory: parseError, stage: 'parse', message: 'Invalid YAML structure' },
      { factory: missingNameError, stage: 'validate', message: 'Missing required field: cv.name' },
      { factory: validationError, stage: 'validate', message: 'Unable to generate PDF' },
      { factory: renderError, stage: 'render', message: 'Unable to generate PDF' },
      { factory: compileError, stage: 'compile', message: 'Typst compilation failed' },
    ] as const;

    for (const { factory, stage, message } of factories) {
      const error = factory('technical detail');
      expect(error).toBeInstanceOf(PipelineError);
      expect(error.stage).toBe(stage);
      expect(error.message).toBe(message);
      expect(error.details).toBe('technical detail');
    }
  });

  it('carries optional details, never raw stack traces', () => {
    const samples = [
      readError('File is empty or could not be read as UTF-8 text.'),
      parseError('bad indentation of a mapping entry'),
      validationError('cv.email: expected string, found list (path: cv.email)'),
      renderError('Section "experience" entry 2 failed to render.'),
      compileError('Typst error at main.typ:12:3'),
    ];

    for (const error of samples) {
      expect(error).toBeInstanceOf(PipelineError);
      expect(error.details).toBeTruthy();
      expect(error.message).not.toMatch(/\n\s+at /);
      expect(error.details).not.toMatch(/\n\s+at /);
    }

    expect(missingNameError().details).toBeUndefined();
  });
});