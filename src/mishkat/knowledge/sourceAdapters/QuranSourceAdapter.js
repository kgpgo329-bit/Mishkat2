/**
 * Quran Source Adapter
 * 
 * Specialized adapter for canonical verified Quranic text.
 * Enforces Surah (1-114) and positive Ayah constraints,
 * preserves complete Uthmani text without stripping tashkeel.
 */

import { BaseSourceAdapter } from './BaseSourceAdapter.js';
import { KNOWLEDGE_DOMAINS, EVIDENCE_TYPES, VERIFICATION_STATUSES } from '../sourceTypes.js';
import { normalizeKnowledgeText } from '../knowledgeNormalizer.js';
import fs from 'fs';

export class QuranSourceAdapter extends BaseSourceAdapter {
  constructor(sourceId = 'src_quran_king_fahd', options = {}) {
    super(sourceId, {
      defaultDomain: KNOWLEDGE_DOMAINS.QURAN,
      defaultEvidenceType: EVIDENCE_TYPES.QURANIC_CANONICAL_TEXT,
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
    throw new Error('INVALID_QURAN_INPUT: Expected valid JSON file path, string, or object.');
  }

  normalize(rawContent) {
    const rawList = Array.isArray(rawContent) ? rawContent : (rawContent.records || [rawContent]);

    return rawList.map((item, idx) => {
      const text = (item.text || '').trim();
      const norm = normalizeKnowledgeText(text, KNOWLEDGE_DOMAINS.QURAN);

      const surahNum = Number(item.reference?.surahNumber);
      const ayahNum = Number(item.reference?.ayahNumber);

      return {
        recordId: item.recordId || `quran_${surahNum}_${ayahNum || idx + 1}`,
        sourceId: this.sourceId,
        domain: KNOWLEDGE_DOMAINS.QURAN,
        title: item.title || `سورة ${surahNum} - آية ${ayahNum}`,
        section: item.section || '',
        subsection: item.subsection || null,
        text: norm.normalizedText,
        rawText: norm.rawText,
        topics: Array.isArray(item.topics) ? item.topics : ['القرآن الكريم'],
        evidenceType: EVIDENCE_TYPES.QURANIC_CANONICAL_TEXT,
        reference: {
          surahNumber: surahNum,
          ayahNumber: ayahNum,
          book: 'القرآن الكريم',
          chapter: item.reference?.chapter || null,
          page: item.reference?.page ? Number(item.reference.page) : null,
          volume: null,
          hadithNumber: null
        },
        attribution: {
          author: 'كلام الله المعجز',
          scholar: null,
          narrator: null
        },
        verification: {
          status: VERIFICATION_STATUSES.VERIFIED,
          grading: null,
          gradingAuthority: 'تواتر المصحف الشريف بالإجماع'
        },
        sourceUrl: item.sourceUrl || this.options.sourceUrl || 'https://qurancomplex.gov.sa'
      };
    });
  }

  validate(records) {
    const errors = [];
    if (!Array.isArray(records) || records.length === 0) {
      errors.push('No Quran records found.');
    }
    for (const r of records) {
      if (!r.reference?.surahNumber || r.reference.surahNumber < 1 || r.reference.surahNumber > 114) {
        errors.push(`Invalid surahNumber: ${r.reference?.surahNumber} in record ${r.recordId}`);
      }
      if (!r.reference?.ayahNumber || r.reference.ayahNumber < 1) {
        errors.push(`Invalid ayahNumber: ${r.reference?.ayahNumber} in record ${r.recordId}`);
      }
      if (!r.text || r.text.trim() === '') {
        errors.push(`Empty Quran text in record ${r.recordId}`);
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  toKnowledgeRecords(records) {
    return records;
  }
}

export default QuranSourceAdapter;
