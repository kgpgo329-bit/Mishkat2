/**
 * Mishkat Trusted Source Repository — Phase 3 Canonical Knowledge Layer
 * 
 * Central, unified repository for all verified Islamic knowledge assets.
 * 
 * Invariants:
 * 1. Single unified repository contract for all domains (Quran, Hadith, Fiqh, etc.).
 * 2. Strict provenance: Chunk -> Knowledge Record -> Registered Source.
 * 3. Zero orphan chunks or unapproved sources.
 * 4. Explicit distinction between REGISTERED and INDEXED sources.
 * 5. Strict separation between authentic SOURCE_TEXT and AI_GENERATED_METADATA.
 * 6. Deterministic, provenance-preserving deduplication.
 * 7. Comprehensive structural and domain integrity verification.
 */

import fs from 'fs';
import path from 'path';
import {
  KNOWLEDGE_DOMAINS,
  ALLOWED_DOMAINS,
  PROVENANCE_ORIGIN,
  VERIFICATION_STATUSES
} from './sourceTypes.js';
import { SourceRegistry, defaultSourceRegistry } from './sourceRegistry.js';
import { validateKnowledgeRecord, validateKnowledgeChunk } from './sourceValidator.js';
import { chunkKnowledgeRecord } from './knowledgeChunker.js';
import { KnowledgeDeduplicator } from './knowledgeDeduplicator.js';
import { normalizeKnowledgeText, computeContentHash } from './knowledgeNormalizer.js';

export class TrustedSourceRepository {
  constructor(options = {}) {
    this.sourceRegistry = options.sourceRegistry || new SourceRegistry();
    this.deduplicator = options.deduplicator || new KnowledgeDeduplicator();

    // In-memory primary stores
    this._records = new Map(); // recordId -> KnowledgeRecord
    this._chunks = new Map();  // chunkId -> KnowledgeChunk

    // Secondary index maps for fast retrieval
    this._recordsBySource = new Map(); // sourceId -> Set<recordId>
    this._recordsByDomain = new Map(); // domain -> Set<recordId>
    this._chunksBySource = new Map();  // sourceId -> Set<chunkId>
    this._chunksByDomain = new Map();  // domain -> Set<chunkId>
    this._chunksByRecord = new Map();  // recordId -> Set<chunkId>

    // Statistics and diagnostics
    this.stats = {
      duplicatesRejected: 0,
      recordsIngested: 0,
      chunksIngested: 0
    };

    // Initialize domain sets
    for (const domain of ALLOWED_DOMAINS) {
      this._recordsByDomain.set(domain, new Set());
      this._chunksByDomain.set(domain, new Set());
    }
  }

  // ==========================================
  // SOURCE MANAGEMENT
  // ==========================================

  /**
   * Registers an approved source into the canonical registry
   * @param {Object} source 
   * @returns {Object} registered source
   */
  registerSource(source) {
    const registered = this.sourceRegistry.registerSource(source);
    // Initialize secondary indexes for this source
    if (!this._recordsBySource.has(registered.sourceId)) {
      this._recordsBySource.set(registered.sourceId, new Set());
      this._chunksBySource.set(registered.sourceId, new Set());
    }
    return registered;
  }

  /**
   * Retrieves a registered source by sourceId
   * @param {string} sourceId 
   * @returns {Object|null}
   */
  getSource(sourceId) {
    return this.sourceRegistry.getSource(sourceId);
  }

  /**
   * Retrieves all registered sources
   * @returns {Array<Object>}
   */
  getSources() {
    return this.sourceRegistry.getAllSources();
  }

  // ==========================================
  // RECORD INGESTION & MANAGEMENT
  // ==========================================

  /**
   * Adds and indexes a validated KnowledgeRecord.
   * Also automatically chunks the record if autoChunk = true.
   * 
   * @param {Object} rawRecord 
   * @param {Object} [options={ autoChunk: true }]
   * @returns {{ record: Object, chunks: Array<Object>, isDuplicate: boolean }}
   */
  addRecord(rawRecord, options = { autoChunk: true }) {
    // 1. Validation against schema and registered approved sources
    const validation = validateKnowledgeRecord(rawRecord, this.sourceRegistry);
    if (!validation.isValid) {
      throw new Error(`RECORD_VALIDATION_ERROR: ${validation.errors.join('; ')}`);
    }

    // 2. Normalization of text and content hash
    const norm = normalizeKnowledgeText(rawRecord.text, rawRecord.domain);
    const contentHash = computeContentHash(norm.normalizedText, rawRecord.reference);

    const canonicalRecord = {
      recordId: rawRecord.recordId.trim(),
      sourceId: rawRecord.sourceId.trim(),
      domain: rawRecord.domain,
      title: rawRecord.title || '',
      section: rawRecord.section || '',
      subsection: rawRecord.subsection || null,
      text: norm.normalizedText,
      rawText: norm.rawText,
      topics: Array.isArray(rawRecord.topics) ? [...rawRecord.topics] : [],
      evidenceType: rawRecord.evidenceType || '',
      reference: rawRecord.reference ? { ...rawRecord.reference } : {},
      attribution: rawRecord.attribution ? { ...rawRecord.attribution } : {},
      verification: {
        status: rawRecord.verification?.status || VERIFICATION_STATUSES.SOURCE_PROVIDED,
        grading: rawRecord.verification?.grading ?? null,
        gradingAuthority: rawRecord.verification?.gradingAuthority ?? null
      },
      sourceUrl: rawRecord.sourceUrl || null,
      contentHash,
      provenance: {
        origin: rawRecord.provenance?.origin || PROVENANCE_ORIGIN.SOURCE_TEXT,
        importedAt: new Date().toISOString(),
        aiMetadata: rawRecord.provenance?.aiMetadata || null
      }
    };

    // 3. Deduplication Check
    if (this.deduplicator.isDuplicate(canonicalRecord)) {
      this.stats.duplicatesRejected++;
      return { record: canonicalRecord, chunks: [], isDuplicate: true };
    }

    // 4. Store Record in Primary and Secondary Indexes
    this.deduplicator.register(canonicalRecord);
    this._records.set(canonicalRecord.recordId, Object.freeze(canonicalRecord));

    if (!this._recordsBySource.has(canonicalRecord.sourceId)) {
      this._recordsBySource.set(canonicalRecord.sourceId, new Set());
    }
    this._recordsBySource.get(canonicalRecord.sourceId).add(canonicalRecord.recordId);

    if (this._recordsByDomain.has(canonicalRecord.domain)) {
      this._recordsByDomain.get(canonicalRecord.domain).add(canonicalRecord.recordId);
    }

    this.stats.recordsIngested++;

    // 5. Automatic Document-Aware Chunking (if requested)
    const generatedChunks = [];
    if (options.autoChunk !== false) {
      const source = this.getSource(canonicalRecord.sourceId);
      const chunks = chunkKnowledgeRecord(canonicalRecord, {
        sourceName: source?.sourceName || '',
        sourceUrl: source?.sourceUrl || canonicalRecord.sourceUrl
      });

      for (const chunk of chunks) {
        this.addChunk(chunk);
        generatedChunks.push(chunk);
      }
    }

    return {
      record: canonicalRecord,
      chunks: generatedChunks,
      isDuplicate: false
    };
  }

  /**
   * Adds multiple records in batch
   * @param {Array<Object>} records 
   * @param {Object} [options]
   * @returns {{ ingested: number, duplicates: number, chunksCreated: number }}
   */
  addRecords(records, options = { autoChunk: true }) {
    if (!Array.isArray(records)) {
      throw new Error('INVALID_RECORDS_ARRAY: records must be an array.');
    }

    let ingested = 0;
    let duplicates = 0;
    let chunksCreated = 0;

    for (const rec of records) {
      const result = this.addRecord(rec, options);
      if (result.isDuplicate) {
        duplicates++;
      } else {
        ingested++;
        chunksCreated += result.chunks.length;
      }
    }

    return { ingested, duplicates, chunksCreated };
  }

  /**
   * Retrieves a single record by recordId
   * @param {string} recordId 
   * @returns {Object|null}
   */
  getRecord(recordId) {
    if (!recordId) return null;
    return this._records.get(recordId) || null;
  }

  /**
   * Retrieves all records for a specific sourceId
   * @param {string} sourceId 
   * @returns {Array<Object>}
   */
  getRecordsBySource(sourceId) {
    const idSet = this._recordsBySource.get(sourceId);
    if (!idSet) return [];
    return Array.from(idSet).map(id => this._records.get(id)).filter(Boolean);
  }

  /**
   * Retrieves all records for a specific domain
   * @param {string} domain 
   * @returns {Array<Object>}
   */
  getRecordsByDomain(domain) {
    const idSet = this._recordsByDomain.get(domain);
    if (!idSet) return [];
    return Array.from(idSet).map(id => this._records.get(id)).filter(Boolean);
  }

  /**
   * Total records count
   */
  get recordCount() {
    return this._records.size;
  }

  // ==========================================
  // CHUNK MANAGEMENT
  // ==========================================

  /**
   * Adds and indexes a single KnowledgeChunk.
   * Enforces provenance (parent record and source must exist).
   * 
   * @param {Object} chunk 
   * @returns {Object} canonical chunk
   */
  addChunk(chunk) {
    // 1. Validate chunk structure and provenance
    const validation = validateKnowledgeChunk(chunk, this._records, this.sourceRegistry);
    if (!validation.isValid) {
      throw new Error(`CHUNK_VALIDATION_ERROR: ${validation.errors.join('; ')}`);
    }

    const canonicalChunk = Object.freeze({
      chunkId: chunk.chunkId.trim(),
      recordId: chunk.recordId.trim(),
      sourceId: chunk.sourceId.trim(),
      sourceName: chunk.sourceName || '',
      sourceUrl: chunk.sourceUrl || null,
      domain: chunk.domain,
      title: chunk.title || '',
      section: chunk.section || '',
      subsection: chunk.subsection || null,
      text: chunk.text.trim(),
      topics: Array.isArray(chunk.topics) ? [...chunk.topics] : [],
      evidenceType: chunk.evidenceType || '',
      reference: chunk.reference ? { ...chunk.reference } : {},
      attribution: chunk.attribution ? { ...chunk.attribution } : {},
      verification: chunk.verification ? { ...chunk.verification } : {},
      contentHash: chunk.contentHash
    });

    // Store in chunk primary and secondary indexes
    this._chunks.set(canonicalChunk.chunkId, canonicalChunk);

    if (!this._chunksBySource.has(canonicalChunk.sourceId)) {
      this._chunksBySource.set(canonicalChunk.sourceId, new Set());
    }
    this._chunksBySource.get(canonicalChunk.sourceId).add(canonicalChunk.chunkId);

    if (this._chunksByDomain.has(canonicalChunk.domain)) {
      this._chunksByDomain.get(canonicalChunk.domain).add(canonicalChunk.chunkId);
    }

    if (!this._chunksByRecord.has(canonicalChunk.recordId)) {
      this._chunksByRecord.set(canonicalChunk.recordId, new Set());
    }
    this._chunksByRecord.get(canonicalChunk.recordId).add(canonicalChunk.chunkId);

    this.stats.chunksIngested++;
    return canonicalChunk;
  }

  /**
   * Retrieves a single chunk by chunkId
   * @param {string} chunkId 
   * @returns {Object|null}
   */
  getChunk(chunkId) {
    if (!chunkId) return null;
    return this._chunks.get(chunkId) || null;
  }

  /**
   * Retrieves all chunks for a specific sourceId
   * @param {string} sourceId 
   * @returns {Array<Object>}
   */
  getChunksBySource(sourceId) {
    const idSet = this._chunksBySource.get(sourceId);
    if (!idSet) return [];
    return Array.from(idSet).map(id => this._chunks.get(id)).filter(Boolean);
  }

  /**
   * Retrieves all chunks for a specific domain
   * @param {string} domain 
   * @returns {Array<Object>}
   */
  getChunksByDomain(domain) {
    const idSet = this._chunksByDomain.get(domain);
    if (!idSet) return [];
    return Array.from(idSet).map(id => this._chunks.get(id)).filter(Boolean);
  }

  /**
   * Retrieves all chunks belonging to a specific recordId
   * @param {string} recordId 
   * @returns {Array<Object>}
   */
  getChunksByRecord(recordId) {
    const idSet = this._chunksByRecord.get(recordId);
    if (!idSet) return [];
    return Array.from(idSet).map(id => this._chunks.get(id)).filter(Boolean);
  }

  /**
   * Total chunks count
   */
  get chunkCount() {
    return this._chunks.size;
  }

  // ==========================================
  // INTEGRITY & PROVENANCE VERIFICATION
  // ==========================================

  /**
   * Performs a comprehensive integrity audit across the repository:
   * - Validates that every chunk has an existing parent record and registered source.
   * - Validates that every record references a valid approved source.
   * - Verifies content hashes.
   * 
   * @returns {{ isHealthy: boolean, issues: string[] }}
   */
  validateIntegrity() {
    const issues = [];

    // 1. Audit records
    for (const [recordId, record] of this._records.entries()) {
      const src = this.getSource(record.sourceId);
      if (!src) {
        issues.push(`Record [${recordId}] references non-existent source [${record.sourceId}].`);
      } else if (src.approved !== true) {
        issues.push(`Record [${recordId}] references unapproved source [${record.sourceId}].`);
      }

      // Check hash integrity
      const expectedHash = computeContentHash(record.text, record.reference);
      if (record.contentHash !== expectedHash) {
        issues.push(`Record [${recordId}] contentHash mismatch.`);
      }
    }

    // 2. Audit chunks
    for (const [chunkId, chunk] of this._chunks.entries()) {
      const parentRecord = this._records.get(chunk.recordId);
      if (!parentRecord) {
        issues.push(`Orphan Chunk [${chunkId}]: Parent record [${chunk.recordId}] does not exist.`);
      } else if (parentRecord.sourceId !== chunk.sourceId) {
        issues.push(`Provenance Mismatch in Chunk [${chunkId}]: chunk source [${chunk.sourceId}] != record source [${parentRecord.sourceId}].`);
      }

      const src = this.getSource(chunk.sourceId);
      if (!src) {
        issues.push(`Chunk [${chunkId}] references non-existent source [${chunk.sourceId}].`);
      }
    }

    return {
      isHealthy: issues.length === 0,
      issues
    };
  }

  // ==========================================
  // COVERAGE REPORTING
  // ==========================================

  /**
   * Generates a detailed coverage and diagnostic report.
   * Explicitly distinguishes REGISTERED from INDEXED sources.
   * 
   * @returns {Object} Coverage report object
   */
  getCoverageReport() {
    const allSources = this.getSources();
    const registeredCount = allSources.length;

    const indexedSources = [];
    const unindexedSources = [];
    const recordsPerSource = {};
    const chunksPerSource = {};

    for (const src of allSources) {
      const recCount = this.getRecordsBySource(src.sourceId).length;
      const chkCount = this.getChunksBySource(src.sourceId).length;
      recordsPerSource[src.sourceId] = recCount;
      chunksPerSource[src.sourceId] = chkCount;

      if (recCount > 0) {
        indexedSources.push({
          sourceId: src.sourceId,
          sourceName: src.sourceName,
          domain: src.domain,
          status: 'INDEXED',
          records: recCount,
          chunks: chkCount
        });
      } else {
        unindexedSources.push({
          sourceId: src.sourceId,
          sourceName: src.sourceName,
          domain: src.domain,
          status: 'REGISTERED_NOT_INDEXED',
          reason: 'Source approved in registry; content awaits future ingestion bundle.'
        });
      }
    }

    // Domain breakdown
    const recordsPerDomain = {};
    const chunksPerDomain = {};
    for (const domain of ALLOWED_DOMAINS) {
      recordsPerDomain[domain] = this.getRecordsByDomain(domain).length;
      chunksPerDomain[domain] = this.getChunksByDomain(domain).length;
    }

    // Missing metadata audit
    let missingReferencesCount = 0;
    let unverifiedRecordsCount = 0;
    for (const record of this._records.values()) {
      const ref = record.reference || {};
      const hasAnyRef = Object.values(ref).some(v => v !== null && v !== undefined);
      if (!hasAnyRef) missingReferencesCount++;

      if (record.verification?.status !== VERIFICATION_STATUSES.VERIFIED) {
        unverifiedRecordsCount++;
      }
    }

    const integrity = this.validateIntegrity();

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalRegisteredSources: registeredCount,
        totalIndexedSources: indexedSources.length,
        totalUnindexedSources: unindexedSources.length,
        totalRecords: this.recordCount,
        totalChunks: this.chunkCount,
        rejectedDuplicates: this.stats.duplicatesRejected,
        repositoryHealthy: integrity.isHealthy
      },
      domains: {
        recordsPerDomain,
        chunksPerDomain
      },
      sources: {
        indexed: indexedSources,
        unindexed: unindexedSources,
        recordsPerSource,
        chunksPerSource
      },
      qualityMetrics: {
        missingReferencesCount,
        unverifiedRecordsCount,
        brokenProvenanceChains: integrity.issues.length
      },
      integrityIssues: integrity.issues
    };
  }

  // ==========================================
  // DISK PERSISTENCE ABSTRACTION
  // ==========================================

  /**
   * Persists the repository state to a local directory structure
   * @param {string} baseDir Base directory (defaults to data/knowledge)
   */
  saveToDisk(baseDir = 'data/knowledge') {
    const sourcesDir = path.join(baseDir, 'sources');
    const normalizedDir = path.join(baseDir, 'normalized');
    const chunksDir = path.join(baseDir, 'chunks');

    fs.mkdirSync(sourcesDir, { recursive: true });
    fs.mkdirSync(normalizedDir, { recursive: true });
    fs.mkdirSync(chunksDir, { recursive: true });

    // 1. Save sources
    const sourcesData = this.getSources();
    fs.writeFileSync(path.join(sourcesDir, 'registered_sources.json'), JSON.stringify(sourcesData, null, 2), 'utf8');

    // 2. Save records
    const recordsData = Array.from(this._records.values());
    fs.writeFileSync(path.join(normalizedDir, 'knowledge_records.json'), JSON.stringify(recordsData, null, 2), 'utf8');

    // 3. Save chunks
    const chunksData = Array.from(this._chunks.values());
    fs.writeFileSync(path.join(chunksDir, 'knowledge_chunks.json'), JSON.stringify(chunksData, null, 2), 'utf8');

    // 4. Save coverage report
    const reportData = this.getCoverageReport();
    fs.writeFileSync(path.join(baseDir, 'coverage_report.json'), JSON.stringify(reportData, null, 2), 'utf8');
  }

  /**
   * Loads repository state from a local directory structure
   * @param {string} baseDir Base directory (defaults to data/knowledge)
   */
  loadFromDisk(baseDir = 'data/knowledge') {
    const sourcesPath = path.join(baseDir, 'sources', 'registered_sources.json');
    const recordsPath = path.join(baseDir, 'normalized', 'knowledge_records.json');
    const chunksPath = path.join(baseDir, 'chunks', 'knowledge_chunks.json');

    if (fs.existsSync(sourcesPath)) {
      const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
      for (const s of sources) {
        if (!this.getSource(s.sourceId)) {
          this.registerSource(s);
        }
      }
    }

    if (fs.existsSync(recordsPath)) {
      const records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
      for (const r of records) {
        this.addRecord(r, { autoChunk: false });
      }
    }

    if (fs.existsSync(chunksPath)) {
      const chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf8'));
      for (const c of chunks) {
        if (!this.getChunk(c.chunkId)) {
          this.addChunk(c);
        }
      }
    }
  }

  /**
   * Clears in-memory records and chunks (retains source registry)
   */
  clear() {
    this._records.clear();
    this._chunks.clear();
    this._recordsBySource.clear();
    this._recordsByDomain.clear();
    this._chunksBySource.clear();
    this._chunksByDomain.clear();
    this._chunksByRecord.clear();
    this.deduplicator.reset();
    this.stats = { duplicatesRejected: 0, recordsIngested: 0, chunksIngested: 0 };

    for (const domain of ALLOWED_DOMAINS) {
      this._recordsByDomain.set(domain, new Set());
      this._chunksByDomain.set(domain, new Set());
    }
  }
}

// Default singleton repository
export const defaultTrustedSourceRepository = new TrustedSourceRepository({
  sourceRegistry: defaultSourceRegistry
});

export default TrustedSourceRepository;
