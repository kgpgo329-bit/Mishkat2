/**
 * Dorar Source Adapter
 * 
 * Specialized adapter for peer-reviewed Islamic encyclopedias from Dorar Al-Saniyyah
 * (Fiqh, Aqeedah, Tafsir, History).
 */

import { BaseSourceAdapter } from './BaseSourceAdapter.js';
import { KNOWLEDGE_DOMAINS, VERIFICATION_STATUSES } from '../sourceTypes.js';
import { normalizeKnowledgeText } from '../knowledgeNormalizer.js';
import fs from 'fs';

export class DorarSourceAdapter extends BaseSourceAdapter {
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
    throw new Error('INVALID_DORAR_INPUT: Expected valid JSON file path, string, or object.');
  }

  normalize(rawContent) {
    const rawList = Array.isArray(rawContent) ? rawContent : (rawContent.records || [rawContent]);
    const domain = rawContent.domain || this.options.defaultDomain || KNOWLEDGE_DOMAINS.FIQH;

    return rawList.map((item, idx) => {
      const text = (item.text || '').trim();
      const norm = normalizeKnowledgeText(text, item.domain || domain);

      return {
        recordId: item.recordId || `${this.sourceId}_dorar_${idx + 1}`,
        sourceId: item.sourceId || this.sourceId,
        domain: item.domain || domain,
        title: item.title || '',
        section: item.section || '',
        subsection: item.subsection || null,
        text: norm.normalizedText,
        rawText: norm.rawText,
        topics: Array.isArray(item.topics) ? item.topics : [],
        evidenceType: item.evidenceType || this.options.defaultEvidenceType || '',
        reference: {
          book: item.reference?.book || null,
          chapter: item.reference?.chapter || null,
          volume: item.reference?.volume !== undefined ? item.reference.volume : null,
          page: item.reference?.page !== undefined ? item.reference.page : null,
          hadithNumber: item.reference?.hadithNumber !== undefined ? item.reference.hadithNumber : null,
          surahNumber: item.reference?.surahNumber !== undefined ? item.reference.surahNumber : null,
          ayahNumber: item.reference?.ayahNumber !== undefined ? item.reference.ayahNumber : null
        },
        attribution: {
          author: item.attribution?.author || 'القسم العلمي بمؤسسة الدرر السنية',
          scholar: item.attribution?.scholar || null,
          narrator: item.attribution?.narrator || null
        },
        verification: {
          status: item.verification?.status || VERIFICATION_STATUSES.VERIFIED,
          grading: item.verification?.grading ?? null,
          gradingAuthority: item.verification?.gradingAuthority ?? null
        },
        sourceUrl: item.sourceUrl || this.options.sourceUrl || 'https://dorar.net'
      };
    });
  }

  validate(records) {
    const errors = [];
    if (!Array.isArray(records) || records.length === 0) {
      errors.push('No Dorar encyclopedia records found.');
    }
    for (const r of records) {
      if (!r.text || r.text.trim() === '') {
        errors.push(`Empty text in Dorar record ${r.recordId}`);
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  toKnowledgeRecords(records) {
    return records;
  }
}

export default DorarSourceAdapter;
