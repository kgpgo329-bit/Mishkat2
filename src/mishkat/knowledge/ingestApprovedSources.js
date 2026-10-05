/**
 * Mishkat Approved Source Ingestion Pipeline
 * 
 * Orchestrates the full verified ingestion pipeline:
 * Approved Source
 *     ↓
 * Source Adapter
 *     ↓
 * Raw Source Record
 *     ↓
 * Conservative Normalization
 *     ↓
 * Source Validation
 *     ↓
 * KnowledgeRecord
 *     ↓
 * Semantic Chunking
 *     ↓
 * KnowledgeChunk
 *     ↓
 * Deduplication
 *     ↓
 * Integrity Validation
 *     ↓
 * TrustedSourceRepository & Disk Persistence
 */

import path from 'path';
import fs from 'fs';
import { defaultTrustedSourceRepository, TrustedSourceRepository } from './TrustedSourceRepository.js';
import { defaultSourceRegistry } from './sourceRegistry.js';
import {
  QuranSourceAdapter,
  HadithSourceAdapter,
  DorarSourceAdapter,
  BayyinatSourceAdapter,
  IslamicContentDictionaryAdapter,
  JsonSourceAdapter
} from './sourceAdapters/index.js';
import { KNOWLEDGE_DOMAINS } from './sourceTypes.js';

export async function runIngestionPipeline(options = {}) {
  const baseDataDir = options.baseDataDir || 'data/knowledge';
  const rawDir = path.join(baseDataDir, 'raw');
  const repo = options.repository || defaultTrustedSourceRepository;

  console.log('====================================================');
  console.log('MISHKAT — TRUSTED SOURCE INGESTION PIPELINE (PHASE 3B)');
  console.log('====================================================\n');

  // Verify raw directory
  if (!fs.existsSync(rawDir)) {
    throw new Error(`RAW_DIR_MISSING: Raw directory does not exist at ${rawDir}`);
  }

  const rawFiles = [
    {
      file: 'raw_quran_king_fahd.json',
      adapter: new QuranSourceAdapter('src_quran_king_fahd'),
      label: 'القرآن الكريم (مجمع الملك فهد لطباعة المصحف الشريف)'
    },
    {
      file: 'raw_hadith_bukhari_muslim.json',
      adapter: new HadithSourceAdapter('src_hadith_bukhari'),
      label: 'الحديث الشريف (صحيح البخاري، صحيح مسلم، الموسوعة الحديثية)'
    },
    {
      file: 'raw_misconceptions_bayyinat.json',
      adapter: new BayyinatSourceAdapter('src_misconceptions_bayyinat'),
      label: 'تفنيد الشبهات والتساؤلات (كتاب بيّنات - مركز دعوة)'
    },
    {
      file: 'raw_terminology_jamhara.json',
      adapter: new IslamicContentDictionaryAdapter('src_terminology_jamhara'),
      label: 'المصطلحات الإسلامية وترجماتها (معجم الجمهرة)'
    },
    {
      file: 'raw_fiqh_dorar.json',
      adapter: new DorarSourceAdapter('src_fiqh_dorar', { defaultDomain: KNOWLEDGE_DOMAINS.FIQH }),
      label: 'الفقه الإسلامي (الموسوعة الفقهية - الدرر السنية)'
    },
    {
      file: 'raw_history_dorar.json',
      adapter: new DorarSourceAdapter('src_history_dorar', { defaultDomain: KNOWLEDGE_DOMAINS.HISTORY }),
      label: 'التاريخ والسيرة النبوية (الموسوعة التاريخية - الدرر السنية)'
    },
    {
      file: 'raw_aqeedah_dorar.json',
      adapter: new DorarSourceAdapter('src_aqeedah_dorar', { defaultDomain: KNOWLEDGE_DOMAINS.AQEEDAH }),
      label: 'العقيدة الإسلامية (الموسوعة العقدية - الدرر السنية)'
    },
    {
      file: 'raw_tafsir_dorar.json',
      adapter: new DorarSourceAdapter('src_tafsir_dorar', { defaultDomain: KNOWLEDGE_DOMAINS.TAFSIR }),
      label: 'التفسير وعلوم القرآن (موسوعة التفسير - الدرر السنية)'
    },
    {
      file: 'raw_dawah_center.json',
      adapter: new JsonSourceAdapter('src_dawah_center', { defaultDomain: KNOWLEDGE_DOMAINS.DAWAH }),
      label: 'الدعوة والمنهج الإسلامي (بوابة مركز دعوة للبحوث والدراسات)'
    }
  ];

  let totalRawRecordsProcessed = 0;
  let totalNewRecordsIngested = 0;
  let totalChunksGenerated = 0;
  let totalDuplicatesDetected = 0;

  for (const bundle of rawFiles) {
    const fullPath = path.join(rawDir, bundle.file);
    if (!fs.existsSync(fullPath)) {
      console.log(`[!] Skipping ${bundle.file}: File not found.`);
      continue;
    }

    console.log(`Ingesting: ${bundle.label}...`);
    const records = await bundle.adapter.ingest(fullPath);
    totalRawRecordsProcessed += records.length;

    const result = repo.addRecords(records, { autoChunk: true });
    totalNewRecordsIngested += result.ingested;
    totalDuplicatesDetected += result.duplicates;
    totalChunksGenerated += result.chunksCreated;

    console.log(`   └─ Ingested: ${result.ingested} records | Generated: ${result.chunksCreated} chunks | Duplicates: ${result.duplicates}`);
  }

  // Persist to disk
  console.log('\nPersisting canonical repository state to disk...');
  repo.saveToDisk(baseDataDir);
  console.log(`Saved to ${baseDataDir}/ (normalized records, chunks, and coverage report).`);

  // Final Health & Integrity Audit
  const audit = repo.validateIntegrity();
  console.log(`\nRepository Integrity Audit: ${audit.isHealthy ? 'PASSED ✅' : 'FAILED ❌'}`);
  if (!audit.isHealthy) {
    console.error('Integrity Issues:', audit.issues);
  }

  const coverage = repo.getCoverageReport();
  console.log('\n--- INGESTION SUMMARY ---');
  console.log(`Total Registered Sources:   ${coverage.summary.totalRegisteredSources}`);
  console.log(`Actually Indexed Sources:   ${coverage.summary.totalIndexedSources}`);
  console.log(`Remaining Unindexed:        ${coverage.summary.totalUnindexedSources}`);
  console.log(`Total KnowledgeRecords:     ${coverage.summary.totalRecords}`);
  console.log(`Total KnowledgeChunks:      ${coverage.summary.totalChunks}`);
  console.log(`Duplicates Rejected:        ${coverage.summary.rejectedDuplicates}`);
  console.log('-------------------------\n');

  return {
    repo,
    coverage,
    audit,
    stats: {
      rawProcessed: totalRawRecordsProcessed,
      newIngested: totalNewRecordsIngested,
      chunksGenerated: totalChunksGenerated,
      duplicates: totalDuplicatesDetected
    }
  };
}

// Auto-run if executed directly via CLI
if (process.argv[1] && process.argv[1].endsWith('ingestApprovedSources.js')) {
  runIngestionPipeline().catch(err => {
    console.error('INGESTION_ERROR:', err);
    process.exit(1);
  });
}
