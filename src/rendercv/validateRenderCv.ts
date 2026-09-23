/**
 * `validateRenderCv` — spec case 7: invalid-YAML validation.
 *
 * Validates a parsed document against the RenderCV 2.8 MVP rules and returns
 * the typed `RenderCv` model (internally `convertToModel` after the document
 * has passed validation). Design D5 canonical-message table:
 *
 * - `cv.name` missing / empty / not a string → "Missing required field: cv.name"
 * - any other type, shape or date-format violation → "Unable to generate PDF"
 *   with a precise `details` field path (`cv.sections.experience[0].start_date`)
 *
 * Unknown top-level fields and unknown sections never fail any stage (spec);
 * only the MVP subset is validated.
 */

import { missingNameError, validationError } from './errors';
import { convertToModel } from './model';
import type { RenderCv } from '../types/rendercv';

/** `YYYY-MM` with a real month; `end_date` additionally allows `present`. */
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}

function typeName(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'list';
  }
  return typeof value;
}

function badType(path: string, expected: string, value: unknown): never {
  throw validationError(`${path}: expected ${expected}, found ${typeName(value)} (path: ${path})`);
}

function isDate(value: string): boolean {
  return DATE_PATTERN.test(value);
}

function isEndDate(value: string): boolean {
  return value === 'present' || isDate(value);
}

function assertDate(path: string, value: unknown, allowPresent: boolean): void {
  if (typeof value !== 'string' || !(allowPresent ? isEndDate(value) : isDate(value))) {
    const expected = allowPresent ? 'YYYY-MM or "present"' : 'YYYY-MM';
    throw validationError(
      `${path}: invalid date "${String(value)}" (expected ${expected}) (path: ${path})`,
    );
  }
}

function assertOptionalString(record: RecordValue, key: string, path: string): void {
  if (record[key] !== undefined && typeof record[key] !== 'string') {
    badType(path, 'string', record[key]);
  }
}

function assertOptionalStringList(path: string, value: unknown): void {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    badType(path, 'list', value);
  }
  for (const [index, item] of value.entries()) {
    if (typeof item !== 'string') {
      badType(`${path}[${index}]`, 'string', item);
    }
  }
}

/** Header-level checks: `cv.name` then the remaining known scalar fields. */
function validateHeader(cv: RecordValue | null): void {
  if (cv === null || typeof cv.name !== 'string' || cv.name.trim().length === 0) {
    throw missingNameError('Field "cv.name" is required and must be a non-empty string.');
  }
  assertOptionalString(cv, 'headline', 'cv.headline');
  assertOptionalString(cv, 'location', 'cv.location');
  assertOptionalString(cv, 'email', 'cv.email');
  assertOptionalString(cv, 'phone', 'cv.phone');

  if (cv.social_networks !== undefined) {
    if (!Array.isArray(cv.social_networks)) {
      badType('cv.social_networks', 'list', cv.social_networks);
    }
    for (const [index, entry] of cv.social_networks.entries()) {
      const path = `cv.social_networks[${index}]`;
      const record = asRecord(entry);
      if (record === null) {
        badType(path, 'object', entry);
      } else {
        assertRequiredString(record, 'network', `${path}.network`);
        assertRequiredString(record, 'username', `${path}.username`);
      }
    }
  }
}

function assertRequiredString(record: RecordValue, key: string, path: string): void {
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    if (value === undefined || value === '') {
      throw validationError(
        `${path}: missing required field "${key}" (expected a non-empty string) (path: ${path})`,
      );
    }
    badType(path, 'string', value);
  }
}

/** Shared experience/education date + highlight checks. */
function validateDateFields(record: RecordValue, path: string): void {
  if (record.start_date !== undefined) {
    assertDate(`${path}.start_date`, record.start_date, false);
  }
  if (record.end_date !== undefined) {
    assertDate(`${path}.end_date`, record.end_date, true);
  }
  assertOptionalStringList(`${path}.highlights`, record.highlights);
}

function validateExperienceEntry(record: RecordValue, path: string): void {
  assertRequiredString(record, 'company', `${path}.company`);
  assertOptionalString(record, 'position', `${path}.position`);
  assertOptionalString(record, 'location', `${path}.location`);
  validateDateFields(record, path);
  assertOptionalStringList(`${path}.bold_keywords`, record.bold_keywords);
}

function validateEducationEntry(record: RecordValue, path: string): void {
  assertRequiredString(record, 'institution', `${path}.institution`);
  assertOptionalString(record, 'area', `${path}.area`);
  assertOptionalString(record, 'location', `${path}.location`);
  validateDateFields(record, path);
}

function validateSkillEntry(record: RecordValue, path: string): void {
  assertRequiredString(record, 'label', `${path}.label`);
  assertOptionalString(record, 'details', `${path}.details`);
}

function validateEntryList(value: unknown, path: string, validator: (entry: RecordValue, entryPath: string) => void): void {
  if (!Array.isArray(value)) {
    badType(path, 'list', value);
  }
  for (const [index, entry] of value.entries()) {
    const entryPath = `${path}[${index}]`;
    const record = asRecord(entry);
    if (record === null) {
      badType(entryPath, 'object', entry);
    } else {
      validator(record, entryPath);
    }
  }
}

function validateSection(name: string, payload: unknown): void {
  if (name === 'summary') {
    if (!Array.isArray(payload)) {
      badType('cv.sections.summary', 'list', payload);
    }
    for (const [index, paragraph] of payload.entries()) {
      if (typeof paragraph !== 'string') {
        badType(`cv.sections.summary[${index}]`, 'string', paragraph);
      }
    }
    return;
  }
  if (name === 'experience') {
    validateEntryList(payload, 'cv.sections.experience', validateExperienceEntry);
    return;
  }
  if (name === 'education') {
    validateEntryList(payload, 'cv.sections.education', validateEducationEntry);
    return;
  }
  if (name === 'skills') {
    validateEntryList(payload, 'cv.sections.skills', validateSkillEntry);
    return;
  }
  // Unknown sections are skipped — never validated, never fatal (spec).
}

/**
 * Validate a parsed document and return the typed model.
 *
 * @throws PipelineError "Missing required field: cv.name" when `cv.name` is
 *         absent or not a non-empty string.
 * @throws PipelineError "Unable to generate PDF" (with a field-path `details`)
 *         on any other type, shape or date-format violation.
 */
export function validateRenderCv(data: unknown): RenderCv {
  const document = asRecord(data);
  const cv = document === null ? null : asRecord(document.cv);

  validateHeader(cv);

  if (cv !== null && cv.sections !== undefined) {
    const sections = asRecord(cv.sections);
    if (sections === null) {
      badType('cv.sections', 'object (section map)', cv.sections);
    } else {
      for (const [name, payload] of Object.entries(sections)) {
        validateSection(name, payload);
      }
    }
  }

  return convertToModel(data);
}