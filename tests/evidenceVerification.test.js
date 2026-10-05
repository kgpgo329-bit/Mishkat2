/**
 * Mishkat Phase 5: Semantic Evidence Verification — Development Test Suite
 * 
 * Strict compliance with Sections 2, 3, 4, 11, 12, 13, 15, 16, & 20:
 * - Tests DIRECT, SUPPORTING, CONTEXTUAL, INCIDENTAL, and UNRELATED relations
 * - Verifies the conceptual regression: Definition vs Incidental Mention ("ما معنى الفتنة؟")
 * - Verifies WHY vs What prohibition distinction
 * - Verifies Contradiction detection without discarding evidence
 * - Verifies Consensus vs Single scholar statement
 * - Verifies Provenance preservation and Canonical Verdict Contract
 * - Tests both Deterministic and Real AI Verification modes
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTrustedSourceRepository } from '../src/mishkat/knowledge/TrustedSourceRepository.js';
import {
  EvidenceVerificationService,
  EVIDENCE_RELATIONS,
  VERIFICATION_STATUS,
  isGeminiConfigured
} from '../src/mishkat/evidence/index.js';

describe('Mishkat Phase 5: Semantic Evidence Verification Development Suite', () => {
  let service;
  let repo;

  before(async () => {
    repo = defaultTrustedSourceRepository;
    if (repo.chunkCount === 0) {
      repo.loadFromDisk('data/knowledge');
    }
    service = new EvidenceVerificationService();
  });

  // 1. Conceptual Regression (Section 15 & 16-A): Definition Query vs Incidental Mention
  it('1. should NOT classify as DIRECT when query asks for definition and candidate merely mentions the word', async () => {
    const interpretation = {
      originalQuestion: 'ما معنى الفتنة في الاصطلاح الشرعي؟',
      task: 'DEFINE_TERM',
      userGoal: 'معرفة تعريف الفتنة وماهيتها',
      claimsToResolve: [
        {
          claimId: 'claim_fitnah_def',
          statement: 'الفتنة تعني لغة الابتلاء واصطلاحا ما يقع من اضطراب واختلال في الدين',
          importance: 'CORE',
          requiredEvidenceType: 'LEXICAL_DEFINITION'
        }
      ]
    };

    // Candidate that mentions the word incidentally in a fiqh ruling
    const incidentalChunk = {
      chunkId: 'rec_synth_fitnah_incidental_chk',
      recordId: 'rec_synth_fitnah_incidental',
      sourceId: 'src_fiqh_sample',
      sourceName: 'الفقه الإسلامي وأدلته',
      domain: 'FIQH',
      title: 'أحكام الكذب ومستثنياته',
      section: 'كتاب الحظر والإباحة',
      text: 'يجوز للمسلم في بعض المواضع الخاصة الكذب للإصلاح بين المتخاصمين لتسكين الفتنة ودرء المفاسد.',
      evidenceType: 'SCHOLARLY_EXPLANATION',
      scores: { lexicalScore: 8.5, semanticScore: 0.72 }
    };

    const retrievalResult = {
      queryId: 'qret_fitnah_test',
      claims: [
        {
          claimId: 'claim_fitnah_def',
          candidates: [incidentalChunk]
        }
      ]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'deterministic' }
    });

    assert.equal(result.claims.length, 1);
    const ev = result.claims[0].evidence[0];

    // Must NOT be DIRECT
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT);
    assert.equal(ev.answersExactClaim, false);
    assert.ok(ev.relation === EVIDENCE_RELATIONS.INCIDENTAL || ev.relation === EVIDENCE_RELATIONS.CONTEXTUAL);
    assert.ok(ev.reason.length > 0);
  });

  // 2. Clear DIRECT Case: Exact Quran Text Matching Canonical Request (Section 16-C)
  it('2. should classify exact Quran canonical text as DIRECT for a Quran verification claim', async () => {
    const quranChunk = repo.getChunk('rec_quran_112_1_chk_0');
    assert.ok(quranChunk, 'rec_quran_112_1_chk_0 must exist in repository');

    const interpretation = {
      originalQuestion: 'ما هو نص الآية الأولى من سورة الإخلاص؟',
      task: 'VERIFY_QURAN',
      userGoal: 'التحقق من نص الآية الكريمة',
      claimsToResolve: [
        {
          claimId: 'claim_ikhlas_1',
          statement: 'قل هو الله أحد هي الآية الأولى من سورة الإخلاص',
          importance: 'CORE',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
        }
      ]
    };

    const retrievalResult = {
      queryId: 'qret_quran_test',
      claims: [
        {
          claimId: 'claim_ikhlas_1',
          candidates: [quranChunk]
        }
      ]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'deterministic' }
    });

    const ev = result.claims[0].evidence[0];
    assert.equal(ev.relation, EVIDENCE_RELATIONS.DIRECT);
    assert.equal(ev.answersExactClaim, true);
    assert.equal(ev.supportsClaim, true);
    assert.equal(ev.contradictsClaim, false);
    assert.equal(ev.preservesQuestionIntent, true);
  });

  // 3. Contradiction Detection (Section 12 & 16-D): Fabricated Hadith Claim
  it('3. should detect contradiction when evidence refutes an authenticity claim without discarding evidence', async () => {
    const wataniChunk = repo.getChunk('rec_hadith_dorar_watani_chk_0');
    assert.ok(wataniChunk, 'rec_hadith_dorar_watani_chk_0 must exist in repository');

    const interpretation = {
      originalQuestion: 'هل حديث حب الوطن من الإيمان صحيح وثابت عن النبي؟',
      task: 'VERIFY_HADITH',
      userGoal: 'التحقق من صحة الحديث',
      claimsToResolve: [
        {
          claimId: 'claim_watani_authentic',
          statement: 'حديث حب الوطن من الإيمان صحيح ثابت عن النبي صلى الله عليه وسلم',
          importance: 'CORE',
          requiredEvidenceType: 'HADITH_ISNAD_STATUS'
        }
      ]
    };

    const retrievalResult = {
      queryId: 'qret_watani_test',
      claims: [
        {
          claimId: 'claim_watani_authentic',
          candidates: [wataniChunk]
        }
      ]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'deterministic' }
    });

    const ev = result.claims[0].evidence[0];
    // Contradicts claim: evidence proves it is fabricated / not authentic!
    assert.equal(ev.contradictsClaim, true);
    assert.equal(ev.supportsClaim, false);
    assert.equal(ev.answersExactClaim, true);
    assert.equal(ev.relation, EVIDENCE_RELATIONS.DIRECT);
  });

  // 4. WHY vs What Distinction (Section 16-B)
  it('4. should distinguish WHY inquiry from mere statement of prohibition', async () => {
    const interpretation = {
      originalQuestion: 'لماذا حرم الإسلام الربا وما هي الحكمة والمقاصد من منعه؟',
      task: 'WHY',
      userGoal: 'معرفة علة وحكمة تحريم الربا',
      claimsToResolve: [
        {
          claimId: 'claim_riba_why',
          statement: 'علة تحريم الربا وحكمته هي منع استغلال حاجة الناس وأكل أموالهم بالباطل',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    // Candidate that only states the prohibition without the why
    const whatChunk = {
      chunkId: 'rec_synth_riba_text_chk',
      recordId: 'rec_synth_riba_text',
      sourceId: 'src_quran_text',
      sourceName: 'القرآن الكريم',
      domain: 'QURAN',
      title: 'سورة البقرة آية 275',
      section: 'أحكام المعاملات',
      text: 'وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا',
      evidenceType: 'QURANIC_CANONICAL_TEXT',
      scores: { lexicalScore: 12.0, semanticScore: 0.85 }
    };

    const retrievalResult = {
      queryId: 'qret_riba_why_test',
      claims: [
        {
          claimId: 'claim_riba_why',
          candidates: [whatChunk]
        }
      ]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'deterministic' }
    });

    const ev = result.claims[0].evidence[0];
    // Must NOT be DIRECT because it only states the prohibition without explaining the cause/wisdom
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT);
    assert.equal(ev.relation, EVIDENCE_RELATIONS.SUPPORTING);
    assert.equal(ev.answersExactClaim, false);
    assert.equal(ev.supportsClaim, true);
  });

  // 5. Consensus vs Single Scholar Statement (Section 16-E)
  it('5. should not classify a single scholar statement as DIRECT for a consensus claim', async () => {
    const interpretation = {
      originalQuestion: 'هل يوجد إجماع من العلماء على هذا الحكم؟',
      task: 'VERIFY_CONSENSUS',
      userGoal: 'إثبات الإجماع',
      claimsToResolve: [
        {
          claimId: 'claim_ijma',
          statement: 'انعقد إجماع العلماء على هذه المسألة دون أي خلاف',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_CONSENSUS'
        }
      ]
    };

    const singleScholarChunk = {
      chunkId: 'rec_synth_single_scholar_chk',
      recordId: 'rec_synth_single_scholar',
      sourceId: 'src_fiqh_sample',
      sourceName: 'كتب الفقه',
      domain: 'FIQH',
      title: 'المسألة الفقهية',
      section: 'أقوال الفقهاء',
      text: 'قال الإمام الشافعي رحمه الله: والقول عندي في هذه المسألة المنع لما روي في الباب.',
      evidenceType: 'SCHOLARLY_EXPLANATION',
      scores: { lexicalScore: 5.0, semanticScore: 0.65 }
    };

    const retrievalResult = {
      queryId: 'qret_ijma_test',
      claims: [
        {
          claimId: 'claim_ijma',
          candidates: [singleScholarChunk]
        }
      ]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'deterministic' }
    });

    const ev = result.claims[0].evidence[0];
    // Single scholar does not prove consensus
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT);
    assert.equal(ev.relation, EVIDENCE_RELATIONS.SUPPORTING);
    assert.equal(ev.answersExactClaim, false);
  });

  // 6. Terminology Definition Case (Section 16-G)
  it('6. should classify approved terminology dictionary definition as DIRECT for definition claim', async () => {
    const taqwaChunk = repo.getChunk('rec_term_jamhara_taqwa_chk_0');
    assert.ok(taqwaChunk, 'rec_term_jamhara_taqwa_chk_0 must exist in repository');

    const interpretation = {
      originalQuestion: 'ما هو تعريف التقوى في اصطلاح أهل العلم؟',
      task: 'DEFINE_TERM',
      userGoal: 'معرفة تعريف التقوى لغة واصطلاحا',
      claimsToResolve: [
        {
          claimId: 'claim_taqwa_def',
          statement: 'التقوى لغة الوقاية واصطلاحا جعل وقاية بين العبد وعذاب الله بطاعته',
          importance: 'CORE',
          requiredEvidenceType: 'LEXICAL_DEFINITION'
        }
      ]
    };

    const retrievalResult = {
      queryId: 'qret_taqwa_test',
      claims: [
        {
          claimId: 'claim_taqwa_def',
          candidates: [taqwaChunk]
        }
      ]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'deterministic' }
    });

    const ev = result.claims[0].evidence[0];
    assert.equal(ev.relation, EVIDENCE_RELATIONS.DIRECT);
    assert.equal(ev.answersExactClaim, true);
    assert.equal(ev.supportsClaim, true);
    assert.equal(ev.preservesQuestionIntent, true);
  });

  // 7. Unrelated Evidence Case (Section 16-H)
  it('7. should classify completely unrelated candidate as UNRELATED', async () => {
    const hudaybiyyahChunk = repo.getChunk('rec_hist_dorar_hudaybiyyah_chk_0');

    const interpretation = {
      originalQuestion: 'ما هي أحكام زكاة الفطر ومقدارها؟',
      task: 'EXPLAIN_CONCEPT',
      userGoal: 'معرفة أحكام زكاة الفطر',
      claimsToResolve: [
        {
          claimId: 'claim_zakat_fitr',
          statement: 'زكاة الفطر صاع من طعام تخرج قبل صلاة العيد',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    const retrievalResult = {
      queryId: 'qret_unrelated_test',
      claims: [
        {
          claimId: 'claim_zakat_fitr',
          // Historical peace treaty chunk has 0 relevance to Zakat al-Fitr
          candidates: [{ ...hudaybiyyahChunk, scores: { lexicalScore: 0, semanticScore: 0.1 } }]
        }
      ]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'deterministic' }
    });

    const ev = result.claims[0].evidence[0];
    assert.equal(ev.relation, EVIDENCE_RELATIONS.UNRELATED);
    assert.equal(ev.answersExactClaim, false);
    assert.equal(ev.supportsClaim, false);
  });

  // 8. Complete Provenance Contract Preservation (Section 8)
  it('8. should preserve full provenance contract on all verified evidence items', async () => {
    const bukhariChunk = repo.getChunk('rec_hadith_bukhari_1_chk_0');

    const interpretation = {
      originalQuestion: 'هل حديث إنما الأعمال بالنيات صحيح؟',
      task: 'VERIFY_HADITH',
      userGoal: 'التحقق من صحة الحديث',
      claimsToResolve: [
        {
          claimId: 'c_bukhari',
          statement: 'حديث إنما الأعمال بالنيات مروي في صحيح البخاري',
          importance: 'CORE',
          requiredEvidenceType: 'HADITH_ISNAD_STATUS'
        }
      ]
    };

    const retrievalResult = {
      queryId: 'qret_provenance_test',
      claims: [
        {
          claimId: 'c_bukhari',
          candidates: [bukhariChunk]
        }
      ]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'deterministic' }
    });

    assert.ok(result.verificationId.startsWith('vfy_'));
    assert.equal(result.queryId, 'qret_provenance_test');
    const ev = result.claims[0].evidence[0];

    // Provenance verification
    assert.ok(ev.evidenceId.startsWith('ev_'));
    assert.equal(ev.chunkId, bukhariChunk.chunkId);
    assert.equal(ev.recordId, bukhariChunk.recordId);
    assert.equal(ev.sourceId, bukhariChunk.sourceId);
    assert.equal(ev.sourceName, bukhariChunk.sourceName);
    assert.equal(ev.domain, bukhariChunk.domain);
    assert.equal(ev.text, bukhariChunk.text);
    assert.equal(ev.verificationStatus, VERIFICATION_STATUS.VERIFIED);
    assert.ok(ev.confidence >= 0 && ev.confidence <= 1);
  });

  // 9. Real Gemini AI Verification Path (Section 21)
  it('9. should execute real Gemini AI verification when credentials are configured', async () => {
    if (!isGeminiConfigured()) {
      console.log('Skipping real AI test: GEMINI_API_KEY is not configured in environment.');
      return;
    }

    const ikhlasChunk = repo.getChunk('rec_quran_112_1_chk_0');

    const interpretation = {
      originalQuestion: 'قل هو الله أحد الله الصمد',
      task: 'VERIFY_QURAN',
      userGoal: 'التحقق من نص الآية الكريمة',
      claimsToResolve: [
        {
          claimId: 'c_ikhlas_ai',
          statement: 'قل هو الله أحد آية من سورة الإخلاص تثبت توحيد الله الخالص',
          importance: 'CORE',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
        }
      ]
    };

    const retrievalResult = {
      queryId: 'qret_ai_diag_test',
      claims: [
        {
          claimId: 'c_ikhlas_ai',
          candidates: [ikhlasChunk]
        }
      ]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'ai' }
    });

    assert.ok(result.claims.length > 0);
    const ev = result.claims[0].evidence[0];
    assert.equal(ev.verificationMode, 'AI_VERIFICATION');
    assert.equal(ev.verificationStatus, VERIFICATION_STATUS.VERIFIED);
    assert.equal(ev.relation, EVIDENCE_RELATIONS.DIRECT);
    assert.equal(ev.answersExactClaim, true);
    assert.equal(ev.supportsClaim, true);
    assert.ok(ev.confidence > 0.8);
    assert.ok(ev.reason.length > 10);
  });

  // ========================================================
  // Section 20: Development Tests for 8 False-DIRECT Traps
  // Every test MUST assert: ev.relation !== EVIDENCE_RELATIONS.DIRECT
  // ========================================================

  // Trap 1: Authoritative source but proposition mismatches
  it('10. Trap 1: should NOT be DIRECT when Quran verse proposition mismatches the claim', async () => {
    const quranChunk = repo.getChunk('rec_quran_2_256_chk_0');
    assert.ok(quranChunk);

    const interpretation = {
      originalQuestion: 'متى وقعت غزوة بدر الكبرى وفي أي سنة؟',
      task: 'VERIFY_HISTORICAL',
      userGoal: 'معرفة تاريخ غزوة بدر',
      claimsToResolve: [
        {
          claimId: 'c_trap1',
          statement: 'وقعت غزوة بدر الكبرى في السابع عشر من شهر رمضان في السنة الثانية من الهجرة',
          importance: 'CORE',
          requiredEvidenceType: 'HISTORICAL_REPORT'
        }
      ]
    };

    const retrievalResult = {
      queryId: 'qret_trap1',
      claims: [{ claimId: 'c_trap1', candidates: [{ ...quranChunk, scores: { lexicalScore: 0, semanticScore: 0.1 } }] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Authoritative Quran chunk must NOT be DIRECT for unrelated historical date claim');
  });

  // Trap 2: Quran verse is relevant but only supports broader misconception claim
  it('11. Trap 2: should NOT be DIRECT when Quran verse proves Qiblah but claim rebuts Kaaba worship', async () => {
    const qiblahChunk = repo.getChunk('rec_quran_2_144_chk_0');
    assert.ok(qiblahChunk);

    const interpretation = {
      originalQuestion: 'هل المسلمون يعبدون الكعبة؟',
      task: 'RESOLVE_MISCONCEPTION',
      userGoal: 'دحض شبهة عبادة المسلمين للكعبة',
      claimsToResolve: [
        {
          claimId: 'c_trap2',
          statement: 'المسلمون لا يعبدون الكعبة وإنما يتخذونها قبلة للتوجه إلى الله في الصلاة',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    const retrievalResult = {
      queryId: 'qret_trap2',
      claims: [{ claimId: 'c_trap2', candidates: [qiblahChunk] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Qiblah verse must NOT be DIRECT for Kaaba worship rebuttal claim');
    assert.equal(ev.relation, EVIDENCE_RELATIONS.SUPPORTING);
    assert.equal(ev.requiresExternalInference, true);
  });

  // Trap 3: Hadith is authentic but does not answer exact question
  it('12. Trap 3: should NOT be DIRECT when authentic Hadith of intentions is used for prayer timing claim', async () => {
    const bukhariChunk = repo.getChunk('rec_hadith_bukhari_1_chk_0');
    assert.ok(bukhariChunk);

    const interpretation = {
      originalQuestion: 'كم عدد ركعات صلاة الظهر ومتى يبدأ وقتها؟',
      task: 'EXPLAIN_CONCEPT',
      userGoal: 'معرفة أحكام صلاة الظهر',
      claimsToResolve: [
        {
          claimId: 'c_trap3',
          statement: 'صلاة الظهر أربع ركعات سرية ويبدأ وقتها بزوال الشمس عن وسط السماء',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    const retrievalResult = {
      queryId: 'qret_trap3',
      claims: [{ claimId: 'c_trap3', candidates: [{ ...bukhariChunk, scores: { lexicalScore: 0, semanticScore: 0.1 } }] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Authentic Hadith of Intentions must NOT be DIRECT for prayer timing claim');
  });

  // Trap 4: Definition source contains the word but not the definition
  it('13. Trap 4: should NOT be DIRECT when text contains the word incidentally in another context', async () => {
    const interpretation = {
      originalQuestion: 'ما هو تعريف التقوى الشرعي؟',
      task: 'DEFINE_TERM',
      userGoal: 'معرفة تعريف التقوى',
      claimsToResolve: [
        {
          claimId: 'c_trap4',
          statement: 'التقوى لغة الوقاية واصطلاحا امتثال المأمورات واجتناب المنهيات',
          importance: 'CORE',
          requiredEvidenceType: 'LEXICAL_DEFINITION'
        }
      ]
    };

    const incidentalChunk = {
      chunkId: 'rec_synth_taqwa_incidental',
      recordId: 'rec_synth_taqwa_incidental_rec',
      sourceId: 'src_fiqh_sample',
      sourceName: 'كتب الفقه',
      domain: 'FIQH',
      title: 'شروط الإمام في الصلاة',
      section: 'كتاب الصلاة',
      text: 'ويندب للمسلم أن يقدم في الإمامة أهل التقوى والصلاح والأقرأ لكتاب الله.',
      evidenceType: 'SCHOLARLY_EXPLANATION',
      scores: { lexicalScore: 6.0, semanticScore: 0.6 }
    };

    const retrievalResult = {
      queryId: 'qret_trap4',
      claims: [{ claimId: 'c_trap4', candidates: [incidentalChunk] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Incidental mention of التقوى must NOT be DIRECT for definition claim');
    assert.ok(ev.relation === EVIDENCE_RELATIONS.INCIDENTAL || ev.relation === EVIDENCE_RELATIONS.CONTEXTUAL);
  });

  // Trap 5: Historical evidence is narrower than claim
  it('14. Trap 5: should NOT be DIRECT when single historical treaty is used for sweeping universal claim', async () => {
    const hudaybiyyahChunk = repo.getChunk('rec_hist_dorar_hudaybiyyah_chk_0');
    assert.ok(hudaybiyyahChunk);

    const interpretation = {
      originalQuestion: 'هل خاض المسلمون أي قتال في تاريخهم؟',
      task: 'VERIFY_HISTORICAL',
      userGoal: 'التحقق من دعوى خلو التاريخ من المعارك',
      claimsToResolve: [
        {
          claimId: 'c_trap5',
          statement: 'المسلمون لم يخوضوا أي معركة أو قتال طوال تاريخهم واقتصروا على الصلح دائما',
          importance: 'CORE',
          requiredEvidenceType: 'HISTORICAL_REPORT'
        }
      ]
    };

    const retrievalResult = {
      queryId: 'qret_trap5',
      claims: [{ claimId: 'c_trap5', candidates: [hudaybiyyahChunk] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Hudaybiyyah treaty must NOT be DIRECT for universal claim');
  });

  // Trap 6: One scholar used against consensus claim
  it('15. Trap 6: should NOT be DIRECT when one scholar opinion is provided for a consensus claim', async () => {
    const interpretation = {
      originalQuestion: 'هل انعقد إجماع الأمة على وجوب صلاة الجماعة؟',
      task: 'VERIFY_CONSENSUS',
      userGoal: 'التحقق من الإجماع',
      claimsToResolve: [
        {
          claimId: 'c_trap6',
          statement: 'أجمع علماء المسلمين قاطبة على فرضية صلاة الجماعة على الأعيان',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_CONSENSUS'
        }
      ]
    };

    const singleScholarChunk = {
      chunkId: 'rec_synth_scholar_opinion',
      recordId: 'rec_synth_scholar_rec',
      sourceId: 'src_fiqh_sample',
      sourceName: 'كتب الفقه المقارن',
      domain: 'FIQH',
      title: 'حكم صلاة الجماعة',
      section: 'أحكام الصلاة',
      text: 'وقال الإمام أحمد بن حنبل رحمه الله: صلاة الجماعة واجبة على الأعيان لا تسقط إلا بعذر.',
      evidenceType: 'SCHOLARLY_EXPLANATION',
      scores: { lexicalScore: 7.0, semanticScore: 0.7 }
    };

    const retrievalResult = {
      queryId: 'qret_trap6',
      claims: [{ claimId: 'c_trap6', candidates: [singleScholarChunk] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Single scholar quote must NOT be DIRECT for consensus claim');
    assert.equal(ev.relation, EVIDENCE_RELATIONS.SUPPORTING);
  });

  // Trap 7: Ruling evidence used for WHY question
  it('16. Trap 7: should NOT be DIRECT when ruling verse is used for WHY question without the cause', async () => {
    const interpretation = {
      originalQuestion: 'لماذا حرم الله أكل مال اليتيم وما العلة في ذلك؟',
      task: 'WHY',
      userGoal: 'معرفة حكمة وعلة تحريم أكل مال اليتيم',
      claimsToResolve: [
        {
          claimId: 'c_trap7',
          statement: 'علة تحريم أكل مال اليتيم هي حماية الضعفاء وصيانة أموالهم من الاستغلال والضياع',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    const rulingOnlyChunk = {
      chunkId: 'rec_synth_ruling_orphan',
      recordId: 'rec_synth_ruling_orphan_rec',
      sourceId: 'src_quran_text',
      sourceName: 'القرآن الكريم',
      domain: 'QURAN',
      title: 'سورة النساء آية 10',
      section: 'أحكام المعاملات',
      text: 'إِنَّ الَّذِينَ يَأْكُلُونَ أَمْوَالَ الْيَتَامَىٰ ظُلْمًا إِنَّمَا يَأْكُلُونَ فِي بُطُونِهِمْ نَارًا',
      evidenceType: 'QURANIC_CANONICAL_TEXT',
      scores: { lexicalScore: 8.0, semanticScore: 0.75 }
    };

    const retrievalResult = {
      queryId: 'qret_trap7',
      claims: [{ claimId: 'c_trap7', candidates: [rulingOnlyChunk] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Ruling prohibition verse must NOT be DIRECT for WHY/wisdom question');
    assert.equal(ev.relation, EVIDENCE_RELATIONS.SUPPORTING);
  });

  // Trap 8: Lexical / translation evidence used for theological proposition
  it('17. Trap 8: should NOT be DIRECT when general lexical definition is used for theological division claim', async () => {
    const interpretation = {
      originalQuestion: 'ما هي أقسام التوحيد الثلاثة عند علماء أهل السنة؟',
      task: 'EXPLAIN_CONCEPT',
      userGoal: 'معرفة أقسام التوحيد الثلاثة',
      claimsToResolve: [
        {
          claimId: 'c_trap8',
          statement: 'يقسم التوحيد عند أهل السنة إلى ثلاثة أقسام: توحيد الربوبية، وتوحيد الألوهية، وتوحيد الأسماء والصفات',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    const lexicalChunk = {
      chunkId: 'rec_synth_lexical_tawheed',
      recordId: 'rec_synth_lexical_tawheed_rec',
      sourceId: 'src_lexicon',
      sourceName: 'معاجم اللغة',
      domain: 'TERMINOLOGY',
      title: 'مادة وحد',
      section: 'حرف الواو',
      text: 'التوحيد مصدر وحد يوحد توحيداً إذا جعله واحداً فرداً لا ثاني له.',
      evidenceType: 'LEXICAL_DEFINITION',
      scores: { lexicalScore: 7.5, semanticScore: 0.7 }
    };

    const retrievalResult = {
      queryId: 'qret_trap8',
      claims: [{ claimId: 'c_trap8', candidates: [lexicalChunk] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'General lexical definition must NOT be DIRECT for theological tripartite division claim');
    assert.ok(ev.relation === EVIDENCE_RELATIONS.CONTEXTUAL || ev.relation === EVIDENCE_RELATIONS.SUPPORTING);
  });

  // Trap 9: Surah 49:13 vs compound anti-discrimination claim citing Hadith phrases
  it('18. Trap 9: should NOT be DIRECT when Quran verse proves equality but claim includes compound Hadith phrasing', async () => {
    const interpretation = {
      originalQuestion: 'هل صح عن النبي ﷺ في خطبة الوداع أن لا فضل لعربي على أعجمي إلا بالتقوى؟',
      task: 'VERIFY_HADITH',
      userGoal: 'التحقق من نص حديث خطبة الوداع في نفي التمايز العرقي',
      claimsToResolve: [
        {
          claimId: 'c_trap9',
          statement: 'ثبت في خطبة الوداع: لا فضل لعربي على أعجمي ولا لأبيض على أسود إلا بالتقوى وأن الناس لآدم وآدم من تراب',
          importance: 'CORE',
          requiredEvidenceType: 'HADITH_TEXT_OR_STATUS'
        }
      ]
    };

    const quranEqualityChunk = {
      chunkId: 'rec_synth_quran_49_13',
      recordId: 'rec_synth_quran_49_13_rec',
      sourceId: 'src_quran_text',
      sourceName: 'القرآن الكريم',
      domain: 'QURAN',
      title: 'سورة الحجرات آية 13',
      section: 'أحكام المعاملات والأخلاق',
      text: 'يَا أَيُّهَا النَّاسُ إِنَّا خَلَقْنَاكُم مِّن ذَكَرٍ وَأُنثَىٰ وَجَعَلْنَاكُمْ شُعُوبًا وَقَبَائِلَ لِتَعَارَفُوا إِنَّ أَكْرَمَكُمْ عِندَ اللَّهِ أَتْقَاكُمْ',
      evidenceType: 'QURANIC_CANONICAL_TEXT',
      scores: { lexicalScore: 8.2, semanticScore: 0.81 }
    };

    const retrievalResult = {
      queryId: 'qret_trap9',
      claims: [{ claimId: 'c_trap9', candidates: [quranEqualityChunk] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Quran verse must NOT be DIRECT for Hadith verification claim');
    assert.equal(ev.relation, EVIDENCE_RELATIONS.SUPPORTING);
    assert.equal(ev.materialClaimCoverage, 'PARTIAL');
  });

  // Trap 10: Apologetic summary quoting 1 clause vs query asking for the historical Omariyya treaty terms
  it('19. Trap 10: should NOT be DIRECT when apologetic summary quotes one clause for comprehensive historical treaty query', async () => {
    const interpretation = {
      originalQuestion: 'ما هي بنود وشروط العهدة العمرية لأهل إيلياء في القدس؟',
      task: 'VERIFY_HISTORICAL',
      userGoal: 'معرفة بنود العهدة العمرية التاريخية بدقة',
      claimsToResolve: [
        {
          claimId: 'c_trap10',
          statement: 'تضمنت العهدة العمرية بنود أمان تفصيلية لأهل القدس على كنائسهم وصلبانهم وأموالهم وألا يسكن معهم أحد من اليهود',
          importance: 'CORE',
          requiredEvidenceType: 'HISTORICAL_DOCUMENT_REPORT'
        }
      ]
    };

    const apologeticChunk = {
      chunkId: 'rec_synth_omariyya_apologetic',
      recordId: 'rec_synth_omariyya_apologetic_rec',
      sourceId: 'src_misconceptions',
      sourceName: 'دفع الشبهات عن تاريخ الإسلام',
      domain: 'MISCONCEPTIONS',
      title: 'سماحة الإسلام في الفتوحات',
      section: 'شبهة انتشار الإسلام بالسيف',
      text: 'ومن أعظم الأدلة على عدل الفاتحين كتاب عمر بن الخطاب لأهل القدس حيث أعطاهم أماناً لأنفسهم وكنائسهم وألا تُكرهوا على دينهم.',
      evidenceType: 'APOLOGETIC_REBUTTAL',
      scores: { lexicalScore: 7.9, semanticScore: 0.77 }
    };

    const retrievalResult = {
      queryId: 'qret_trap10',
      claims: [{ claimId: 'c_trap10', candidates: [apologeticChunk] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Apologetic rebuttal clause must NOT be DIRECT for full historical treaty terms');
    assert.equal(ev.relation, EVIDENCE_RELATIONS.SUPPORTING);
    assert.equal(ev.materialClaimCoverage, 'PARTIAL');
  });

  // Trap 11: Hadith of Jibril vs claim polemically rebutting philosophical Sufi terms
  it('20. Trap 11: should NOT be DIRECT when Hadith of Jibril is used to directly refute philosophical Sufism theories', async () => {
    const interpretation = {
      originalQuestion: 'هل تبطل نصوص السنة نظريات وحدة الوجود والاتحاد عند المتصوفة؟',
      task: 'RESOLVE_MISCONCEPTION',
      userGoal: 'بيان بطلان عقيدة وحدة الوجود والاتحاد',
      claimsToResolve: [
        {
          claimId: 'c_trap11',
          statement: 'عقيدة وحدة الوجود ونفي المباينة بين الخالق والمخلوق باطلة بنصوص إثبات مراتب الإيمان والإسلام والإحسان',
          importance: 'CORE',
          requiredEvidenceType: 'THEOLOGICAL_REBUTTAL'
        }
      ]
    };

    const jibrilChunk = {
      chunkId: 'rec_synth_jibril_hadith',
      recordId: 'rec_synth_jibril_hadith_rec',
      sourceId: 'src_hadith_nawawi40',
      sourceName: 'الأربعون النووية',
      domain: 'HADITH',
      title: 'الحديث الثاني: مراتب الدين',
      section: 'الإسلام والإيمان والإحسان',
      text: 'قال: فأخبرني عن الإحسان، قال: أن تعبد الله كأنك تراه فإن لم تكن تراه فإنه يراك.',
      evidenceType: 'PROPHETIC_HADITH_TEXT',
      scores: { lexicalScore: 7.4, semanticScore: 0.73 }
    };

    const retrievalResult = {
      queryId: 'qret_trap11',
      claims: [{ claimId: 'c_trap11', candidates: [jibrilChunk] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Hadith of Jibril must NOT be DIRECT for specialized philosophical polemics');
    assert.equal(ev.relation, EVIDENCE_RELATIONS.SUPPORTING);
  });

  // Trap 12: General virtue of knowledge vs specific claim that learning fiqh of commercial transactions is an individual obligation (fard 'ayn) on traders
  it('21. Trap 12: should NOT be DIRECT when general virtue of seeking knowledge is used for specific fard ayn on traders', async () => {
    const interpretation = {
      originalQuestion: 'هل يجب على التاجر عيناً تعلم أحكام البيوع قبل ممارسة التجارة؟',
      task: 'VERIFY_RULING',
      userGoal: 'معرفة حكم تعلم فقه البيوع للتاجر',
      claimsToResolve: [
        {
          claimId: 'c_trap12',
          statement: 'تعلم أحكام البيوع والمعاملات المالية فرض عين على كل تاجر يريد الدخول في السوق تحرزاً من الوقوع في الربا المحرم',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    const generalVirtueChunk = {
      chunkId: 'rec_synth_knowledge_virtue',
      recordId: 'rec_synth_knowledge_virtue_rec',
      sourceId: 'src_hadith_text',
      sourceName: 'جامع بيان العلم وفضله',
      domain: 'HADITH',
      title: 'فضل طلب العلم',
      section: 'كتاب العلم',
      text: 'طلب العلم فريضة على كل مسلم، وإن الملائكة لتضع أجنحتها لطالب العلم رضاً بما يصنع.',
      evidenceType: 'PROPHETIC_HADITH_TEXT',
      scores: { lexicalScore: 7.6, semanticScore: 0.74 }
    };

    const retrievalResult = {
      queryId: 'qret_trap12',
      claims: [{ claimId: 'c_trap12', candidates: [generalVirtueChunk] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'General virtue of knowledge must NOT be DIRECT for commercial fard ayn claim');
    assert.equal(ev.relation, EVIDENCE_RELATIONS.SUPPORTING);
    assert.equal(ev.materialClaimCoverage, 'PARTIAL');
  });

  // Trap 13: Quranic verse mentioning fasting in Ramadan vs claim stating exact astronomical calculation rules for lunar crescent
  it('22. Trap 13: should NOT be DIRECT when general Ramadan fasting verse is used for astronomical calculation rules', async () => {
    const interpretation = {
      originalQuestion: 'هل يجوز الاعتماد على الحساب الفلكي القطعي في إثبات دخول شهر رمضان؟',
      task: 'VERIFY_RULING',
      userGoal: 'معرفة الموقف الشرعي من الحساب الفلكي',
      claimsToResolve: [
        {
          claimId: 'c_trap13',
          statement: 'يثبت دخول شهر رمضان بالحساب الفلكي القطعي لنفي الرؤية أو إثباتها عند بعض الفقهاء المعاصرين',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    const generalRamadanVerse = {
      chunkId: 'rec_synth_quran_ramadan_fasting',
      recordId: 'rec_synth_quran_ramadan_fasting_rec',
      sourceId: 'src_quran_text',
      sourceName: 'القرآن الكريم',
      domain: 'QURAN',
      title: 'سورة البقرة آية 185',
      section: 'أحكام الصيام',
      text: 'شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ وَبَيِّنَاتٍ مِّنَ الْهُدَىٰ وَالْفُرْقَانِ ۚ فَمَن شَهِدَ مِنكُمُ الشَّهْرَ فَلْيَصُمْهُ',
      evidenceType: 'QURANIC_CANONICAL_TEXT',
      scores: { lexicalScore: 8.0, semanticScore: 0.76 }
    };

    const retrievalResult = {
      queryId: 'qret_trap13',
      claims: [{ claimId: 'c_trap13', candidates: [generalRamadanVerse] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Ramadan verse must NOT be DIRECT for modern astronomical calculation debate');
    assert.equal(ev.relation, EVIDENCE_RELATIONS.SUPPORTING);
  });

  // Trap 14: Hadith on washing hands upon waking up vs claim specifying medical hygiene sterilization mechanisms
  it('23. Trap 14: should NOT be DIRECT when washing hands hadith is used for medical laboratory hygiene claim', async () => {
    const interpretation = {
      originalQuestion: 'ما هي معايير التعقيم الطبي المعملي في السنة النبوية؟',
      task: 'VERIFY_RULING',
      userGoal: 'ربط السنة بالتعقيم المعملي الحديث',
      claimsToResolve: [
        {
          claimId: 'c_trap14',
          statement: 'تضمنت السنة النبوية منظومة متكاملة لبروتوكولات التعقيم المعملي والميكروبي الحديثة في المشافي',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    const wakingHadith = {
      chunkId: 'rec_synth_waking_wash_hands',
      recordId: 'rec_synth_waking_wash_hands_rec',
      sourceId: 'src_hadith_bukhari',
      sourceName: 'صحيح البخاري',
      domain: 'HADITH',
      title: 'باب الاستيقاظ من النوم',
      section: 'كتاب الوضوء',
      text: 'إذا استيقظ أحدكم من نومه فلا يغمس يده في الإناء حتى يغسلها ثلاثاً فإنه لا يدري أين باتت يده.',
      evidenceType: 'PROPHETIC_HADITH_TEXT',
      scores: { lexicalScore: 7.2, semanticScore: 0.70 }
    };

    const retrievalResult = {
      queryId: 'qret_trap14',
      claims: [{ claimId: 'c_trap14', candidates: [wakingHadith] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Hadith of washing hands must NOT be DIRECT for modern hospital sterilization claim');
    assert.equal(ev.relation, EVIDENCE_RELATIONS.SUPPORTING);
  });

  // Trap 15: General verse on consultation (Shura) vs modern constitutional parliamentary democratic mechanisms
  it('24. Trap 15: should NOT be DIRECT when Shura verse is used for modern parliamentary constitutional voting mechanics', async () => {
    const interpretation = {
      originalQuestion: 'هل يثبت القرآن الكريم وجوب النظام البرلماني الديمقراطي التعددي كشكل دستوري محدد؟',
      task: 'VERIFY_RULING',
      userGoal: 'التحقق من إلزام القرآن بالنظام البرلماني التعددي',
      claimsToResolve: [
        {
          claimId: 'c_trap15',
          statement: 'أوجب القرآن الكريم اعتماد النظام البرلماني التعددي الدستوري والفصل بين السلطات الثلاث كشكل قطعي للحكم',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    const shuraVerse = {
      chunkId: 'rec_synth_shura_verse',
      recordId: 'rec_synth_shura_verse_rec',
      sourceId: 'src_quran_text',
      sourceName: 'القرآن الكريم',
      domain: 'QURAN',
      title: 'سورة الشورى آية 38',
      section: 'أحكام الإمامة والسياسة الشرعية',
      text: 'وَالَّذِينَ اسْتَجَابُوا لِرَبِّهِمْ وَأَقَامُوا الصَّلَاةَ وَأَمْرُهُمْ شُورَىٰ بَيْنَهُمْ وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ',
      evidenceType: 'QURANIC_CANONICAL_TEXT',
      scores: { lexicalScore: 7.8, semanticScore: 0.75 }
    };

    const retrievalResult = {
      queryId: 'qret_trap15',
      claims: [{ claimId: 'c_trap15', candidates: [shuraVerse] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Shura verse must NOT be DIRECT for modern parliamentary democratic system claim');
    assert.equal(ev.relation, EVIDENCE_RELATIONS.SUPPORTING);
  });

  // Trap 16: General inheritance verse vs claim proving inheritance distribution in atypical grandfather-and-brothers disputes
  it('25. Trap 16: should NOT be DIRECT when general inheritance verse is used for atypical grandfather and brothers dispute', async () => {
    const interpretation = {
      originalQuestion: 'كيف يوزع ميراث الجد مع الإخوة الأشقاء عند الإمام زيد بن ثابت؟',
      task: 'VERIFY_RULING',
      userGoal: 'معرفة تفاصيل ميراث الجد مع الإخوة',
      claimsToResolve: [
        {
          claimId: 'c_trap16',
          statement: 'يرث الجد مع الإخوة الأشقاء عند زيد بن ثابت الأفضل له من ثلث المال أو المقاسمة في حال عدم وجود أصحاب فروض',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    const generalInheritanceVerse = {
      chunkId: 'rec_synth_inheritance_general',
      recordId: 'rec_synth_inheritance_general_rec',
      sourceId: 'src_quran_text',
      sourceName: 'القرآن الكريم',
      domain: 'QURAN',
      title: 'سورة النساء آية 11',
      section: 'أحكام الفرائض والمواريث',
      text: 'يُوصِيكُمُ اللَّهُ فِي أَوْلَادِكُمْ ۖ لِلذَّكَرِ مِثْلُ حَظِّ الْأُنثَيَيْنِ',
      evidenceType: 'QURANIC_CANONICAL_TEXT',
      scores: { lexicalScore: 7.1, semanticScore: 0.69 }
    };

    const retrievalResult = {
      queryId: 'qret_trap16',
      claims: [{ claimId: 'c_trap16', candidates: [generalInheritanceVerse] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'General children inheritance verse must NOT be DIRECT for grandfather-and-brothers claim');
    assert.equal(ev.relation, EVIDENCE_RELATIONS.SUPPORTING);
  });

  // Trap 17: Hadith about black seed vs claim that it cures advanced diabetes type 1 without insulin
  it('26. Trap 17: should NOT be DIRECT when black seed hadith is used to claim it replaces insulin in Type 1 diabetes', async () => {
    const interpretation = {
      originalQuestion: 'هل يغني تناول الحبة السوداء عن أخذ حقن الأنسولين لمرضى السكري من النوع الأول؟',
      task: 'VERIFY_RULING',
      userGoal: 'التحقق من علاج السكري بالحبة السوداء دون أنسولين',
      claimsToResolve: [
        {
          claimId: 'c_trap17',
          statement: 'الحبة السوداء تغني شرعاً وطبياً عن أخذ الأنسولين لمرضى السكر من النوع الأول وتشفي البنكرياس كلياً',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    const blackSeedHadith = {
      chunkId: 'rec_synth_black_seed_hadith',
      recordId: 'rec_synth_black_seed_hadith_rec',
      sourceId: 'src_hadith_bukhari',
      sourceName: 'صحيح البخاري',
      domain: 'HADITH',
      title: 'باب الحبة السوداء',
      section: 'كتاب الطب',
      text: 'إن في الحبة السوداء شفاء من كل داء إلا السام، والسام الموت.',
      evidenceType: 'PROPHETIC_HADITH_TEXT',
      scores: { lexicalScore: 7.9, semanticScore: 0.73 }
    };

    const retrievalResult = {
      queryId: 'qret_trap17',
      claims: [{ claimId: 'c_trap17', candidates: [blackSeedHadith] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Black seed hadith must NOT be DIRECT for medical claim replacing insulin');
    assert.equal(ev.relation, EVIDENCE_RELATIONS.SUPPORTING);
    assert.equal(ev.materialClaimCoverage, 'PARTIAL');
  });

  // Trap 18: Single hadith on greeting non-Muslims vs comprehensive claim on diplomatic relations in Islamic jurisprudence
  it('27. Trap 18: should NOT be DIRECT when single hadith on greeting non-Muslims is used for comprehensive diplomatic treaty law', async () => {
    const interpretation = {
      originalQuestion: 'ما هي القواعد الدبلوماسية الشاملة في العلاقات الدولية الإسلامية؟',
      task: 'VERIFY_RULING',
      userGoal: 'معرفة منظومة القانون الدبلوماسي الإسلامي',
      claimsToResolve: [
        {
          claimId: 'c_trap18',
          statement: 'تنظم الشريعة الإسلامية العلاقات الدبلوماسية وسفارات الدول وقواعد الحصانة الدبلوماسية بالمعاهدات الملزمة',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    const salamHadith = {
      chunkId: 'rec_synth_salam_hadith',
      recordId: 'rec_synth_salam_hadith_rec',
      sourceId: 'src_hadith_muslim',
      sourceName: 'صحيح مسلم',
      domain: 'HADITH',
      title: 'باب النهي عن ابتداء أهل الكتاب بالسلام',
      section: 'كتاب السلام',
      text: 'لا تبدءوا اليهود ولا النصارى بالسلام فإذا لقيتم أحدهم في طريق فاضطروه إلى أضيقه.',
      evidenceType: 'PROPHETIC_HADITH_TEXT',
      scores: { lexicalScore: 6.8, semanticScore: 0.65 }
    };

    const retrievalResult = {
      queryId: 'qret_trap18',
      claims: [{ claimId: 'c_trap18', candidates: [salamHadith] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Greeting hadith must NOT be DIRECT for comprehensive diplomatic law claim');
    assert.ok(ev.relation === EVIDENCE_RELATIONS.SUPPORTING || ev.relation === EVIDENCE_RELATIONS.CONTEXTUAL);
  });

  // Test 28: Clear DIRECT Case for Explicit Consensus Statement
  it('28. should classify explicit consensus statement as DIRECT for consensus claim', async () => {
    const interpretation = {
      originalQuestion: 'هل هناك إجماع على فرضية الصلوات الخمس في اليوم والليلة؟',
      task: 'VERIFY_CONSENSUS',
      userGoal: 'التحقق من إجماع المسلمين على وجوب الصلوات الخمس',
      claimsToResolve: [
        {
          claimId: 'c_consensus_direct',
          statement: 'أجمع علماء المسلمين قاطبة على أن الصلوات الخمس في اليوم والليلة فرض عين على كل مكلف',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_CONSENSUS'
        }
      ]
    };

    const consensusChunk = {
      chunkId: 'rec_synth_consensus_prayers',
      recordId: 'rec_synth_consensus_prayers_rec',
      sourceId: 'src_consensus_maratib',
      sourceName: 'مراتب الإجماع',
      domain: 'FIQH',
      title: 'كتاب الصلاة',
      section: 'باب فرضية الصلاة',
      text: 'واتفق الأئمة وأجمع العلماء كافة على أن الصلوات الخمس في اليوم والليلة فرض على كل مسلم بالغ عاقل لا عذر له.',
      evidenceType: 'SCHOLARLY_EXPLANATION',
      scores: { lexicalScore: 9.0, semanticScore: 0.88 }
    };

    const retrievalResult = {
      queryId: 'qret_consensus_direct',
      claims: [{ claimId: 'c_consensus_direct', candidates: [consensusChunk] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.equal(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Explicit consensus chunk must be classified as DIRECT');
    assert.equal(ev.answersExactClaim, true);
    assert.equal(ev.materialClaimCoverage, 'COMPLETE');
  });

  // Test 29: Clear DIRECT Case for Authentic Hadith of Jibril answering Core Islam/Iman
  it('29. should classify authentic Hadith of Jibril as DIRECT when query asks for pillars of Islam', async () => {
    const interpretation = {
      originalQuestion: 'ما هي أركان الإسلام الخمسة في حديث جبريل المشهور؟',
      task: 'VERIFY_HADITH',
      userGoal: 'معرفة أركان الإسلام الخمسة من حديث جبريل',
      claimsToResolve: [
        {
          claimId: 'c_hadith_jibril_direct',
          statement: 'روي في حديث جبريل أن أركان الإسلام خمسة: شهادة أن لا إله إلا الله وأن محمداً رسول الله، وإقام الصلاة، وإيتاء الزكاة، وصوم رمضان، وحج البيت',
          importance: 'CORE',
          requiredEvidenceType: 'PROPHETIC_HADITH_TEXT'
        }
      ]
    };

    const jibrilHadithChunk = {
      chunkId: 'rec_synth_jibril_full_islam',
      recordId: 'rec_synth_jibril_full_islam_rec',
      sourceId: 'src_hadith_muslim',
      sourceName: 'صحيح مسلم',
      domain: 'HADITH',
      title: 'باب بيان الإيمان والإسلام والإحسان',
      section: 'كتاب الإيمان',
      text: 'قال: يا محمد أخبرني عن الإسلام، فقال رسول الله ﷺ: الإسلام أن تشهد أن لا إله إلا الله وأن محمداً رسول الله، وتقيم الصلاة، وتؤتي الزكاة، وتصوم رمضان، وتحج البيت إن استطعت إليه سبيلاً.',
      evidenceType: 'PROPHETIC_HADITH_TEXT',
      scores: { lexicalScore: 9.5, semanticScore: 0.92 }
    };

    const retrievalResult = {
      queryId: 'qret_hadith_jibril_direct',
      claims: [{ claimId: 'c_hadith_jibril_direct', candidates: [jibrilHadithChunk] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.equal(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'Full Hadith of Jibril must be DIRECT for pillars of Islam query');
    assert.equal(ev.answersExactClaim, true);
    assert.equal(ev.materialClaimCoverage, 'COMPLETE');
  });

  // Test 30: Clear Contradiction Detection: Claiming Riba is Halal vs Explicit Quran Prohibition
  it('30. should detect contradiction when claim asserts Riba is permissible against Quran prohibition', async () => {
    const interpretation = {
      originalQuestion: 'هل يجوز التعامل بالربا والقروض ذات الفائدة البنكية شرعاً؟',
      task: 'VERIFY_RULING',
      userGoal: 'معرفة حكم فوائد البنوك الربوية',
      claimsToResolve: [
        {
          claimId: 'c_riba_contradiction',
          statement: 'التعامل بالربا وفائدة القروض حلال مباح شرعاً ولا حرج فيه في القرآن الكريم',
          importance: 'CORE',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
        }
      ]
    };

    const ribaVerseChunk = {
      chunkId: 'rec_synth_quran_riba_prohibition',
      recordId: 'rec_synth_quran_riba_prohibition_rec',
      sourceId: 'src_quran_text',
      sourceName: 'القرآن الكريم',
      domain: 'QURAN',
      title: 'سورة البقرة آية 275',
      section: 'أحكام المعاملات المالية',
      text: 'وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا ۚ فَمَن جَاءَهُ مَوْعِظَةٌ مِّن رَّبِّهِ فَانتَهَىٰ فَلَهُ مَا سَلَفَ وَأَمْرُهُ إِلَى اللَّهِ',
      evidenceType: 'QURANIC_CANONICAL_TEXT',
      scores: { lexicalScore: 8.8, semanticScore: 0.85 }
    };

    const retrievalResult = {
      queryId: 'qret_riba_contradiction',
      claims: [{ claimId: 'c_riba_contradiction', candidates: [ribaVerseChunk] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.equal(ev.relation, EVIDENCE_RELATIONS.DIRECT);
    assert.equal(ev.contradictsClaim, true, 'Prohibition verse must contradict claim asserting Riba is halal');
    assert.equal(ev.supportsClaim, false);
    assert.equal(ev.materialClaimCoverage, 'COMPLETE');
  });

  // Test 31: Clear UNRELATED case with zero topic relevance
  it('31. should classify completely irrelevant agricultural slaughtering chunk as UNRELATED for prayer timing claim', async () => {
    const interpretation = {
      originalQuestion: 'ما هو وقت صلاة الفجر الشرعي بالتحديد؟',
      task: 'VERIFY_RULING',
      userGoal: 'معرفة وقت صلاة الفجر',
      claimsToResolve: [
        {
          claimId: 'c_prayer_timing',
          statement: 'يبدأ وقت صلاة الفجر بطلوع الفجر الصادق ويمتد حتى طلوع الشمس',
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    const slaughteringChunk = {
      chunkId: 'rec_synth_slaughter_unrelated',
      recordId: 'rec_synth_slaughter_unrelated_rec',
      sourceId: 'src_fiqh_sample',
      sourceName: 'الفقه الإسلامي',
      domain: 'FIQH',
      title: 'كتاب الذبائح والصيد',
      section: 'شروط نحر الإبل وعقر الشارد',
      text: 'يُشترط في تذكية الإبل النحر في اللبة مع التسمية وقطع الودجين والمريء.',
      evidenceType: 'SCHOLARLY_EXPLANATION',
      scores: { lexicalScore: 0.0, semanticScore: 0.12 }
    };

    const retrievalResult = {
      queryId: 'qret_unrelated_test',
      claims: [{ claimId: 'c_prayer_timing', candidates: [slaughteringChunk] }]
    };

    const result = await service.verifyEvidence({ interpretation, retrievalResult, options: { mode: 'deterministic' } });
    const ev = result.claims[0].evidence[0];
    assert.equal(ev.relation, EVIDENCE_RELATIONS.UNRELATED);
    assert.equal(ev.materialClaimCoverage, 'NONE');
    assert.equal(ev.evidenceTypeMatches, false);
  });

  // Test 32: Real AI-Mode Verification on a Compound Trap (Audit second-pass verified)
  it('32. Real AI: should reject DIRECT and enforce SUPPORTING on a compound claim when Gemini AI is active', async () => {
    if (!isGeminiConfigured()) {
      return; // Skip if no API key
    }

    const interpretation = {
      originalQuestion: 'هل ذكر في القرآن الكريم تفاصيل أحكام غسيل الأموال المعاصرة؟',
      task: 'VERIFY_RULING',
      userGoal: 'التحقق من تفاصيل غسيل الأموال في القرآن',
      claimsToResolve: [
        {
          claimId: 'c_ai_trap_compound',
          statement: 'نص القرآن الكريم على تجريم غسيل الأموال المعاصر بجميع توصيفاته الجنائية والمصرفية الحديثة',
          importance: 'CORE',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
        }
      ]
    };

    const generalEatingWealthVerse = {
      chunkId: 'rec_synth_wealth_general',
      recordId: 'rec_synth_wealth_general_rec',
      sourceId: 'src_quran_text',
      sourceName: 'القرآن الكريم',
      domain: 'QURAN',
      title: 'سورة البقرة آية 188',
      section: 'أحكام الأموال',
      text: 'وَلَا تَأْكُلُوا أَمْوَالَكُم بَيْنَكُم بِالْبَاطِلِ وَتُدْلُوا بِهَا إِلَى الْحُكَّامِ لِتَأْكُلُوا فَرِيقًا مِّنْ أَمْوَالِ النَّاسِ بِالْإِثْمِ وَأَنتُمْ تَعْلَمُونَ',
      evidenceType: 'QURANIC_CANONICAL_TEXT',
      scores: { lexicalScore: 7.9, semanticScore: 0.76 }
    };

    const retrievalResult = {
      queryId: 'qret_ai_trap_test',
      claims: [{ claimId: 'c_ai_trap_compound', candidates: [generalEatingWealthVerse] }]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'ai', allowFallback: false }
    });

    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT, 'AI verifier + Audit must NOT permit DIRECT for compound modern claim');
    assert.equal(ev.relation, EVIDENCE_RELATIONS.SUPPORTING);
    assert.notEqual(ev.materialClaimCoverage, 'COMPLETE');
  });

  // Test 33: Explicit Quranic Direct Contradiction
  it('33. Phase 5C: should classify explicit Quran prohibition as DIRECT contradiction against permissibility claim', async () => {
    const interpretation = {
      originalQuestion: 'هل يبيح القرآن الكريم الربا الصريح؟',
      task: 'VERIFY_RULING',
      userGoal: 'التحقق من حلية أو حرمة الربا',
      claimsToResolve: [
        {
          claimId: 'c_riba_permissible',
          statement: 'القرآن الكريم يبيح الربا ويعتبره حلالاً جائزاً',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
        }
      ]
    };

    const ribaProhibitionChunk = {
      chunkId: 'chk_quran_riba_prohibition',
      recordId: 'rec_quran_riba_prohibition',
      sourceId: 'src_quran_text',
      sourceName: 'القرآن الكريم',
      domain: 'QURAN',
      title: 'سورة البقرة آية 275',
      section: 'أحكام الربا',
      text: 'وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا',
      evidenceType: 'QURANIC_CANONICAL_TEXT',
      scores: { lexicalScore: 9.0, semanticScore: 0.85 }
    };

    const retrievalResult = {
      queryId: 'qret_contradiction_quran',
      claims: [{ claimId: 'c_riba_permissible', candidates: [ribaProhibitionChunk] }]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'deterministic' }
    });

    const ev = result.claims[0].evidence[0];
    assert.equal(ev.relation, EVIDENCE_RELATIONS.DIRECT);
    assert.equal(ev.supportsClaim, false);
    assert.equal(ev.contradictsClaim, true);
    assert.equal(ev.answersExactClaim, true);
    assert.equal(ev.materialClaimCoverage, 'COMPLETE');
  });

  // Test 34: Explicit Hadith Takhrij Direct Contradiction
  it('34. Phase 5C: should classify Hadith takhrij proving Mawdoo as DIRECT contradiction against authenticity claim', async () => {
    const interpretation = {
      originalQuestion: 'هل حديث حب الوطن من الإيمان حديث صحيح ثابت في الصحيحين؟',
      task: 'VERIFY_HADITH',
      userGoal: 'التحقق من صحة الحديث',
      claimsToResolve: [
        {
          claimId: 'c_hadith_watn_sahih',
          statement: 'حديث حب الوطن من الإيمان حديث صحيح ثابت متفق عليه في صحيح البخاري',
          requiredEvidenceType: 'HADITH_GRADING'
        }
      ]
    };

    const takhrijMawdooChunk = {
      chunkId: 'chk_dorar_watn_mawdoo',
      recordId: 'rec_dorar_watn_mawdoo',
      sourceId: 'src_dorar_hadith',
      sourceName: 'الدرر السنية - الموسوعة الحديثية',
      domain: 'HADITH',
      title: 'تخريج مقولة حب الوطن من الإيمان',
      section: 'أحاديث مشتهرة لا أصل لها',
      text: 'مقولة: «حب الوطن من الإيمان»؛ خلاصة حكم المحدث: موضوع، لا أصل له مكذوب على النبي صلى الله عليه وسلم.',
      evidenceType: 'HADITH_GRADING',
      scores: { lexicalScore: 8.5, semanticScore: 0.80 }
    };

    const retrievalResult = {
      queryId: 'qret_contradiction_hadith',
      claims: [{ claimId: 'c_hadith_watn_sahih', candidates: [takhrijMawdooChunk] }]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'deterministic' }
    });

    const ev = result.claims[0].evidence[0];
    assert.equal(ev.relation, EVIDENCE_RELATIONS.DIRECT);
    assert.equal(ev.supportsClaim, false);
    assert.equal(ev.contradictsClaim, true);
    assert.equal(ev.answersExactClaim, true);
    assert.equal(ev.materialClaimCoverage, 'COMPLETE');
  });

  // Test 35: Historical General Pardon Direct Contradiction
  it('35. Phase 5C: should classify general pardon text as DIRECT contradiction against mass execution claim', async () => {
    const interpretation = {
      originalQuestion: 'هل أباد الرسول أهل مكة وانتقم بقتلهم عند فتح مكة؟',
      task: 'VERIFY_HISTORY',
      userGoal: 'التحقق من وقائع فتح مكة',
      claimsToResolve: [
        {
          claimId: 'c_mecca_mass_execution',
          statement: 'الرسول انتقم بقتل جميع أهل مكة وأبادهم عند فتح مكة',
          requiredEvidenceType: 'HISTORICAL_FACT'
        }
      ]
    };

    const meccaPardonChunk = {
      chunkId: 'chk_sira_mecca_pardon',
      recordId: 'rec_sira_mecca_pardon',
      sourceId: 'src_seerah_sample',
      sourceName: 'السيرة النبوية لابن هشام',
      domain: 'HISTORY',
      title: 'فتح مكة والعفو العام',
      section: 'دخول مكة',
      text: 'لما وقف رسول الله صلى الله عليه وسلم على باب الكعبة قال لأهل مكة: ما ترون أني فاعل بكم؟ قالوا: خيراً أخ كريم وابن أخ كريم، فقال: اذهبوا فأنتم الطلقاء وعفا عنهم.',
      evidenceType: 'HISTORICAL_FACT',
      scores: { lexicalScore: 8.0, semanticScore: 0.78 }
    };

    const retrievalResult = {
      queryId: 'qret_contradiction_history',
      claims: [{ claimId: 'c_mecca_mass_execution', candidates: [meccaPardonChunk] }]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'deterministic' }
    });

    const ev = result.claims[0].evidence[0];
    assert.equal(ev.relation, EVIDENCE_RELATIONS.DIRECT);
    assert.equal(ev.supportsClaim, false);
    assert.equal(ev.contradictsClaim, true);
    assert.equal(ev.answersExactClaim, true);
  });

  // Test 36: Fails to Support vs Contradicts (Neutral irrelevant evidence)
  it('36. Phase 5C: should distinguish "fails to support" from "contradicts" (irrelevant text is UNRELATED, not contradictory)', async () => {
    const interpretation = {
      originalQuestion: 'ما هي أحكام مواريث العصبة في الفقه؟',
      task: 'VERIFY_RULING',
      userGoal: 'معرفة أحكام المواريث',
      claimsToResolve: [
        {
          claimId: 'c_inheritance_asabah',
          statement: 'العصبة بالنفس يأخذون ما أبقت الفروض عند انعدام الحجب',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    const taharahChunk = {
      chunkId: 'chk_wudu_sunan',
      recordId: 'rec_wudu_sunan',
      sourceId: 'src_fiqh_sample',
      sourceName: 'الفقه الميسر',
      domain: 'FIQH',
      title: 'كتاب الطهارة',
      section: 'سنن الوضوء',
      text: 'من سنن الوضوء التسمية في أوله، والسواك، والمضمضة والاستنشاق بثلاث غرفات.',
      evidenceType: 'SCHOLARLY_EXPLANATION',
      scores: { lexicalScore: 0.0, semanticScore: 0.05 }
    };

    const retrievalResult = {
      queryId: 'qret_neutral_irrelevant',
      claims: [{ claimId: 'c_inheritance_asabah', candidates: [taharahChunk] }]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'deterministic' }
    });

    const ev = result.claims[0].evidence[0];
    assert.equal(ev.relation, EVIDENCE_RELATIONS.UNRELATED);
    assert.equal(ev.supportsClaim, false);
    assert.equal(ev.contradictsClaim, false, 'Irrelevant text does NOT contradict the claim');
  });

  // Test 37: Contextual disagreement vs Direct Contradiction
  it('37. Phase 5C: should classify contextual scholarly disagreement as SUPPORTING/CONTEXTUAL rather than DIRECT contradiction', async () => {
    const interpretation = {
      originalQuestion: 'ما حكم قراءة الفاتحة للمأموم في الصلاة الجهرية؟',
      task: 'VERIFY_RULING',
      userGoal: 'معرفة حكم الفاتحة للمأموم',
      claimsToResolve: [
        {
          claimId: 'c_fatihah_mamum',
          statement: 'تجب قراءة الفاتحة على المأموم في الصلاة الجهرية والسرية',
          requiredEvidenceType: 'SCHOLARLY_EXPLANATION'
        }
      ]
    };

    const hanafiDisagreementChunk = {
      chunkId: 'chk_fatihah_hanafi',
      recordId: 'rec_fatihah_hanafi',
      sourceId: 'src_fiqh_sample',
      sourceName: 'بدائع الصنائع',
      domain: 'FIQH',
      title: 'صفة الصلاة',
      section: 'قراءة المأموم خلف الإمام',
      text: 'ذهب الحنفية إلى كراهة قراءة المأموم خلف الإمام في السرية والجهرية لقوله تعالى: وإذا قرئ القرآن فاستمعوا له وأنصتوا.',
      evidenceType: 'SCHOLARLY_EXPLANATION',
      scores: { lexicalScore: 6.5, semanticScore: 0.68 }
    };

    const retrievalResult = {
      queryId: 'qret_contextual_disagreement',
      claims: [{ claimId: 'c_fatihah_mamum', candidates: [hanafiDisagreementChunk] }]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'deterministic' }
    });

    const ev = result.claims[0].evidence[0];
    assert.notEqual(ev.relation, EVIDENCE_RELATIONS.DIRECT);
    assert.ok(ev.relation === EVIDENCE_RELATIONS.SUPPORTING || ev.relation === EVIDENCE_RELATIONS.CONTEXTUAL);
  });

  // Test 38: Unrelated evidence with opposite/distinct terminology
  it('38. Phase 5C: should classify evidence with distinct ethical vocabulary as UNRELATED when propositions do not overlap', async () => {
    const interpretation = {
      originalQuestion: 'ما حكم القتل بغير حق في الإسلام؟',
      task: 'VERIFY_RULING',
      userGoal: 'معرفة تحريم القتل',
      claimsToResolve: [
        {
          claimId: 'c_murder_prohibition',
          statement: 'قتل النفس التي حرم الله بغير حق من أكبر الكبائر المحرمة قطعاً',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
        }
      ]
    };

    const zakatChunk = {
      chunkId: 'chk_zakat_crops',
      recordId: 'rec_zakat_crops',
      sourceId: 'src_fiqh_sample',
      sourceName: 'الفقه الميسر',
      domain: 'FIQH',
      title: 'كتاب الزكاة',
      section: 'زكاة الحبوب والثمار',
      text: 'تجب الزكاة في الحبوب والثمار إذا بلغت خمسة أوسق وكان نصابها مما يكال ويدخر.',
      evidenceType: 'SCHOLARLY_EXPLANATION',
      scores: { lexicalScore: 0.0, semanticScore: 0.08 }
    };

    const retrievalResult = {
      queryId: 'qret_unrelated_vocab',
      claims: [{ claimId: 'c_murder_prohibition', candidates: [zakatChunk] }]
    };

    const result = await service.verifyEvidence({
      interpretation,
      retrievalResult,
      options: { mode: 'deterministic' }
    });

    const ev = result.claims[0].evidence[0];
    assert.equal(ev.relation, EVIDENCE_RELATIONS.UNRELATED);
    assert.equal(ev.supportsClaim, false);
    assert.equal(ev.contradictsClaim, false);
  });

  // Test 39: Rate-limit 429 Mock Retry -> Succeeds on Retry
  it('39. Phase 5C: should retry on HTTP 429 and succeed when retry provides valid structured verdict', async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;

    globalThis.fetch = async (url, opts) => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: false,
          status: 429,
          headers: new Headers({ 'retry-after': '0.05' }),
          text: async () => 'Rate limit exceeded: quota 15 RPM. retry in 0.05s'
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      verdicts: [
                        {
                          chunkId: 'chk_mock_retry_test',
                          relation: 'DIRECT',
                          answersExactClaim: true,
                          supportsClaim: true,
                          contradictsClaim: false,
                          preservesQuestionIntent: true,
                          scopeMatches: true,
                          requiresExternalInference: false,
                          materialClaimCoverage: 'COMPLETE',
                          evidenceTypeMatches: true,
                          confidence: 0.95,
                          reason: 'تم التحقق بنجاح بعد محاولة إعادة الاتصال.'
                        }
                      ]
                    })
                  }
                ]
              }
            }
          ]
        })
      };
    };

    try {
      const claim = {
        claimId: 'c_mock_test',
        statement: 'دعوى اختبار إعادة المحاولة على 429',
        requiredEvidenceType: 'TEXTUAL_EVIDENCE'
      };
      const candidateChunks = [
        {
          chunkId: 'chk_mock_retry_test',
          title: 'باب الاختبار',
          text: 'نص دقيق مطابق للادعاء بالكامل',
          sourceName: 'مصدر تجريبي',
          domain: 'GENERAL'
        }
      ];

      const { verifyClaimEvidence } = await import('../src/mishkat/evidence/evidenceVerifier.js');
      const verdicts = await verifyClaimEvidence({
        claim,
        candidateChunks,
        questionContext: { originalQuestion: 'سؤال تجريبي' },
        options: { mode: 'ai', maxRateLimitRetries: 3, skipDirectAudit: true }
      });

      assert.ok(callCount >= 2, `Expected at least 2 fetch calls, got ${callCount}`);
      assert.equal(verdicts.length, 1);
      assert.equal(verdicts[0].chunkId, 'chk_mock_retry_test');
      assert.equal(verdicts[0].relation, 'DIRECT');
      assert.equal(verdicts[0].verificationStatus, VERIFICATION_STATUS.VERIFIED);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Test 40: Persistent HTTP 429 Exhaustion -> Returns VERIFICATION_ERROR with relation: null (NEVER UNRELATED)
  it('40. Phase 5C: should return VERIFICATION_ERROR with relation: null when 429 retries are exhausted (never UNRELATED)', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () => ({
      ok: false,
      status: 429,
      headers: new Headers({ 'retry-after': '0.01' }),
      text: async () => 'Rate limit exhausted continuously'
    });

    try {
      const claim = {
        claimId: 'c_mock_exhaust_test',
        statement: 'دعوى اختبار نفاد المحاولات',
        requiredEvidenceType: 'TEXTUAL_EVIDENCE'
      };
      const candidateChunks = [
        {
          chunkId: 'chk_mock_exhaust_test',
          title: 'باب الاختبار المعطل',
          text: 'نص تجريبي لاختبار فشل الاتصال المستمر',
          sourceName: 'مصدر تجريبي',
          domain: 'GENERAL'
        }
      ];

      const { verifyClaimEvidence } = await import('../src/mishkat/evidence/evidenceVerifier.js');
      const verdicts = await verifyClaimEvidence({
        claim,
        candidateChunks,
        questionContext: { originalQuestion: 'سؤال تجريبي' },
        options: { mode: 'ai', maxRateLimitRetries: 1, allowFallback: false }
      });

      assert.equal(verdicts.length, 1);
      const v = verdicts[0];
      assert.equal(v.verificationStatus, VERIFICATION_STATUS.VERIFICATION_ERROR);
      assert.equal(v.relation, null, 'Must be relation: null on API failure, NEVER fabricated as UNRELATED');
      assert.ok(v.reason.includes('فشل التحقق عبر الذكاء الاصطناعي'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

