/**
 * Mishkat Phase 4 — Hybrid Retrieval Development Test Suite
 * 
 * Verifies core retrieval mechanics:
 * 1. Claims-first query generation
 * 2. Arabic BM25 lexical retriever
 * 3. Semantic retriever & embedding provider abstraction
 * 4. Reciprocal Rank Fusion (RRF)
 * 5. Metadata filtering & domain boosting
 * 6. Candidate ranker & top-K slicing
 * 7. Zero-result thresholding on irrelevant queries
 * 8. Complete provenance preservation
 * 9. Deduplication by chunkId
 * 10. Canonical retrieveForInterpretation pipeline
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

import {
  RetrievalService,
  retrieveForInterpretation,
  buildClaimRetrievalQueries,
  LexicalRetriever,
  SemanticRetriever,
  CandidateFusion,
  CandidateRanker,
  getEmbeddingProvider,
  EMBEDDING_PROVIDER_TYPES,
  normalizeSearchText
} from '../src/mishkat/retrieval/index.js';

import { defaultTrustedSourceRepository } from '../src/mishkat/knowledge/index.js';

describe('Mishkat Phase 4: Hybrid Retrieval Development Suite', () => {
  let repo;
  let service;
  let allChunks;

  before(async () => {
    repo = defaultTrustedSourceRepository;
    if (repo.chunkCount === 0) {
      repo.loadFromDisk('data/knowledge');
    }
    allChunks = Array.from(repo._chunks.values());

    service = new RetrievalService({
      embeddingProvider: 'test'
    });
    await service.initializeWithRepository(repo);
  });

  // 1. Claims-first query construction
  it('1. should build an independent retrieval query for each claim in interpretation', () => {
    const interpretation = {
      originalQuestion: 'ما الفرق بين التوكل والتواكل وما حكم كل منهما؟',
      task: 'COMPARE',
      topic: 'الأعمال القلبية والأخلاق',
      subtopics: ['التوكل', 'التواكل', 'الأخذ بالأسباب'],
      userGoal: 'المقارنة الدقيقة بين التوكل والتواكل وبيان الحكم',
      claimsToResolve: [
        {
          claimId: 'claim_1',
          statement: 'التوكل فريضة شرعية تجمع بين الاعتماد على الله والأخذ بالأسباب',
          importance: 'CORE',
          requiredEvidenceType: 'TEXTUAL_EVIDENCE'
        },
        {
          claimId: 'claim_2',
          statement: 'التواكل مذموم شرعاً ويعني ترك الأسباب اتكالاً على القدر',
          importance: 'CORE',
          requiredEvidenceType: 'TEXTUAL_EVIDENCE'
        }
      ],
      requestedEvidence: ['TEXTUAL_EVIDENCE']
    };

    const queries = buildClaimRetrievalQueries(interpretation);
    assert.equal(queries.length, 2);
    assert.equal(queries[0].claimId, 'claim_1');
    assert.equal(queries[1].claimId, 'claim_2');
    assert.equal(queries[0].task, 'COMPARE');
    assert.ok(queries[0].searchTokens.length > 0);
  });

  // 2. Search normalization preserves pristine text
  it('2. should normalize search text without mutating canonical source text', () => {
    const canonicalText = 'قُلْ هُوَ اللَّهُ أَحَدٌ';
    const normalized = normalizeSearchText(canonicalText);
    assert.equal(normalized, 'قل هو الله احد');
    // Ensure original text is unchanged
    assert.equal(canonicalText, 'قُلْ هُوَ اللَّهُ أَحَدٌ');
  });

  // 3. BM25 Lexical Retrieval
  it('3. should perform Arabic BM25 search and rank exact keyword matches at the top', () => {
    const lexical = new LexicalRetriever(allChunks);
    const query = {
      claimId: 'c_test',
      claimText: 'تحريم الربا والبيع',
      searchTokens: ['تحريم', 'الربا', 'البيع']
    };

    const candidates = lexical.search(query, { candidatePoolSize: 5 });
    assert.ok(candidates.length > 0);
    assert.ok(candidates[0].lexicalScore > 0);
    assert.equal(candidates[0].lexicalRank, 1);
    // Chunk for Riba should be top
    assert.equal(candidates[0].chunk.chunkId, 'rec_quran_2_275_chk_0');
  });

  // 4. Semantic Retriever & Embedding Provider Abstraction
  it('4. should use test embedding provider deterministically without network calls', async () => {
    const provider = getEmbeddingProvider({ embeddingProvider: 'test' });
    assert.equal(provider.providerType, EMBEDDING_PROVIDER_TYPES.TEST_EMBEDDING);

    const vec1 = await provider.embedText('التوحيد والإخلاص لله تعالى');
    const vec2 = await provider.embedText('التوحيد والإخلاص لله تعالى');
    assert.deepEqual(vec1, vec2, 'Embeddings must be strictly deterministic.');

    const semantic = new SemanticRetriever(allChunks, { provider });
    const query = {
      compositeSearchText: 'إفراد الله بالعبادة وتوحيد الألوهية'
    };
    const candidates = await semantic.search(query, { candidatePoolSize: 5 });
    assert.ok(candidates.length > 0);
    assert.ok(candidates[0].semanticScore > 0);
    assert.equal(candidates[0].semanticRank, 1);
  });

  // 5. Candidate Fusion via RRF
  it('5. should fuse lexical and semantic rankings using Reciprocal Rank Fusion (RRF)', () => {
    const fusion = new CandidateFusion({ rrfK: 60 });
    const chunkA = allChunks[0];
    const chunkB = allChunks[1];

    const lexicalCandidates = [
      { chunk: chunkA, lexicalScore: 8.5, lexicalRank: 1 },
      { chunk: chunkB, lexicalScore: 4.2, lexicalRank: 2 }
    ];

    const semanticCandidates = [
      { chunk: chunkA, semanticScore: 0.88, semanticRank: 1 },
      { chunk: chunkB, semanticScore: 0.65, semanticRank: 2 }
    ];

    const query = {
      claimId: 'claim_fuse_test',
      preferredDomains: [chunkA.domain]
    };

    const fused = fusion.fuse({ lexicalCandidates, semanticCandidates, query });
    assert.equal(fused.length, 2);
    assert.equal(fused[0].chunkId, chunkA.chunkId);
    assert.equal(fused[0].finalRank, 1);
    assert.ok(fused[0].scores.fusionScore > 0);
    assert.ok(fused[0].scores.finalScore >= fused[0].scores.fusionScore);
  });

  // 6. Metadata Boosting
  it('6. should boost chunks matching preferred domain and evidence type', () => {
    const fusion = new CandidateFusion({ rrfK: 60 });
    const quranChunk = allChunks.find(c => c.domain === 'QURAN');
    const fiqhChunk = allChunks.find(c => c.domain === 'FIQH');

    const lexicalCandidates = [
      { chunk: fiqhChunk, lexicalScore: 5.0, lexicalRank: 1 },
      { chunk: quranChunk, lexicalScore: 5.0, lexicalRank: 2 }
    ];

    const semanticCandidates = [
      { chunk: fiqhChunk, semanticScore: 0.70, semanticRank: 1 },
      { chunk: quranChunk, semanticScore: 0.70, semanticRank: 2 }
    ];

    // Query specifically prefers QURAN domain
    const query = {
      claimId: 'claim_boost_test',
      task: 'VERIFY_QURAN',
      requestedEvidence: 'QURANIC_CANONICAL_TEXT',
      preferredDomains: ['QURAN']
    };

    const fused = fusion.fuse({ lexicalCandidates, semanticCandidates, query });
    // Quran chunk gets boosted and should rank ahead or receive significant boost
    const quranCand = fused.find(c => c.chunkId === quranChunk.chunkId);
    assert.ok(quranCand.scores.metadataBoost > 0);
  });

  // 7. Candidate Ranker Deduplication & Top-K Slicing
  it('7. should deduplicate candidates by chunkId and slice top-K', () => {
    const ranker = new CandidateRanker({ topK: 3 });
    const chunk = allChunks[0];

    // Duplicate candidate entry
    const candidates = [
      { chunkId: chunk.chunkId, scores: { lexicalScore: 5, semanticScore: 0.8, finalScore: 0.05 }, finalRank: 1 },
      { chunkId: chunk.chunkId, scores: { lexicalScore: 4, semanticScore: 0.7, finalScore: 0.04 }, finalRank: 2 },
      { chunkId: allChunks[1].chunkId, scores: { lexicalScore: 3, semanticScore: 0.6, finalScore: 0.03 }, finalRank: 3 },
      { chunkId: allChunks[2].chunkId, scores: { lexicalScore: 2, semanticScore: 0.5, finalScore: 0.02 }, finalRank: 4 },
      { chunkId: allChunks[3].chunkId, scores: { lexicalScore: 1, semanticScore: 0.4, finalScore: 0.015 }, finalRank: 5 }
    ];

    const ranked = ranker.rank(candidates, { topK: 2 });
    assert.equal(ranked.length, 2);
    assert.equal(ranked[0].chunkId, chunk.chunkId);
    assert.equal(ranked[1].chunkId, allChunks[1].chunkId);
    assert.equal(ranked[0].finalRank, 1);
    assert.equal(ranked[1].finalRank, 2);
  });

  // 8. Zero-Result Behavior on Unrelated Queries
  it('8. should return empty candidates [] for completely irrelevant queries', async () => {
    const unrelatedInterpretation = {
      originalQuestion: 'كيف تعمل خوارزميات التشفير الكمي في لغة بايثون؟',
      task: 'GENERAL',
      topic: 'الفيزياء والبرمجة الحديثة',
      subtopics: ['حوسبة كمومية', 'تشفير'],
      userGoal: 'فهم التشفير الكمومي',
      claimsToResolve: [
        {
          claimId: 'claim_quantum',
          statement: 'التشفير الكمي يعتمد على مبدأ التراكب في ميكانيكا الكم',
          importance: 'CORE',
          requiredEvidenceType: 'TEXTUAL_EVIDENCE'
        }
      ],
      requestedEvidence: []
    };

    const result = await service.retrieveForInterpretation({
      interpretation: unrelatedInterpretation,
      repository: repo,
      options: { minRelevanceThreshold: 0.02 }
    });

    assert.equal(result.claims.length, 1);
    // Unrelated query must yield 0 candidates instead of hallucinating irrelevant religious chunks
    assert.equal(result.claims[0].candidates.length, 0);
  });

  // 9. Provenance Integrity
  it('9. should preserve complete provenance contract in retrieved candidates', async () => {
    const interpretation = {
      originalQuestion: 'هل حديث إنما الأعمال بالنيات صحيح؟',
      task: 'VERIFY_HADITH',
      topic: 'الحديث الشريف',
      subtopics: ['النية'],
      userGoal: 'التحقق من صحة حديث إنما الأعمال بالنيات',
      claimsToResolve: [
        {
          claimId: 'c_bukhari',
          statement: 'حديث إنما الأعمال بالنيات مروي في صحيح البخاري بإسناد صحيح',
          importance: 'CORE',
          requiredEvidenceType: 'HADITH_ISNAD_STATUS'
        }
      ],
      requestedEvidence: ['HADITH_ISNAD_STATUS']
    };

    const result = await service.retrieveForInterpretation({
      interpretation,
      repository: repo
    });

    const candidates = result.claims[0].candidates;
    assert.ok(candidates.length > 0);
    const top = candidates[0];

    // Provenance verification
    assert.ok(top.chunkId);
    assert.ok(top.recordId);
    assert.ok(top.sourceId);
    assert.ok(top.sourceName);
    assert.ok(top.domain);
    assert.ok(top.text);
    assert.ok(top.scores);
    assert.ok(top.scores.finalScore > 0);
    assert.equal(top.finalRank, 1);
  });
});
