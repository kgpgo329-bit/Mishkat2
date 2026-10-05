/**
 * Mishkat Phase 10: Verified Knowledge Assessment — Types & Constants
 *
 * Canonical enumerations, status codes, and configuration for the dynamic
 * assessment domain layer.
 */

export const ASSESSMENT_STATUS = Object.freeze({
  CREATED: 'CREATED',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  EMPTY: 'EMPTY'
});

export const QUESTION_TYPE = Object.freeze({
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  TRUE_FALSE: 'TRUE_FALSE'
});

export const ASSESSMENT_CONFIG = Object.freeze({
  MIN_JOURNEY_RECORDS: 20,
  DEFAULT_QUESTION_COUNT: 5,
  MIN_QUESTIONS: 3,
  MAX_QUESTIONS: 10
});

export function isValidQuestionType(type) {
  return Object.values(QUESTION_TYPE).includes(type);
}
