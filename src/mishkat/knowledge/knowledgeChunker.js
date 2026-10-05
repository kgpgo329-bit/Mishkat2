/**
 * Mishkat Knowledge Chunker — Semantic, Domain-Aware Knowledge Chunker
 * 
 * Implements Islamic document-aware chunking strategies:
 * - Quran: Ayah boundary or coherent ayah group (never cuts in middle of verse).
 * - Hadith: Individual hadith unit (text + isnad + grading).
 * - Tafsir: Coherent commentary unit per ayah/passage.
 * - Fiqh: Coherent ruling/issue/evidence unit (preserves conditions & exceptions).
 * - Aqeedah: Coherent theological proposition unit.
 * - History: Coherent historical report/event unit.
 * - Misconceptions: Coherent claim + rebuttal/evidence unit.
 * - Terminology: One term + translation/definition unit.
 * 
 * Enforces strict chunk traceability back to parent record and source.
 */

import { KNOWLEDGE_DOMAINS } from './sourceTypes.js';
import { normalizeKnowledgeText, computeContentHash } from './knowledgeNormalizer.js';

/**
 * Creates canonical KnowledgeChunks from a validated KnowledgeRecord
 * 
 * @param {Object} record Validated KnowledgeRecord
 * @param {Object} [sourceInfo={}] Metadata from registered source (sourceName, sourceUrl)
 * @returns {Array<Object>} List of canonical KnowledgeChunks
 */
export function chunkKnowledgeRecord(record, sourceInfo = {}) {
  if (!record || typeof record !== 'object') {
    throw new Error('INVALID_RECORD: record must be a valid object.');
  }

  const chunks = [];
  const domain = record.domain;
  const sourceName = sourceInfo.sourceName || record.sourceName || '';
  const sourceUrl = record.sourceUrl || sourceInfo.sourceUrl || null;

  switch (domain) {
    case KNOWLEDGE_DOMAINS.QURAN:
      // Quran records represent individual Ayahs or coherent small Ayah groups.
      // They are atomic and must NEVER be split by arbitrary character count.
      chunks.push(createSingleChunk(record, record.text, 0, sourceName, sourceUrl));
      break;

    case KNOWLEDGE_DOMAINS.HADITH:
      // Hadith records represent complete narrated reports.
      // Must be kept intact with isnad and grading.
      chunks.push(createSingleChunk(record, record.text, 0, sourceName, sourceUrl));
      break;

    case KNOWLEDGE_DOMAINS.TERMINOLOGY:
      // Terminology records represent a single lexical term + definition + translation.
      chunks.push(createSingleChunk(record, record.text, 0, sourceName, sourceUrl));
      break;

    case KNOWLEDGE_DOMAINS.MISCONCEPTIONS:
      // Misconceptions: If text contains structured question/claim and answer/rebuttal,
      // it should remain together as a coherent unit. If very long, split by numbered evidence points.
      chunks.push(...chunkStructuredDocument(record, sourceName, sourceUrl, 1200));
      break;

    case KNOWLEDGE_DOMAINS.FIQH:
    case KNOWLEDGE_DOMAINS.AQEEDAH:
    case KNOWLEDGE_DOMAINS.HISTORY:
    case KNOWLEDGE_DOMAINS.TAFSIR:
    case KNOWLEDGE_DOMAINS.DAWAH:
    default:
      // For general prose, split by semantic paragraphs/sections without breaking quotes or rulings.
      chunks.push(...chunkStructuredDocument(record, sourceName, sourceUrl, 1000));
      break;
  }

  return chunks;
}

/**
 * Creates a single atomic chunk from a record
 */
function createSingleChunk(record, text, index, sourceName, sourceUrl) {
  const norm = normalizeKnowledgeText(text, record.domain);
  const chunkId = `${record.recordId}_chk_${index}`;
  const contentHash = computeContentHash(norm.normalizedText, record.reference);

  return {
    chunkId,
    recordId: record.recordId,
    sourceId: record.sourceId,
    sourceName,
    sourceUrl,
    domain: record.domain,
    title: record.title || '',
    section: record.section || '',
    subsection: record.subsection || null,
    text: norm.normalizedText,
    topics: Array.isArray(record.topics) ? [...record.topics] : [],
    evidenceType: record.evidenceType || '',
    reference: record.reference ? { ...record.reference } : {},
    attribution: record.attribution ? { ...record.attribution } : {},
    verification: record.verification ? { ...record.verification } : {},
    contentHash
  };
}

/**
 * Splits structured prose into coherent semantic chunks along paragraph/section boundaries
 */
function chunkStructuredDocument(record, sourceName, sourceUrl, maxChars = 1000) {
  const text = (record.text || '').trim();
  if (text.length <= maxChars) {
    return [createSingleChunk(record, text, 0, sourceName, sourceUrl)];
  }

  // Split on paragraph boundaries (\n\n) or numbered sections
  const rawParagraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let currentSegment = '';
  let chunkIdx = 0;

  for (const para of rawParagraphs) {
    if ((currentSegment + '\n\n' + para).trim().length <= maxChars) {
      currentSegment = currentSegment ? (currentSegment + '\n\n' + para) : para;
    } else {
      if (currentSegment) {
        chunks.push(createSingleChunk(record, currentSegment, chunkIdx++, sourceName, sourceUrl));
      }
      // If a single paragraph itself exceeds maxChars, split safely on sentence boundaries (., !, ؟)
      if (para.length > maxChars) {
        const sentenceChunks = splitLongParagraphSafely(para, maxChars);
        for (const sChunk of sentenceChunks) {
          chunks.push(createSingleChunk(record, sChunk, chunkIdx++, sourceName, sourceUrl));
        }
        currentSegment = '';
      } else {
        currentSegment = para;
      }
    }
  }

  if (currentSegment.trim()) {
    chunks.push(createSingleChunk(record, currentSegment, chunkIdx++, sourceName, sourceUrl));
  }

  return chunks.length > 0 ? chunks : [createSingleChunk(record, text, 0, sourceName, sourceUrl)];
}

/**
 * Splits an oversized paragraph along sentence boundaries without cutting mid-word or mid-quote
 */
function splitLongParagraphSafely(para, maxChars) {
  const sentences = para.split(/([.!?؟]+(?:\s+|$))/).filter(Boolean);
  const parts = [];
  let buffer = '';

  for (let i = 0; i < sentences.length; i += 2) {
    const sent = sentences[i] + (sentences[i + 1] || '');
    if ((buffer + ' ' + sent).trim().length <= maxChars) {
      buffer = buffer ? (buffer + ' ' + sent) : sent;
    } else {
      if (buffer) parts.push(buffer.trim());
      buffer = sent;
    }
  }

  if (buffer.trim()) {
    parts.push(buffer.trim());
  }

  return parts.length > 0 ? parts : [para];
}
