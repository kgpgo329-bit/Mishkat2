/**
 * Mishkat Knowledge Repository — Domain Types and Enums
 * 
 * Defines canonical domains, source types, authority levels, evidence types,
 * and verification statuses for all trusted Islamic knowledge assets.
 */

/**
 * Approved Islamic Knowledge Domains
 */
export const KNOWLEDGE_DOMAINS = Object.freeze({
  QURAN: 'QURAN',
  TAFSIR: 'TAFSIR',
  HADITH: 'HADITH',
  AQEEDAH: 'AQEEDAH',
  FIQH: 'FIQH',
  HISTORY: 'HISTORY',
  MISCONCEPTIONS: 'MISCONCEPTIONS',
  TERMINOLOGY: 'TERMINOLOGY',
  DAWAH: 'DAWAH'
});

export const ALLOWED_DOMAINS = Object.freeze(Object.values(KNOWLEDGE_DOMAINS));

/**
 * Media and Source Container Types
 */
export const SOURCE_TYPES = Object.freeze({
  BOOK: 'BOOK',
  WEBSITE: 'WEBSITE',
  ENCYCLOPEDIA: 'ENCYCLOPEDIA',
  DICTIONARY: 'DICTIONARY',
  COLLECTION: 'COLLECTION',
  DOCUMENT: 'DOCUMENT'
});

export const ALLOWED_SOURCE_TYPES = Object.freeze(Object.values(SOURCE_TYPES));

/**
 * Authority Hierarchy Levels
 */
export const AUTHORITY_LEVELS = Object.freeze({
  PRIMARY: 'PRIMARY',                     // Canonical texts (Quran, Sahihain)
  APPROVED_REFERENCE: 'APPROVED_REFERENCE', // Peer-reviewed encyclopedias (Dorar, King Fahd Complex)
  SUPPORTING: 'SUPPORTING'                // Auxiliary verified sources (Bayyinat, Dictionaries)
});

export const ALLOWED_AUTHORITY_LEVELS = Object.freeze(Object.values(AUTHORITY_LEVELS));

/**
 * Text Verification Statuses
 */
export const VERIFICATION_STATUSES = Object.freeze({
  VERIFIED: 'VERIFIED',
  SOURCE_PROVIDED: 'SOURCE_PROVIDED',
  UNVERIFIED: 'UNVERIFIED'
});

export const ALLOWED_VERIFICATION_STATUSES = Object.freeze(Object.values(VERIFICATION_STATUSES));

/**
 * Provenance Origin Types — Enforces strict separation between source text and AI metadata
 */
export const PROVENANCE_ORIGIN = Object.freeze({
  SOURCE_TEXT: 'SOURCE_TEXT',                   // Direct, authentic text from the approved physical/digital reference
  AI_GENERATED_METADATA: 'AI_GENERATED_METADATA', // AI-suggested tagging/topics (strictly auxiliary, never evidence)
  HUMAN_CURATED: 'HUMAN_CURATED'                // Verified human editorial curation
});

/**
 * Canonical Evidence Types (Phase 2 & Phase 3 Compatible)
 */
export const EVIDENCE_TYPES = Object.freeze({
  QURANIC_CANONICAL_TEXT: 'QURANIC_CANONICAL_TEXT',
  HADITH_ISNAD_STATUS: 'HADITH_ISNAD_STATUS',
  TAFSIR_EXEGESIS: 'TAFSIR_EXEGESIS',
  FIQH_OPINIONS: 'FIQH_OPINIONS',
  SCHOLARLY_IJMA_CONFIRMATION: 'SCHOLARLY_IJMA_CONFIRMATION',
  SCHOLARLY_CONSENSUS_AND_DISAGREEMENT: 'SCHOLARLY_CONSENSUS_AND_DISAGREEMENT',
  HISTORICAL_DOCUMENTATION: 'HISTORICAL_DOCUMENTATION',
  THEOLOGICAL_PROPOSITION: 'THEOLOGICAL_PROPOSITION',
  LEXICAL_DEFINITION: 'LEXICAL_DEFINITION',
  DAWAH_CLARIFICATION: 'DAWAH_CLARIFICATION',
  MISCONCEPTION_REBUTTAL: 'MISCONCEPTION_REBUTTAL',
  TEXTUAL_EVIDENCE: 'TEXTUAL_EVIDENCE'
});

export const ALLOWED_EVIDENCE_TYPES = Object.freeze(Object.values(EVIDENCE_TYPES));

/**
 * Canonical Sunni Schools of Jurisprudence (for Fiqh domain)
 */
export const FIQH_MADHAHIB = Object.freeze({
  HANAFI: 'HANAFI',
  MALIKI: 'MALIKI',
  SHAFII: 'SHAFII',
  HANBALI: 'HANBALI',
  CONSENSUS: 'CONSENSUS',
  GENERAL_FIQH: 'GENERAL_FIQH'
});
