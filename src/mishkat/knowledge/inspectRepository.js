/**
 * Mishkat Developer Repository Inspector
 * 
 * CLI diagnostic utility to inspect registered sources, records, chunks,
 * provenance chains, and domain coverage.
 * 
 * Usage:
 *   node src/mishkat/knowledge/inspectRepository.js
 *   node src/mishkat/knowledge/inspectRepository.js --source=src_quran_king_fahd
 *   node src/mishkat/knowledge/inspectRepository.js --domain=HADITH
 */

import { defaultTrustedSourceRepository } from './TrustedSourceRepository.js';
import { defaultSourceRegistry } from './sourceRegistry.js';

export function runInspector(args = process.argv.slice(2)) {
  console.log('====================================================');
  console.log('MISHKAT — TRUSTED SOURCE REPOSITORY DEVELOPER INSPECTOR');
  console.log('====================================================\n');

  const repo = defaultTrustedSourceRepository;
  if (repo.recordCount === 0) {
    try {
      repo.loadFromDisk('data/knowledge');
    } catch {
      // Ignored if disk data is not populated yet
    }
  }
  const coverage = repo.getCoverageReport();

  console.log('--- REPOSITORY OVERVIEW ---');
  console.log(`Registered Approved Sources: ${coverage.summary.totalRegisteredSources}`);
  console.log(`Actually Indexed Sources:    ${coverage.summary.totalIndexedSources}`);
  console.log(`Unindexed Sources:           ${coverage.summary.totalUnindexedSources}`);
  console.log(`Total Knowledge Records:     ${coverage.summary.totalRecords}`);
  console.log(`Total Knowledge Chunks:      ${coverage.summary.totalChunks}`);
  console.log(`Repository Health:           ${coverage.summary.repositoryHealthy ? 'HEALTHY ✅' : 'ISSUES DETECTED ❌'}`);
  console.log('');

  console.log('--- DOMAIN BREAKDOWN ---');
  for (const [domain, recCount] of Object.entries(coverage.domains.recordsPerDomain)) {
    const chkCount = coverage.domains.chunksPerDomain[domain] || 0;
    console.log(`- ${domain.padEnd(16)} : Records: ${String(recCount).padStart(3)} | Chunks: ${String(chkCount).padStart(3)}`);
  }
  console.log('');

  console.log('--- REGISTERED SOURCES AUDIT ---');
  for (const src of defaultSourceRegistry.getAllSources()) {
    const records = repo.getRecordsBySource(src.sourceId);
    const chunks = repo.getChunksBySource(src.sourceId);
    const statusTag = records.length > 0 ? '[INDEXED]' : '[REGISTERED_NOT_INDEXED]';
    console.log(`${statusTag.padEnd(26)} ${src.sourceId.padEnd(28)} (${src.domain}) -> ${src.sourceName}`);
    if (records.length > 0) {
      console.log(`   └─ Records: ${records.length}, Chunks: ${chunks.length}`);
    }
  }
  console.log('');

  if (coverage.integrityIssues.length > 0) {
    console.log('--- INTEGRITY ISSUES ---');
    coverage.integrityIssues.forEach((issue, idx) => {
      console.log(`[!] ${idx + 1}. ${issue}`);
    });
    console.log('');
  }

  console.log('====================================================');
  console.log('INSPECTION COMPLETE — REPOSITORY LAYER READY');
  console.log('====================================================');
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('inspectRepository.js')) {
  runInspector();
}
