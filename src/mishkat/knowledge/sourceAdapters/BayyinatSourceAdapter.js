/**
 * Bayyinat Source Adapter
 * 
 * Specialized adapter for Bayyinat (بيّنات) from Dawa Center (dawa.center/file/7937)
 * covering dialogue, rebuttal of misconceptions, and frequently recurring questions.
 */

import { BaseSourceAdapter } from './BaseSourceAdapter.js';
import { KNOWLEDGE_DOMAINS, EVIDENCE_TYPES, VERIFICATION_STATUSES } from '../sourceTypes.js';
import { normalizeKnowledgeText } from '../knowledgeNormalizer.js';
import fs from 'fs';

export class BayyinatSourceAdapter extends BaseSourceAdapter {
  constructor(sourceId = 'src_misconceptions_bayyinat', options = {}) {
    super(sourceId, {
      defaultDomain: KNOWLEDGE_DOMAINS.MISCONCEPTIONS,
      defaultEvidenceType: EVIDENCE_TYPES.MISCONCEPTION_REBUTTAL,
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
    throw new Error('INVALID_BAYYINAT_INPUT: Expected valid JSON file path, string, or object.');
  }

  normalize(rawContent) {
    const rawList = Array.isArray(rawContent) ? rawContent : (rawContent.records || [rawContent]);

    return rawList.map((item, idx) => {
      const text = (item.text || '').trim();
      const norm = normalizeKnowledgeText(text, KNOWLEDGE_DOMAINS.MISCONCEPTIONS);

      return {
        recordId: item.recordId || `bayyinat_rec_${idx + 1}`,
        sourceId: this.sourceId,
        domain: KNOWLEDGE_DOMAINS.MISCONCEPTIONS,
        title: item.title || 'بيّنات - تفنيد شبهة',
        section: item.section || 'شبهات وردود',
        subsection: item.subsection || null,
        text: norm.normalizedText,
        rawText: norm.rawText,
        topics: Array.isArray(item.topics) ? item.topics : ['دفع الشبهات', 'بيّنات'],
        evidenceType: EVIDENCE_TYPES.MISCONCEPTION_REBUTTAL,
        reference: {
          book: 'كتاب بيّنات: براهين وأدلة في تفنيد الشبهات',
          chapter: item.reference?.chapter || null,
          page: item.reference?.page !== undefined ? item.reference.page : null,
          volume: null,
          hadithNumber: null,
          surahNumber: null,
          ayahNumber: null
        },
        attribution: {
          author: 'مركز دعوة للبحوث والدراسات (Dawa Center)',
          scholar: null,
          narrator: null
        },
        verification: {
          status: VERIFICATION_STATUSES.SOURCE_PROVIDED,
          grading: null,
          gradingAuthority: null
        },
        sourceUrl: item.sourceUrl || this.options.sourceUrl || 'https://dawa.center/file/7937'
      };
    });
  }

  validate(records) {
    const errors = [];
    if (!Array.isArray(records) || records.length === 0) {
      errors.push('No Bayyinat records found.');
    }
    for (const r of records) {
      if (!r.text || r.text.trim() === '') {
        errors.push(`Empty text in Bayyinat record ${r.recordId}`);
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  toKnowledgeRecords(records) {
    return records;
  }
}

export default BayyinatSourceAdapter;
