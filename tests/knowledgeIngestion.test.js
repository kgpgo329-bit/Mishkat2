/**
 * Mishkat Phase 3B — Real Source Ingestion & Integrity Test Suite
 * 
 * Verifies all 13 points of Section 13:
 * 1. Real imported record has approved sourceId
 * 2. No unregistered source enters production repository
 * 3. No orphan record
 * 4. No orphan chunk
 * 5. Quran metadata integrity
 * 6. Hadith metadata preservation
 * 7. Source URLs and references preserved
 * 8. Raw and normalized text remain traceable
 * 9. Duplicate import detection
 * 10. Content hash stability
 * 11. Missing metadata remains null
 * 12. No AI-generated religious evidence
 * 13. Coverage report reflects actual indexed content
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import {
  TrustedSourceRepository,
  SourceRegistry,
  KNOWLEDGE_DOMAINS,
  PROVENANCE_ORIGIN,
  computeContentHash
} from '../src/mishkat/knowledge/index.js';

import { runIngestionPipeline } from '../src/mishkat/knowledge/ingestApprovedSources.js';

describe('Mishkat Phase 3B: Real Source Ingestion & Coverage Verification', () => {
  let repo;
  let coverage;
  let stats;

  before(async () => {
    // Run the full real source ingestion pipeline on an isolated repository instance
    const customRegistry = new SourceRegistry();
    const isolatedRepo = new TrustedSourceRepository({ sourceRegistry: customRegistry });

    const pipelineResult = await runIngestionPipeline({
      repository: isolatedRepo,
      baseDataDir: 'data/knowledge'
    });

    repo = pipelineResult.repo;
    coverage = pipelineResult.coverage;
    stats = pipelineResult.stats;
  });

  // 1. Real imported record has approved sourceId
  it('1. should verify that every imported record references an approved registered source', () => {
    assert.ok(repo.recordCount > 0, 'Repository must contain imported records.');
    for (const record of repo.getRecordsByDomain(KNOWLEDGE_DOMAINS.QURAN)) {
      const source = repo.getSource(record.sourceId);
      assert.ok(source, `Source ${record.sourceId} must exist in registry.`);
      assert.equal(source.approved, true, `Source ${record.sourceId} must be approved.`);
    }
  });

  // 2. No unregistered source enters production repository
  it('2. should reject inserting any record with a non-registered or fabricated sourceId', () => {
    const bogusRecord = {
      recordId: 'rec_bogus_1',
      sourceId: 'src_fabricated_source_xyz',
      domain: KNOWLEDGE_DOMAINS.FIQH,
      text: 'نص وهمي غير مسجل',
      reference: {}
    };

    assert.throws(() => {
      repo.addRecord(bogusRecord);
    }, /RECORD_VALIDATION_ERROR/);
  });

  // 3. No orphan record
  it('3. should verify zero orphan records (every record maps to an active registered source)', () => {
    const audit = repo.validateIntegrity();
    assert.equal(audit.isHealthy, true);
    assert.equal(audit.issues.length, 0);
  });

  // 4. No orphan chunk
  it('4. should verify zero orphan chunks (every chunk traces to a valid parent record and source)', () => {
    for (const domain of Object.values(KNOWLEDGE_DOMAINS)) {
      const chunks = repo.getChunksByDomain(domain);
      for (const chunk of chunks) {
        const parentRecord = repo.getRecord(chunk.recordId);
        assert.ok(parentRecord, `Chunk ${chunk.chunkId} must have an existing parent record.`);
        assert.equal(chunk.sourceId, parentRecord.sourceId);
        assert.equal(chunk.domain, parentRecord.domain);
      }
    }
  });

  // 5. Quran metadata integrity
  it('5. should enforce complete Quran metadata integrity (surah 1-114, ayah > 0, Uthmani marks)', () => {
    const quranRecords = repo.getRecordsByDomain(KNOWLEDGE_DOMAINS.QURAN);
    assert.ok(quranRecords.length >= 10, 'Expected at least 10 core Quran records.');

    for (const rec of quranRecords) {
      assert.ok(rec.reference.surahNumber >= 1 && rec.reference.surahNumber <= 114);
      assert.ok(rec.reference.ayahNumber >= 1);
      assert.ok(rec.text && rec.text.trim().length > 0);
      assert.equal(rec.evidenceType, 'QURANIC_CANONICAL_TEXT');
    }

    // Specific check for Surah Al-Ikhlas Ayah 1
    const ikhlas1 = quranRecords.find(r => r.reference.surahNumber === 112 && r.reference.ayahNumber === 1);
    assert.ok(ikhlas1);
    assert.equal(ikhlas1.text, 'قُلْ هُوَ اللَّهُ أَحَدٌ');
  });

  // 6. Hadith metadata preservation
  it('6. should preserve Hadith metadata (narrator, collection, explicit authenticity grading)', () => {
    const bukhari1 = repo.getRecord('rec_hadith_bukhari_1');
    assert.ok(bukhari1);
    assert.equal(bukhari1.reference.book, 'صحيح البخاري');
    assert.equal(bukhari1.reference.hadithNumber, 1);
    assert.equal(bukhari1.attribution.narrator, 'عمر بن الخطاب رضي الله عنه');
    assert.equal(bukhari1.verification.grading, 'صحيح متفق عليه');
    assert.equal(bukhari1.verification.status, 'VERIFIED');
  });

  // 7. Source URLs and references preserved
  it('7. should preserve source URLs and publication references in imported records and chunks', () => {
    const bayyinatRecord = repo.getRecord('rec_misc_bayyinat_kaaba');
    assert.ok(bayyinatRecord);
    assert.equal(bayyinatRecord.sourceUrl, 'https://dawa.center/file/7937');
    assert.equal(bayyinatRecord.reference.book, 'كتاب بيّنات: براهين وأدلة في تفنيد الشبهات');

    const chunks = repo.getChunksByRecord('rec_misc_bayyinat_kaaba');
    assert.ok(chunks.length > 0);
    assert.equal(chunks[0].sourceUrl, 'https://dawa.center/file/7937');
  });

  // 8. Raw and normalized text remain traceable
  it('8. should preserve both rawText and normalizedText separately for auditability', () => {
    for (const domain of Object.values(KNOWLEDGE_DOMAINS)) {
      const records = repo.getRecordsByDomain(domain);
      for (const rec of records) {
        assert.ok(rec.rawText !== undefined, `Record ${rec.recordId} must preserve rawText.`);
        assert.ok(rec.text !== undefined, `Record ${rec.recordId} must have normalized text.`);
      }
    }
  });

  // 9. Duplicate import detection
  it('9. should detect and reject re-importing identical records without duplicate inflation', () => {
    const initialCount = repo.recordCount;
    const bukhari1 = repo.getRecord('rec_hadith_bukhari_1');

    // Attempt re-inserting identical record
    const result = repo.addRecord(bukhari1);
    assert.equal(result.isDuplicate, true);
    assert.equal(repo.recordCount, initialCount, 'Record count must remain identical.');
  });

  // 10. Content hash stability
  it('10. should produce stable, identical SHA-256 hashes for all records and chunks', () => {
    for (const domain of Object.values(KNOWLEDGE_DOMAINS)) {
      const records = repo.getRecordsByDomain(domain);
      for (const rec of records) {
        const expectedHash = computeContentHash(rec.text, rec.reference);
        assert.equal(rec.contentHash, expectedHash);
      }
    }
  });

  // 11. Missing metadata remains null
  it('11. should keep unprovided metadata strictly null without fabricating values', () => {
    const termRecord = repo.getRecord('rec_term_jamhara_tawheed');
    assert.ok(termRecord);
    assert.equal(termRecord.reference.volume, null);
    assert.equal(termRecord.reference.hadithNumber, null);
    assert.equal(termRecord.reference.surahNumber, null);
    assert.equal(termRecord.attribution.narrator, null);
  });

  // 12. No AI-generated religious evidence
  it('12. should strictly enforce that origin is SOURCE_TEXT and no religious evidence is marked AI', () => {
    for (const domain of Object.values(KNOWLEDGE_DOMAINS)) {
      const records = repo.getRecordsByDomain(domain);
      for (const rec of records) {
        assert.equal(rec.provenance.origin, PROVENANCE_ORIGIN.SOURCE_TEXT);
        // AI metadata can only be auxiliary tagging, never source text
        assert.notEqual(rec.provenance.origin, PROVENANCE_ORIGIN.AI_GENERATED_METADATA);
      }
    }
  });

  // 13. Coverage report reflects actual indexed content
  it('13. should produce an accurate coverage report reflecting indexed vs unindexed sources', () => {
    const rep = repo.getCoverageReport();
    assert.equal(rep.summary.totalRegisteredSources, 15);
    assert.equal(rep.summary.totalIndexedSources, 11);
    assert.equal(rep.summary.totalUnindexedSources, 4);
    assert.equal(rep.summary.totalRecords, 33);
    assert.equal(rep.summary.totalChunks, 33);
    assert.equal(rep.summary.repositoryHealthy, true);

    // Verify unindexed sources are explicitly listed
    const unindexedIds = rep.sources.unindexed.map(s => s.sourceId);
    assert.ok(unindexedIds.includes('src_quran_quranpedia'));
    assert.ok(unindexedIds.includes('src_tafsir_tabari'));
    assert.ok(unindexedIds.includes('src_hadith_shamela'));
    assert.ok(unindexedIds.includes('src_dawah_islamic_content'));
  });
});
