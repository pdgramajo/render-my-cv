/**
 * Templates suite — spec acceptance cases 3 (model → Typst generation),
 * 4 (date handling), 5 (list handling), 6 (optional-field handling), plus the
 * markdown→typst converter tables (task 3.9).
 */

import { describe, expect, it } from 'vitest';
import { parseRenderCvYaml, validateRenderCv } from '../../yaml/parse';
import { renderMarkdown } from '../markdown';
import { renderCvToTypst } from '../renderCvToTypst';
import type {
  EducationEntry,
  ExperienceEntry,
  RenderCv,
  SkillEntry,
} from '../../types/rendercv';

/** Raw fixture text inlined by Vite; no filesystem access, no node types. */
import fixtureRaw from '../../__fixtures__/johndoe-fake.yaml?raw';

/** Model helper for the render cases 4–6. */
function model(overrides: Partial<RenderCv> = {}): RenderCv {
  return { name: 'Ada Lovelace', sections: {}, ...overrides };
}

function withExperience(entries: ExperienceEntry[]): RenderCv {
  return model({ sections: { experience: entries } });
}

function withEducation(entries: EducationEntry[]): RenderCv {
  return model({ sections: { education: entries } });
}

function withSkills(entries: SkillEntry[]): RenderCv {
  return model({ sections: { skills: entries } });
}

describe('renderMarkdown (task 3.9)', () => {
  it('converts bold `**text**` to Typst `*text*`', () => {
    expect(renderMarkdown('**bold**')).toBe('*bold*');
    expect(renderMarkdown('**bold** and **more**')).toBe('*bold* and *more*');
    expect(renderMarkdown('Leading **bold** text')).toBe('Leading *bold* text');
  });

  it('converts inline links to #link(...)[...]', () => {
    expect(renderMarkdown('[label](https://example.com)')).toBe(
      '#link(https://example.com)[label]',
    );
    expect(renderMarkdown('[**bold label**](https://x.dev)')).toBe(
      '#link(https://x.dev)[*bold label*]',
    );
  });

  it('leaves unordered list lines unchanged (same syntax in Typst)', () => {
    expect(renderMarkdown('- item')).toBe('- item');
    expect(renderMarkdown('- first\n- second')).toBe('- first\n- second');
  });

  it('escapes raw `#` and `$`', () => {
    expect(renderMarkdown('C#')).toBe('C\\#');
    expect(renderMarkdown('$5')).toBe('\\$5');
    expect(renderMarkdown('C# and $5')).toBe('C\\# and \\$5');
  });

  it('passes single-star and underscore emphasis through (valid Typst already)', () => {
    expect(renderMarkdown('*React* and _TypeScript_')).toBe('*React* and _TypeScript_');
  });

  it('applies bold_keywords with full-word matching only', () => {
    expect(renderMarkdown('React and ReactJS', ['React'])).toBe('*React* and ReactJS');
    expect(renderMarkdown('React, TypeScript, Node.js', ['React', 'TypeScript'])).toBe(
      '*React*, *TypeScript*, Node.js',
    );
  });

  it('escapes regex metacharacters inside bold_keywords', () => {
    expect(renderMarkdown('Node.js and Nodejs', ['Node.js'])).toBe('*Node.js* and Nodejs');
  });

  it('ignores undefined or empty bold_keywords', () => {
    expect(renderMarkdown('Plain text', undefined)).toBe('Plain text');
    expect(renderMarkdown('Plain text', [])).toBe('Plain text');
  });
});

describe('renderCvToTypst — case 3: fixture renders to expected Typst', () => {
  function fixtureModel(): RenderCv {
    return validateRenderCv(parseRenderCvYaml(fixtureRaw));
  }

  it('emits the preamble with MVP rendercv params', () => {
    const output = renderCvToTypst(fixtureModel());

    expect(output.startsWith('#import "rendercv/lib.typ": *')).toBe(true);
    expect(output).toContain('#show: rendercv.with(');
    expect(output).toContain('name: "John Doe"');
    expect(output).toContain('title: "John Doe\'s CV"');
    expect(output).toContain('page-size: "a4"');
    expect(output).toContain('header-connections-show-icons: true');
  });

  it('renders the header: name, headline, and social connections', () => {
    const output = renderCvToTypst(fixtureModel());

    expect(output).toContain('= John Doe');
    expect(output).toContain('#headline([Software Engineer])');
    expect(output).toContain('#connections(');
    expect(output).toContain(
      '#connection-with-icon("github", [#link("https://github.com/pdgramajo")[#underline[github.com/pdgramajo]]])',
    );
    expect(output).toContain(
      '#connection-with-icon("linkedin", [#link("https://linkedin.com/in/johndoe-fake")[#underline[linkedin.com/in/johndoe-fake]]])',
    );
  });

  it('renders all four MVP sections in source order', () => {
    const output = renderCvToTypst(fixtureModel());

    const summary = output.indexOf('== Summary');
    const experience = output.indexOf('== Experience');
    const education = output.indexOf('== Education');
    const skills = output.indexOf('== Skills');

    expect(summary).toBeGreaterThan(-1);
    expect(experience).toBeGreaterThan(summary);
    expect(education).toBeGreaterThan(experience);
    expect(skills).toBeGreaterThan(education);
  });

  it('renders experience entries with the entry shape contract', () => {
    const output = renderCvToTypst(fixtureModel());

    expect(output).toContain('#regular-entry(');
    expect(output).toContain('*Independent*');
    expect(output).toContain('_Software Engineer_');
    expect(output).toContain('- Building SaaS products, prototypes, and internal platforms using *React*, *TypeScript*, and *Node.js*.');
    expect(output).toContain('2025-12 to present');
    expect(output).toContain('Remote');
    expect(output).toContain('2019-08 to 2025-11');
  });

  it('renders education and skills sections', () => {
    const output = renderCvToTypst(fixtureModel());

    expect(output).toContain('#education-entry(');
    expect(output).toContain('*Fictional State University*');
    expect(output).toContain('_Systems Engineering_');
    expect(output).toContain('2008-03 to 2014-12');
    expect(output).toContain('#content-area[');
    expect(output).toContain('- *React*: Hooks, server components, state management');
    expect(output).toContain('- *Node.js*');
  });

  it('skips unknown sections entirely', () => {
    const output = renderCvToTypst(
      model({
        name: 'Ada Lovelace',
        sections: {
          summary: ['A summary.'],
          projects: [{ name: 'Side Project', description: 'not rendered' }],
        } as RenderCv['sections'],
      }),
    );

    expect(output).toContain('== Summary');
    expect(output).not.toContain('== Projects');
    expect(output).not.toContain('Side Project');
  });
});

describe('renderCvToTypst — case 4: date handling', () => {
  it('renders a start/end pair literally in YYYY-MM form with literal present', () => {
    const output = renderCvToTypst(
      withExperience([{ company: 'X', startDate: '2019-08', endDate: 'present' }]),
    );
    expect(output).toContain('2019-08 to present');
  });

  it('renders a complete YYYY-MM range', () => {
    const output = renderCvToTypst(
      withExperience([{ company: 'X', startDate: '2008-03', endDate: '2014-12' }]),
    );
    expect(output).toContain('2008-03 to 2014-12');
  });

  it('renders a start-only date without inventing an end date', () => {
    const output = renderCvToTypst(withExperience([{ company: 'X', startDate: '2019-08' }]));
    expect(output).toContain('2019-08');
    expect(output).not.toContain(' to ');
  });

  it('renders an end-only date without inventing a start date', () => {
    const output = renderCvToTypst(withExperience([{ company: 'X', endDate: '2025-11' }]));
    expect(output).toContain('2025-11');
    expect(output).not.toContain(' to ');
  });

  it('renders entries with no dates without error', () => {
    const output = renderCvToTypst(withExperience([{ company: 'X', location: 'Remote' }]));
    expect(output).toContain('*X*');
    expect(output).toContain('Remote');
  });

  it('renders the second column as dates then location', () => {
    const output = renderCvToTypst(
      withExperience([{ company: 'X', startDate: '2020-01', endDate: 'present', location: 'Argentina' }]),
    );
    const dateIndex = output.indexOf('2020-01 to present');
    const locationIndex = output.indexOf('Argentina');
    expect(dateIndex).toBeGreaterThan(-1);
    expect(locationIndex).toBeGreaterThan(dateIndex);
  });
});

describe('renderCvToTypst — case 5: list handling', () => {
  it('renders highlights in source order', () => {
    const output = renderCvToTypst(
      withExperience([{ company: 'X', highlights: ['First bullet', 'Second bullet'] }]),
    );

    const first = output.indexOf('- First bullet');
    const second = output.indexOf('- Second bullet');
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
  });

  it('renders skills in source order', () => {
    const output = renderCvToTypst(
      withSkills([
        { label: 'Alpha' },
        { label: 'Beta' },
        { label: 'Gamma' },
      ]),
    );

    const alpha = output.indexOf('- *Alpha*');
    const beta = output.indexOf('- *Beta*');
    const gamma = output.indexOf('- *Gamma*');
    expect(alpha).toBeGreaterThan(-1);
    expect(beta).toBeGreaterThan(alpha);
    expect(gamma).toBeGreaterThan(beta);
  });

  it('produces no bullet block for an empty highlights list and no invalid Typst', () => {
    const output = renderCvToTypst(
      withExperience([{ company: 'X', position: 'Dev', highlights: [] }]),
    );

    expect(output).toContain('*X*');
    expect(output).toContain('_Dev_');
    expect(output).not.toMatch(/^\s*- /m);
  });

  it('renders no heading at all for an empty section list', () => {
    const output = renderCvToTypst(withExperience([]));
    expect(output).not.toContain('== Experience');
    expect(output).toContain('= Ada Lovelace');
  });

  it('renders no heading for empty summary/skills lists', () => {
    const output = renderCvToTypst(model({ sections: { summary: [], skills: [] } }));
    expect(output).not.toContain('== Summary');
    expect(output).not.toContain('== Skills');
  });
});

describe('renderCvToTypst — case 6: absent optional fields render clean', () => {
  it('renders a model without headline/phone/social_networks/location', () => {
    const output = renderCvToTypst(
      model({
        name: 'Ada Lovelace',
        sections: {
          summary: ['Mathematician and writer.'],
          experience: [{ company: 'Analytical Engine', position: 'Designer' }],
        },
      }),
    );

    expect(output).not.toContain('#headline(');
    expect(output).not.toContain('#connections(');
    expect(output).not.toContain('phone');
    expect(output).toContain('== Summary');
    expect(output).toContain('#summary[');
    expect(output).toContain('*Analytical Engine*');
  });

  it('renders a model with only unknown-network social entries (no connections block)', () => {
    const output = renderCvToTypst(
      model({
        name: 'Ada Lovelace',
        socialNetworks: [{ network: 'flickr', username: 'ada' }],
        sections: {},
      }),
    );

    expect(output).not.toContain('#connections(');
    expect(output).toContain('= Ada Lovelace');
  });

  it('renders a bare model (preamble + name heading only) without error', () => {
    const output = renderCvToTypst(model({ name: 'Ada Lovelace' }));

    expect(output).toContain('#import "rendercv/lib.typ": *');
    expect(output).toContain('= Ada Lovelace');
    expect(output).not.toContain('== ');
  });

  it('renders an education entry without optional area/highlights', () => {
    const output = renderCvToTypst(
      withEducation([{ institution: 'University', startDate: '2008-03', endDate: '2012-06' }]),
    );

    expect(output).toContain('#education-entry(');
    expect(output).toContain('*University*');
    expect(output).toContain('2008-03 to 2012-06');
    expect(output).not.toMatch(/^\s*- /m);
  });
});