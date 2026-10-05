/**
 * JSON Source Adapter — Ingests structured JSON datasets into KnowledgeRecords
 */

import fs from 'fs';
import { BaseSourceAdapter } from './BaseSourceAdapter.js';
import { normalizeKnowledgeText } from '../knowledgeNormalizer.js';

export class JsonSourceAdapter extends BaseSourceAdapter {
  async load(input) {
    if (typeof input === 'string') {
      // Check if it's a file path or raw JSON string
      if (fs.existsSync(input)) {
        const fileContent = fs.readFileSync(input, 'utf8');
        return JSON.parse(fileContent);
      }
      return JSON.parse(input);
    }
    if (typeof input === 'object' && input !== null) {
      return input;
    }
    throw new Error('INVALID_JSON_INPUT: input must be a file path, JSON string, or object.');
  }

  normalize(rawData) {
    const records = Array.isArray(rawData) ? rawData : (rawData.records || [rawData]);
    return records.map((rec, idx) => {
      const text = (rec.text || '').trim();
      const norm = normalizeKnowledgeText(text, rec.domain || this.options.defaultDomain);
      return {
        ...rec,
        recordId: rec.recordId || `${this.sourceId}_rec_${idx + 1}`,
        sourceId: this.sourceId,
        domain: rec.domain || this.options.defaultDomain,
        title: rec.title || '',
        section: rec.section || '',
        subsection: rec.subsection || null,
        text: norm.normalizedText,
        topics: Array.isArray(rec.topics) ? rec.topics : [],
        evidenceType: rec.evidenceType || this.options.defaultEvidenceType || '',
        reference: {
          book: rec.reference?.book ?? null,
          volume: rec.reference?.volume ?? null,
          page: rec.reference?.page ?? null,
          chapter: rec.reference?.chapter ?? null,
          hadithNumber: rec.reference?.hadithNumber ?? null,
          surahNumber: rec.reference?.surahNumber ?? null,
          ayahNumber: rec.reference?.ayahNumber ?? null
        },
        attribution: {
          author: rec.attribution?.author ?? null,
          scholar: rec.attribution?.scholar ?? null,
          narrator: rec.attribution?.narrator ?? null
        },
        verification: {
          status: rec.verification?.status || 'SOURCE_PROVIDED',
          grading: rec.verification?.grading ?? null,
          gradingAuthority: rec.verification?.gradingAuthority ?? null
        },
        sourceUrl: rec.sourceUrl || this.options.defaultSourceUrl || null
      };
    });
  }

  validate(records) {
    const errors = [];
    if (!Array.isArray(records) || records.length === 0) {
      errors.push('No valid records found in JSON input.');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toKnowledgeRecords(records) {
    return records;
  }
}

export default JsonSourceAdapter;
