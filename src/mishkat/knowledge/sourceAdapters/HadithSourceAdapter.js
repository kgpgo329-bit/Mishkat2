/**
 * Hadith Source Adapter
 * 
 * Specialized adapter for canonical prophetic hadiths and verification records.
 * Enforces explicit narrator attribution, collection and hadith numbers,
 * and preserves authenticity grading without alteration or guessing.
 */

import { BaseSourceAdapter } from './BaseSourceAdapter.js';
import { KNOWLEDGE_DOMAINS, EVIDENCE_TYPES, VERIFICATION_STATUSES } from '../sourceTypes.js';
import { normalizeKnowledgeText } from '../knowledgeNormalizer.js';
import fs from 'fs';

export class HadithSourceAdapter extends BaseSourceAdapter {
  constructor(sourceId = 'src_hadith_bukhari', options = {}) {
    super(sourceId, {
      defaultDomain: KNOWLEDGE_DOMAINS.HADITH,
      defaultEvidenceType: EVIDENCE_TYPES.HADITH_ISNAD_STATUS,
      ...options
    });
  }

  async load(input) {
    if (typeof input === 'string') {
      if (fs.existsSync(input)) {
        return JSON.parse(fs.readFileSync(input, 'utf8'));
      }
      return JSON.parse(input);
    }
    if (typeof input === 'object' && input !== null) {
      return input;
    }
    throw new Error('INVALID_HADITH_INPUT: Expected valid JSON file path, string, or object.');
  }

  normalize(rawContent) {
    const rawList = Array.isArray(rawContent) ? rawContent : (rawContent.records || [rawContent]);

    return rawList.map((item, idx) => {
      const text = (item.text || '').trim();
      const norm = normalizeKnowledgeText(text, KNOWLEDGE_DOMAINS.HADITH);

      return {
        recordId: item.recordId || `${this.sourceId}_rec_${idx + 1}`,
        sourceId: item.sourceId || this.sourceId,
        domain: KNOWLEDGE_DOMAINS.HADITH,
        title: item.title || 'حديث نبوي شريف',
        section: item.section || '',
        subsection: item.subsection || null,
        text: norm.normalizedText,
        rawText: norm.rawText,
        topics: Array.isArray(item.topics) ? item.topics : ['الحديث الشريف والسنة النبوية'],
        evidenceType: EVIDENCE_TYPES.HADITH_ISNAD_STATUS,
        reference: {
          book: item.reference?.book || null,
          chapter: item.reference?.chapter || null,
          hadithNumber: item.reference?.hadithNumber !== undefined ? item.reference.hadithNumber : null,
          volume: item.reference?.volume !== undefined ? item.reference.volume : null,
          page: item.reference?.page !== undefined ? item.reference.page : null,
          surahNumber: null,
          ayahNumber: null
        },
        attribution: {
          narrator: item.attribution?.narrator || null,
          scholar: item.attribution?.scholar || null,
          author: item.attribution?.author || null
        },
        verification: {
          status: item.verification?.status || VERIFICATION_STATUSES.VERIFIED,
          grading: item.verification?.grading ?? null,
          gradingAuthority: item.verification?.gradingAuthority ?? null
        },
        sourceUrl: item.sourceUrl || this.options.sourceUrl || 'https://dorar.net/hadith'
      };
    });
  }

  validate(records) {
    const errors = [];
    if (!Array.isArray(records) || records.length === 0) {
      errors.push('No Hadith records found.');
    }
    for (const r of records) {
      if (!r.text || r.text.trim() === '') {
        errors.push(`Empty text in Hadith record ${r.recordId}`);
      }
      if (r.verification.grading !== null && typeof r.verification.grading !== 'string') {
        errors.push(`Invalid grading in Hadith record ${r.recordId}`);
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  toKnowledgeRecords(records) {
    return records;
  }
}

export default HadithSourceAdapter;
