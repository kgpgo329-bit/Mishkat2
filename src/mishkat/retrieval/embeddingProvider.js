/**
 * Mishkat Embedding Provider Abstraction — Phase 4
 * 
 * Strict compliance with Sections 9, 10, & 11:
 * - Distinguishes TEST_EMBEDDING from PRODUCTION_EMBEDDING.
 * - Server-side only; never exposes API secrets.
 * - Tests use DeterministicLocalEmbeddingProvider (0 API cost, deterministic).
 * - Production uses GeminiEmbeddingProvider when credentials are configured.
 */

import crypto from 'crypto';
import { normalizeSearchText, extractSearchTokens } from './retrievalQueryBuilder.js';

export const EMBEDDING_PROVIDER_TYPES = Object.freeze({
  TEST_EMBEDDING: 'TEST_EMBEDDING',
  PRODUCTION_EMBEDDING: 'PRODUCTION_EMBEDDING'
});

/**
 * Base Abstract Embedding Provider
 */
export class BaseEmbeddingProvider {
  constructor(providerType, modelName) {
    this.providerType = providerType;
    this.modelName = modelName;
  }

  async embedText(text) {
    throw new Error('NOT_IMPLEMENTED: embedText() must be implemented by subclass.');
  }

  async embedBatch(texts) {
    const vectors = [];
    for (const text of texts) {
      vectors.push(await this.embedText(text));
    }
    return vectors;
  }
}

/**
 * Deterministic Local Embedding Provider (TEST_EMBEDDING)
 * 
 * Generates deterministic 256-dimensional dense vector projections
 * based on Arabic morphological n-grams and signed hashing (Random Projection).
 * Requires 0 network calls and 0 API cost.
 * Zero-similarity for unrelated texts; high positive similarity for shared semantic terms.
 */
export class DeterministicLocalEmbeddingProvider extends BaseEmbeddingProvider {
  constructor(dimensions = 256) {
    super(EMBEDDING_PROVIDER_TYPES.TEST_EMBEDDING, 'mishkat-deterministic-v1');
    this.dimensions = dimensions;
  }

  async embedText(rawText) {
    const vec = new Float32Array(this.dimensions).fill(0);
    const tokens = extractSearchTokens(rawText);

    if (tokens.length === 0) {
      return Array.from(vec);
    }

    // 1. Significant token words (signed projection)
    for (const token of tokens) {
      const h = this._hashString(token);
      const idx = Math.abs(h) % this.dimensions;
      const sign = (h & 1) === 0 ? 1.0 : -1.0;
      vec[idx] += sign * 2.0;

      // 2. Morphological character n-grams (3-grams and 4-grams) within significant words
      for (let n = 3; n <= 4; n++) {
        for (let i = 0; i <= token.length - n; i++) {
          const gram = token.slice(i, i + n);
          const gh = this._hashString(gram);
          const gidx = Math.abs(gh) % this.dimensions;
          const gsign = (gh & 1) === 0 ? 1.0 : -1.0;
          vec[gidx] += gsign * 0.35;
        }
      }
    }

    // 3. L2 Normalize vector
    let norm = 0;
    for (let i = 0; i < this.dimensions; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vec[i] /= norm;
      }
    }

    return Array.from(vec);
  }

  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
}

/**
 * Gemini Production Embedding Provider (PRODUCTION_EMBEDDING)
 * 
 * Server-side REST adapter for Google Gemini text-embedding models.
 */
export class GeminiEmbeddingProvider extends BaseEmbeddingProvider {
  constructor(options = {}) {
    super(EMBEDDING_PROVIDER_TYPES.PRODUCTION_EMBEDDING, options.model || 'text-embedding-004');
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  }

  isAvailable() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async embedText(text) {
    if (!this.isAvailable()) {
      throw new Error('GEMINI_EMBEDDING_UNAVAILABLE: GEMINI_API_KEY not configured.');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.modelName)}:embedContent?key=${encodeURIComponent(this.apiKey)}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${this.modelName}`,
        content: {
          parts: [{ text: text.slice(0, 2048) }]
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GEMINI_EMBED_API_ERROR (HTTP ${res.status}): ${errText}`);
    }

    const data = await res.json();
    const values = data?.embedding?.values;
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error('No embedding values returned by Gemini API.');
    }

    return values;
  }
}

/**
 * Factory for selecting the appropriate EmbeddingProvider
 * 
 * @param {Object} [options={}]
 * @returns {BaseEmbeddingProvider}
 */
export function getEmbeddingProvider(options = {}) {
  const mode = options.embeddingProvider || 'auto';

  if (mode === 'test') {
    return new DeterministicLocalEmbeddingProvider();
  }

  if (mode === 'gemini') {
    const prod = new GeminiEmbeddingProvider(options);
    if (prod.isAvailable()) return prod;
    throw new Error('PRODUCTION_EMBEDDING_UNAVAILABLE: Gemini credentials are not configured.');
  }

  // 'auto': Use Gemini if explicitly requested and available, else deterministic local provider
  const geminiProvider = new GeminiEmbeddingProvider(options);
  if (options.useProductionEmbedding === true && geminiProvider.isAvailable()) {
    return geminiProvider;
  }

  // Default to robust, zero-cost deterministic local provider
  return new DeterministicLocalEmbeddingProvider();
}

/**
 * Computes Cosine Similarity between two dense numeric vectors
 * 
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} similarity score [-1.0, 1.0]
 */
export function computeCosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}
