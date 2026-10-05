/**
 * Islamic Content Dictionary Adapter
 * 
 * Specialized adapter for Al-Jamhara Dictionary (islamic-content.com/dictionary)
 * for sensitive Islamic terminology, lexical definitions, and authoritative translations.
 */

import { BaseSourceAdapter } from './BaseSourceAdapter.js';
import { KNOWLEDGE_DOMAINS, EVIDENCE_TYPES, VERIFICATION_STATUSES } from '../sourceTypes.js';
import { normalizeKnowledgeText } from '../knowledgeNormalizer.js';
import fs from 'fs';

export class IslamicContentDictionaryAdapter extends BaseSourceAdapter {
  constructor(sourceId = 'src_terminology_jamhara', options = {}) {
    super(sourceId, {
      defaultDomain: KNOWLEDGE_DOMAINS.TERMINOLOGY,
      defaultEvidenceType: EVIDENCE_TYPES.LEXICAL_DEFINITION,
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
    throw new Error('INVALID_DICTIONARY_INPUT: Expected valid JSON file path, string, or object.');
  }

  normalize(rawContent) {
    const rawList = Array.isArray(rawContent) ? rawContent : (rawContent.records || [rawContent]);

    return rawList.map((item, idx) => {
      const text = (item.text || '').trim();
      const norm = normalizeKnowledgeText(text, KNOWLEDGE_DOMAINS.TERMINOLOGY);

      return {
        recordId: item.recordId || `term_jamhara_${idx + 1}`,
        sourceId: this.sourceId,
        domain: KNOWLEDGE_DOMAINS.TERMINOLOGY,
        title: item.title || 'مصطلح إسلامي مترجم',
        section: item.section || 'معجم المصطلحات',
        subsection: item.subsection || null,
        text: norm.normalizedText,
        rawText: norm.rawText,
        topics: Array.isArray(item.topics) ? item.topics : ['مصطلحات إسلامية', 'ترجمة شرعية'],
        evidenceType: EVIDENCE_TYPES.LEXICAL_DEFINITION,
        reference: {
          book: 'معجم الجمهرة للمصطلحات الإسلامية المترجمة',
          chapter: item.reference?.chapter || null,
          page: item.reference?.page !== undefined ? item.reference.page : null,
          volume: null,
          hadithNumber: null,
          surahNumber: null,
          ayahNumber: null
        },
        attribution: {
          author: 'منصة المحتوى الإسلامي المفتوح (Islamic Content)',
          scholar: null,
          narrator: null
        },
        verification: {
          status: VERIFICATION_STATUSES.VERIFIED,
          grading: null,
          gradingAuthority: 'اعتماد المجمع اللغوي والشرعي'
        },
        sourceUrl: item.sourceUrl || this.options.sourceUrl || 'https://islamic-content.com/dictionary'
      };
    });
  }

  validate(records) {
    const errors = [];
    if (!Array.isArray(records) || records.length === 0) {
      errors.push('No Dictionary terminology records found.');
    }
    for (const r of records) {
      if (!r.text || r.text.trim() === '') {
        errors.push(`Empty text in Terminology record ${r.recordId}`);
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  toKnowledgeRecords(records) {
    return records;
  }
}

export default IslamicContentDictionaryAdapter;
