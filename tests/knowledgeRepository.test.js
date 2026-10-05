/**
 * Comprehensive Test Suite for Mishkat Phase 3 — Trusted Knowledge Repository
 * 
 * Tests all 17 requirements of Section 19:
 *  1. Approved source registration
 *  2. Rejection of unapproved source
 *  3. Duplicate source IDs
 *  4. Normalized record creation
 *  5. Missing-source rejection
 *  6. Quran metadata validation
 *  7. Hadith metadata preservation
 *  8. Semantic chunk boundaries
 *  9. Deterministic content hashes
 * 10. Duplicate detection
 * 11. Source provenance
 * 12. Orphan chunk rejection
 * 13. Coverage report accuracy
 * 14. Empty source handling
 * 15. Null metadata preservation
 * 16. No fabricated metadata
 * 17. Separation of source text from AI metadata
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import {
  TrustedSourceRepository,
  SourceRegistry,
  KNOWLEDGE_DOMAINS,
  SOURCE_TYPES,
  AUTHORITY_LEVELS,
  PROVENANCE_ORIGIN,
  normalizeKnowledgeText,
  computeContentHash,
  chunkKnowledgeRecord,
  validateKnowledgeRecord,
  validateKnowledgeChunk,
  JsonSourceAdapter,
  TextDocumentAdapter
} from '../src/mishkat/knowledge/index.js';

import { SYNTHETIC_TEST_FIXTURES } from './fixtures/syntheticKnowledgeFixtures.js';

describe('Mishkat Phase 3: Trusted Knowledge Repository Suite', () => {
  let repo;
  let registry;

  beforeEach(() => {
    registry = new SourceRegistry();
    repo = new TrustedSourceRepository({ sourceRegistry: registry });
  });

  // 1. Approved source registration
  it('1. should successfully register an approved official source', () => {
    const customSource = {
      sourceId: 'src_custom_approved_test',
      sourceName: 'مصدر تجريبي معتمد',
      sourceUrl: 'https://example.com/source',
      provider: 'هيئة موثوقة',
      domain: KNOWLEDGE_DOMAINS.FIQH,
      sourceType: SOURCE_TYPES.BOOK,
      approved: true,
      authorityLevel: AUTHORITY_LEVELS.APPROVED_REFERENCE
    };

    const registered = repo.registerSource(customSource);
    assert.equal(registered.sourceId, 'src_custom_approved_test');
    assert.equal(repo.getSource('src_custom_approved_test').approved, true);
  });

  // 2. Rejection of unapproved source
  it('2. should strictly reject sources where approved !== true', () => {
    const unapprovedSource = {
      sourceId: 'src_unapproved_blog',
      sourceName: 'مدونة غير موثقة',
      domain: KNOWLEDGE_DOMAINS.DAWAH,
      sourceType: SOURCE_TYPES.WEBSITE,
      approved: false, // NOT APPROVED
      authorityLevel: AUTHORITY_LEVELS.SUPPORTING
    };

    assert.throws(() => {
      repo.registerSource(unapprovedSource);
    }, /UNAPPROVED_SOURCE/);
  });

  // 3. Duplicate source IDs
  it('3. should reject duplicate source IDs', () => {
    const dupSource = {
      sourceId: 'src_quran_king_fahd', // Already registered in official list
      sourceName: 'نسخة مكررة',
      domain: KNOWLEDGE_DOMAINS.QURAN,
      sourceType: SOURCE_TYPES.BOOK,
      approved: true,
      authorityLevel: AUTHORITY_LEVELS.PRIMARY
    };

    assert.throws(() => {
      repo.registerSource(dupSource);
    }, /DUPLICATE_SOURCE_ID/);
  });

  // 4. Normalized record creation
  it('4. should create canonical normalized records with preserved Arabic marks and hash', () => {
    const { record, chunks } = repo.addRecord(SYNTHETIC_TEST_FIXTURES.validQuranRecord);

    assert.equal(record.recordId, 'synth_quran_112_1');
    assert.equal(record.domain, KNOWLEDGE_DOMAINS.QURAN);
    // Tashkeel must be completely preserved for Quran
    assert.equal(record.text, 'قُلْ هُوَ اللَّهُ أَحَدٌ');
    assert.ok(record.contentHash);
    assert.equal(record.contentHash.length, 64);
    assert.ok(chunks.length > 0);
  });

  // 5. Missing-source rejection
  it('5. should reject records referencing unregistered or missing sources', () => {
    const orphanRecord = {
      recordId: 'rec_orphan_test',
      sourceId: 'src_non_existent_fake_source',
      domain: KNOWLEDGE_DOMAINS.HADITH,
      text: 'متن تجريبي لمصدر غير موجود',
      reference: {}
    };

    assert.throws(() => {
      repo.addRecord(orphanRecord);
    }, /RECORD_VALIDATION_ERROR/);
  });

  // 6. Quran metadata validation
  it('6. should validate that QURAN records mandate surahNumber (1-114) and ayahNumber', () => {
    assert.throws(() => {
      repo.addRecord(SYNTHETIC_TEST_FIXTURES.invalidQuranRecord);
    }, /QURAN records must specify a valid surahNumber/);
  });

  // 7. Hadith metadata preservation
  it('7. should preserve explicit Hadith grading, narrator, and book without alteration', () => {
    const { record } = repo.addRecord(SYNTHETIC_TEST_FIXTURES.validHadithRecord);

    assert.equal(record.domain, KNOWLEDGE_DOMAINS.HADITH);
    assert.equal(record.reference.hadithNumber, 1);
    assert.equal(record.reference.book, 'صحيح البخاري');
    assert.equal(record.attribution.narrator, 'عمر بن الخطاب رضي الله عنه');
    assert.equal(record.verification.grading, 'صحيح متفق عليه');
    assert.equal(record.verification.gradingAuthority, 'أئمة الحديث بالإجماع');
  });

  // 8. Semantic chunk boundaries
  it('8. should enforce semantic document boundaries and not cut verses or hadiths', () => {
    const quranChunks = chunkKnowledgeRecord(SYNTHETIC_TEST_FIXTURES.validQuranRecord);
    assert.equal(quranChunks.length, 1);
    assert.equal(quranChunks[0].text, 'قُلْ هُوَ اللَّهُ أَحَدٌ');

    const hadithChunks = chunkKnowledgeRecord(SYNTHETIC_TEST_FIXTURES.validHadithRecord);
    assert.equal(hadithChunks.length, 1);
    assert.ok(hadithChunks[0].text.includes('إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ'));
  });

  // 9. Deterministic content hashes
  it('9. should produce identical deterministic SHA-256 hashes for identical text and reference', () => {
    const hash1 = computeContentHash('قُلْ هُوَ اللَّهُ أَحَدٌ', { surahNumber: 112, ayahNumber: 1 });
    const hash2 = computeContentHash('قُلْ هُوَ اللَّهُ أَحَدٌ', { surahNumber: 112, ayahNumber: 1 });
    const hashDifferentRef = computeContentHash('قُلْ هُوَ اللَّهُ أَحَدٌ', { surahNumber: 112, ayahNumber: 2 });

    assert.equal(hash1, hash2);
    assert.notEqual(hash1, hashDifferentRef);
  });

  // 10. Duplicate detection
  it('10. should detect and reject identical duplicate records under the same source', () => {
    const res1 = repo.addRecord(SYNTHETIC_TEST_FIXTURES.validTerminologyRecord);
    assert.equal(res1.isDuplicate, false);
    assert.equal(repo.recordCount, 1);

    // Try adding the identical record again
    const res2 = repo.addRecord(SYNTHETIC_TEST_FIXTURES.validTerminologyRecord);
    assert.equal(res2.isDuplicate, true);
    assert.equal(repo.recordCount, 1); // Record count must NOT increase
    assert.equal(repo.stats.duplicatesRejected, 1);
  });

  // 11. Source provenance
  it('11. should preserve complete provenance chain: Chunk -> Knowledge Record -> Registered Source', () => {
    const { record, chunks } = repo.addRecord(SYNTHETIC_TEST_FIXTURES.validFiqhRecord);
    const chunk = chunks[0];

    // Verify Chunk -> Record link
    assert.equal(chunk.recordId, record.recordId);
    const retrievedRecord = repo.getRecord(chunk.recordId);
    assert.ok(retrievedRecord);

    // Verify Record -> Source link
    assert.equal(retrievedRecord.sourceId, record.sourceId);
    const retrievedSource = repo.getSource(retrievedRecord.sourceId);
    assert.ok(retrievedSource);
    assert.equal(retrievedSource.sourceId, 'src_fiqh_dorar');
    assert.equal(retrievedSource.approved, true);
  });

  // 12. Orphan chunk rejection
  it('12. should reject orphan chunks whose parent recordId does not exist', () => {
    const orphanChunk = {
      chunkId: 'chk_orphan_999',
      recordId: 'rec_ghost_non_existent',
      sourceId: 'src_quran_king_fahd',
      domain: KNOWLEDGE_DOMAINS.QURAN,
      text: 'آية يتيمة بدون سجل أصل',
      contentHash: computeContentHash('آية يتيمة بدون سجل أصل')
    };

    assert.throws(() => {
      repo.addChunk(orphanChunk);
    }, /ORPHAN_CHUNK/);
  });

  // 13. Coverage report accuracy
  it('13. should produce an accurate coverage report distinguishing REGISTERED from INDEXED', () => {
    repo.addRecord(SYNTHETIC_TEST_FIXTURES.validQuranRecord);
    repo.addRecord(SYNTHETIC_TEST_FIXTURES.validHadithRecord);

    const report = repo.getCoverageReport();

    assert.equal(report.summary.totalRecords, 2);
    assert.equal(report.summary.totalIndexedSources, 2);
    // Unindexed sources must be accurately reported without pretending they are indexed
    assert.equal(report.summary.totalUnindexedSources, report.summary.totalRegisteredSources - 2);
    assert.equal(report.domains.recordsPerDomain[KNOWLEDGE_DOMAINS.QURAN], 1);
    assert.equal(report.domains.recordsPerDomain[KNOWLEDGE_DOMAINS.HADITH], 1);
    assert.equal(report.domains.recordsPerDomain[KNOWLEDGE_DOMAINS.FIQH], 0);
    assert.equal(report.summary.repositoryHealthy, true);
  });

  // 14. Empty source handling
  it('14. should safely return empty arrays and 0 counts for registered sources with 0 indexed records', () => {
    const dorarHistoryRecords = repo.getRecordsBySource('src_history_dorar');
    const dorarHistoryChunks = repo.getChunksBySource('src_history_dorar');

    assert.deepEqual(dorarHistoryRecords, []);
    assert.deepEqual(dorarHistoryChunks, []);
  });

  // 15. Null metadata preservation
  it('15. should preserve null metadata explicitly without guessing or fabricating fields', () => {
    const recordWithNulls = {
      recordId: 'synth_null_meta_test',
      sourceId: 'src_dawah_center',
      domain: KNOWLEDGE_DOMAINS.DAWAH,
      title: 'مقال دعوي عام',
      text: 'نص المقال الدعوي العام للتأكد من عدم اختلاق بيانات وصفية غير موجودة.',
      reference: {
        book: null,
        volume: null,
        page: null,
        chapter: null,
        hadithNumber: null,
        surahNumber: null,
        ayahNumber: null
      },
      attribution: {
        author: null,
        scholar: null,
        narrator: null
      },
      verification: {
        status: 'SOURCE_PROVIDED',
        grading: null,
        gradingAuthority: null
      }
    };

    const { record } = repo.addRecord(recordWithNulls);
    assert.equal(record.reference.volume, null);
    assert.equal(record.reference.hadithNumber, null);
    assert.equal(record.attribution.narrator, null);
    assert.equal(record.verification.grading, null);
  });

  // 16. No fabricated metadata
  it('16. should never invent or guess missing scholar attribution or hadith grading', () => {
    const rawData = {
      recordId: 'synth_hadith_unverified_test',
      sourceId: 'src_hadith_dorar',
      domain: KNOWLEDGE_DOMAINS.HADITH,
      text: 'حديث تجريبي بدون حكم مسجل في المصدر.',
      reference: { hadithNumber: 500 },
      attribution: {},
      verification: { status: 'SOURCE_PROVIDED', grading: null, gradingAuthority: null }
    };

    const { record } = repo.addRecord(rawData);
    // Must remain strictly null, never auto-populated as SAHIH or assigned a random scholar
    assert.equal(record.verification.grading, null);
    assert.equal(record.verification.gradingAuthority, null);
  });

  // 17. Separation of source text from AI metadata
  it('17. should strictly separate authentic SOURCE_TEXT from AI_GENERATED_METADATA', () => {
    const recordWithAiTags = {
      ...SYNTHETIC_TEST_FIXTURES.validMisconceptionRecord,
      recordId: 'synth_misc_ai_tag_test',
      provenance: {
        origin: PROVENANCE_ORIGIN.SOURCE_TEXT,
        aiMetadata: {
          suggestedTopics: ['حرية العقيدة', 'دفع الشبهات المعاصرة'],
          suggestedByModel: 'gemini-flash-lite-latest',
          tagOrigin: PROVENANCE_ORIGIN.AI_GENERATED_METADATA
        }
      }
    };

    const { record } = repo.addRecord(recordWithAiTags);
    // Source text must be SOURCE_TEXT
    assert.equal(record.provenance.origin, PROVENANCE_ORIGIN.SOURCE_TEXT);
    // AI tags must be partitioned under aiMetadata and clearly marked
    assert.equal(record.provenance.aiMetadata.tagOrigin, PROVENANCE_ORIGIN.AI_GENERATED_METADATA);
    assert.deepEqual(record.provenance.aiMetadata.suggestedTopics, ['حرية العقيدة', 'دفع الشبهات المعاصرة']);
  });

  // Adapter Ingestion Tests
  it('18. should ingest records correctly via JsonSourceAdapter', async () => {
    const adapter = new JsonSourceAdapter('src_terminology_jamhara', {
      defaultDomain: KNOWLEDGE_DOMAINS.TERMINOLOGY
    });

    const records = await adapter.ingest([
      {
        title: 'الإحسان',
        text: 'الإحسان: أن تعبد الله كأنك تراه فإن لم تكن تراه فإنه يراك.',
        topics: ['الإحسان', 'مراتب الدين']
      }
    ]);

    assert.equal(records.length, 1);
    assert.equal(records[0].sourceId, 'src_terminology_jamhara');
    assert.equal(records[0].domain, KNOWLEDGE_DOMAINS.TERMINOLOGY);

    const { record } = repo.addRecord(records[0]);
    assert.equal(record.title, 'الإحسان');
  });

  it('19. should ingest structured markdown via TextDocumentAdapter', async () => {
    const adapter = new TextDocumentAdapter('src_misconceptions_bayyinat', {
      defaultDomain: KNOWLEDGE_DOMAINS.MISCONCEPTIONS,
      author: 'مركز دعوة'
    });

    const markdownDoc = `
# الشبهة الأولى: الزعم بأن الدين يعارض العقل
بيان البرهان: القرآن الكريم مليء بالحث على التعقل والتدبر.

# الشبهة الثانية: شبهة الجزية في الإسلام
بيان البرهان: الجزية بدل الخدمة العسكرية وحماية غير المسلمين في الدولة.
`;

    const records = await adapter.ingest(markdownDoc);
    assert.equal(records.length, 2);
    assert.equal(records[0].sourceId, 'src_misconceptions_bayyinat');
    assert.equal(records[0].title, 'الشبهة الأولى: الزعم بأن الدين يعارض العقل');
    assert.equal(records[1].title, 'الشبهة الثانية: شبهة الجزية في الإسلام');

    repo.addRecords(records);
    assert.equal(repo.recordCount, 2);
    assert.equal(repo.getRecordsByDomain(KNOWLEDGE_DOMAINS.MISCONCEPTIONS).length, 2);
  });

  // Secondary indexing tests
  it('20. should support fast secondary queries by source, domain, and record', () => {
    repo.addRecord(SYNTHETIC_TEST_FIXTURES.validQuranRecord);
    repo.addRecord(SYNTHETIC_TEST_FIXTURES.validHadithRecord);
    repo.addRecord(SYNTHETIC_TEST_FIXTURES.validFiqhRecord);

    const quranRecords = repo.getRecordsByDomain(KNOWLEDGE_DOMAINS.QURAN);
    assert.equal(quranRecords.length, 1);

    const bukhariChunks = repo.getChunksBySource('src_hadith_bukhari');
    assert.equal(bukhariChunks.length, 1);

    const fiqhRecordChunks = repo.getChunksByRecord('synth_fiqh_sujood_sahw');
    assert.ok(fiqhRecordChunks.length > 0);
  });

  // Disk persistence tests
  it('21. should save and load repository state to local disk storage structure', () => {
    const testDir = path.resolve('data/test_knowledge');

    repo.addRecord(SYNTHETIC_TEST_FIXTURES.validQuranRecord);
    repo.saveToDisk(testDir);

    assert.ok(fs.existsSync(path.join(testDir, 'sources', 'registered_sources.json')));
    assert.ok(fs.existsSync(path.join(testDir, 'normalized', 'knowledge_records.json')));
    assert.ok(fs.existsSync(path.join(testDir, 'chunks', 'knowledge_chunks.json')));

    const newRepo = new TrustedSourceRepository();
    newRepo.loadFromDisk(testDir);

    assert.equal(newRepo.recordCount, 1);
    assert.equal(newRepo.chunkCount, 1);
    assert.equal(newRepo.getRecord('synth_quran_112_1').title, 'سورة الإخلاص - آية 1');

    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });
});
