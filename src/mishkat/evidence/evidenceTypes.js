/**
 * Mishkat Evidence Types & Constants — Phase 5 Semantic Evidence Verification
 * 
 * Strict compliance with Sections 3, 4, 11, & 13:
 * - Canonical Evidence Relations: DIRECT, SUPPORTING, CONTEXTUAL, INCIDENTAL, UNRELATED
 * - Verification Status: VERIFIED, VERIFICATION_ERROR
 * - Verification Modes: AI_VERIFICATION, DETERMINISTIC_VERIFICATION
 */

try {
  if (process.loadEnvFile && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    process.loadEnvFile();
  }
} catch {
  // Ignored if .env doesn't exist
}

export const EVIDENCE_RELATIONS = Object.freeze({
  DIRECT: 'DIRECT',
  SUPPORTING: 'SUPPORTING',
  CONTEXTUAL: 'CONTEXTUAL',
  INCIDENTAL: 'INCIDENTAL',
  UNRELATED: 'UNRELATED'
});

export const VERIFICATION_STATUS = Object.freeze({
  VERIFIED: 'VERIFIED',
  VERIFICATION_ERROR: 'VERIFICATION_ERROR'
});

export const VERIFICATION_MODES = Object.freeze({
  AI_VERIFICATION: 'AI_VERIFICATION',
  DETERMINISTIC_VERIFICATION: 'DETERMINISTIC_VERIFICATION'
});

export const DEFAULT_VERIFICATION_OPTIONS = Object.freeze({
  mode: 'auto', // 'auto' | 'ai' | 'deterministic'
  temperature: 0.1,
  maxRetries: 1,
  safetyBias: true,
  model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'
});
