/**
 * Word content validation for the [ REDACTED ] application.
 *
 * Inputs: A word string to validate
 * Outputs: A validation result (valid boolean + optional error message)
 * Side Effects: None
 */

import { VALIDATION } from "./types";

/** Validation result value object — avoids primitive obsession. */
export interface ValidationResult {
  readonly valid: boolean;
  readonly error?: string;
}

/**
 * Character allowlist regex from the Architecture Spec appendix.
 * Allows: a-z A-Z and the specific punctuation set chosen by the site owner.
 * Explicitly disallows: 0-9, @, #, ^, (, ), [, ], {, }, and all others.
 */
const WORD_PATTERN = /^[a-zA-Z`~!$%&*_\-+=:;"'<,>.?/|\\]{1,20}$/;

/**
 * Validates a word submission against the character allowlist and length rules.
 *
 * @param word - The submitted word string
 * @returns ValidationResult indicating pass/fail and reason
 */
export function validateWord(word: string): ValidationResult {
  if (!word || word.length < VALIDATION.MIN_WORD_LENGTH) {
    return { valid: false, error: "Word must be at least 1 character." };
  }

  if (word.length > VALIDATION.MAX_WORD_LENGTH) {
    return {
      valid: false,
      error: `Word must be ${VALIDATION.MAX_WORD_LENGTH} characters or fewer.`,
    };
  }

  if (!WORD_PATTERN.test(word)) {
    return {
      valid: false,
      error:
        "Word contains disallowed characters. Numbers and certain symbols are not permitted.",
    };
  }

  return { valid: true };
}
