/**
 * Text Document Adapter — Ingests structured text or Markdown knowledge documents
 */

import fs from 'fs';
import { BaseSourceAdapter } from './BaseSourceAdapter.js';
import { normalizeKnowledgeText } from '../knowledgeNormalizer.js';

export class TextDocumentAdapter extends BaseSourceAdapter {
  async load(input) {
    if (typeof input === 'string') {
      if (fs.existsSync(input)) {
        return fs.readFileSync(input, 'utf8');
      }
      return input;
    }
    throw new Error('INVALID_TEXT_INPUT: input must be a file path or string content.');
  }

  normalize(rawText) {
    const trimmed = (rawText || '').trim();
    const sections = trimmed.split(/^#{1,3}\s+/m).map(s => s.trim()).filter(Boolean);
    const domain = this.options.defaultDomain || 'MISCONCEPTIONS';

    return sections
      .map((sec, idx) => {
        const lines = sec.split('\n');
        const title = lines[0].trim();
        const body = lines.slice(1).join('\n').trim();
        if (!title && !body) return null;
        const norm = normalizeKnowledgeText(body || title, domain);

        return {
          recordId: `${this.sourceId}_doc_${idx + 1}`,
          sourceId: this.sourceId,
          domain,
          title,
          section: this.options.defaultSection || title,
          subsection: null,
          text: norm.normalizedText,
          topics: this.options.defaultTopics || [],
          evidenceType: this.options.defaultEvidenceType || 'TEXTUAL_EVIDENCE',
          reference: {
            book: this.options.bookName || null,
            volume: null,
            page: null,
            chapter: title,
            hadithNumber: null,
            surahNumber: null,
            ayahNumber: null
          },
          attribution: {
            author: this.options.author || null,
            scholar: null,
            narrator: null
          },
          verification: {
            status: 'SOURCE_PROVIDED',
            grading: null,
            gradingAuthority: null
          },
          sourceUrl: this.options.sourceUrl || null
        };
      })
      .filter(Boolean);
  }

  validate(records) {
    const errors = [];
    if (!Array.isArray(records) || records.length === 0) {
      errors.push('No sections parsed from text document.');
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

export default TextDocumentAdapter;
