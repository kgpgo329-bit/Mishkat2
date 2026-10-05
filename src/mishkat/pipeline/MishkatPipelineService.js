/**
 * Mishkat Canonical Pipeline Service
 *
 * Implements the single canonical production question pipeline connecting:
 * Phase 2  Question Understanding & Atomic Claim Planning
 * Phase 3  Trusted Source Knowledge Repository
 * Phase 4  Hybrid Lexical & Semantic Retrieval
 * Phase 5  Semantic Evidence Verification
 * Phase 6  Evidence Sufficiency Evaluation
 * Phase 7  Grounded Answer Generation & Grounding Verification
 * Phase 8  Deep Learning Follow-Up Discovery
 * Phase 9  Verified Knowledge Journey Registration
 *
 * INVARIANTS:
 * - One canonical question pipeline (no shortcuts for Deep Learning questions).
 * - Full preservation of routing states (REFER_TO_AUTHORITY, NEEDS_CLARIFICATION, INSUFFICIENT, SERVICE_ERROR).
 * - Never leaks server secrets, internal verification diagnostics, or assessment keys to the client.
 * - Deep Learning questions re-enter this same pipeline with origin: 'DEEP_LEARNING' and parentRecordId.
 */

import { defaultTrustedSourceRepository } from '../knowledge/TrustedSourceRepository.js';
import { RetrievalService } from '../retrieval/RetrievalService.js';
import { EvidenceVerificationService } from '../evidence/EvidenceVerificationService.js';
import { EvidenceSufficiencyService } from '../sufficiency/EvidenceSufficiencyService.js';
import { GroundedAnswerService, ANSWER_STATUS } from '../answer/index.js';
import { DeepLearningService } from '../deeplearning/DeepLearningService.js';
import { JourneyService } from '../journey/JourneyService.js';
import { InMemoryJourneyStorage } from '../journey/journeyStorage.js';
import {
  processQuestionInterpretationAsync,
  processQuestionInterpretation
} from '../question/questionInterpreter.js';

export class MishkatPipelineService {
  /**
   * @param {Object} [dependencies] Injected dependencies for testing / custom storage
   */
  constructor(dependencies = {}) {
    this.repository = dependencies.repository || defaultTrustedSourceRepository;
    this.retrievalService = dependencies.retrievalService || new RetrievalService({ embeddingProvider: 'auto' });
    this.evidenceService = dependencies.evidenceService || new EvidenceVerificationService({ mode: 'auto' });
    this.sufficiencyService = dependencies.sufficiencyService || new EvidenceSufficiencyService();
    this.answerService = dependencies.answerService || new GroundedAnswerService();
    this.deepLearningService = dependencies.deepLearningService || new DeepLearningService();

    // Session-aware journey service: maps sessionId -> JourneyService or shared storage
    this.journeyStorage = dependencies.journeyStorage || new InMemoryJourneyStorage();
    this.journeyService = dependencies.journeyService || new JourneyService(this.journeyStorage);

    this._initialized = false;
  }

  /**
   * Ensures knowledge repository and retrieval index are loaded into memory.
   */
  async initialize() {
    if (this._initialized) return;

    if (this.repository.chunkCount === 0) {
      this.repository.loadFromDisk('data/knowledge');
    }
    await this.retrievalService.initializeWithRepository(this.repository);
    this._initialized = true;
  }

  /**
   * Primary Canonical Pipeline Entry Point:
   *
   * @param {Object} params
   * @param {string} params.questionText User or follow-up question
   * @param {string} [params.sessionId] Session identifier
   * @param {string} [params.origin='USER_QUESTION'] 'USER_QUESTION' | 'DEEP_LEARNING'
   * @param {string|null} [params.parentRecordId=null] ID of parent record if origin is DEEP_LEARNING
   * @param {Object} [params.options={}] Injectable overrides for testing/offline mode
   * @returns {Promise<Object>} Client-Safe Unified Response Payload
   */
  async processQuestion({
    questionText,
    sessionId = 'default_session',
    origin = 'USER_QUESTION',
    parentRecordId = null,
    options = {}
  }) {
    if (!questionText || typeof questionText !== 'string' || questionText.trim().length === 0) {
      throw new Error('INVALID_QUESTION: questionText is required and must be non-empty.');
    }

    await this.initialize();

    const cleanQuestion = questionText.trim();

    // ── 1. Question Understanding & Atomic Claim Planning ─────────────────
    let interpretation;
    if (options.interpretationOverride) {
      interpretation = options.interpretationOverride;
    } else if (options.mode === 'deterministic' || options.forceFallback === true) {
      interpretation = processQuestionInterpretation(cleanQuestion);
    } else {
      interpretation = await processQuestionInterpretationAsync(cleanQuestion, options);
    }

    // ── 2. Special Early Routing Gates ─────────────────────────────────────
    // A) Personal Fatwa -> immediate referral to authority (no ruling hallucinated)
    if (interpretation.task === 'PERSONAL_FATWA' || interpretation.isPersonalFatwa === true) {
      return this._buildSpecialRoutingResponse({
        status: ANSWER_STATUS.REFER_TO_AUTHORITY,
        statusLabel: 'إحالة إلى دار الإفتاء',
        answerText: 'المسألة المطروحة تتعلق بحالة فتوى شخصية خاصة تتطلب التحقق من ملابسات وظروف السائل؛ الواجب الشرعي يقتضي توجيهك إلى مراجعة دور الإفتاء الرسمية المعتمدة أو استشارة مفتٍ مؤهل ومصرح له مباشرة.',
        sessionId
      });
    }

    // B) Clarification required -> prompt user to clarify
    if (interpretation.task === 'CLARIFICATION' || interpretation.needsClarification === true) {
      return this._buildSpecialRoutingResponse({
        status: ANSWER_STATUS.NEEDS_CLARIFICATION,
        statusLabel: 'استيضاح المطلوب',
        answerText: `نرجو التكرم بتوضيح السؤال: ${interpretation.clarificationReason || 'المسألة تحتاج إلى مزيد من الإيضاح لتحديد الحكم والجواب بدقة.'}`,
        sessionId
      });
    }

    // ── 3. Hybrid Retrieval ────────────────────────────────────────────────
    let retrievalResult;
    if (options.retrievalOverride) {
      retrievalResult = options.retrievalOverride;
    } else {
      retrievalResult = await this.retrievalService.retrieveForInterpretation({
        interpretation,
        repository: this.repository
      });
    }

    // ── 4. Semantic Evidence Verification ─────────────────────────────────
    let verificationResult;
    if (options.verificationOverride) {
      verificationResult = options.verificationOverride;
    } else {
      verificationResult = await this.evidenceService.verifyEvidence({
        interpretation,
        retrievalResult,
        options: {
          mode: options.mode || 'auto',
          ...options
        }
      });
    }

    // ── 5. Evidence Sufficiency Evaluation ────────────────────────────────
    const sufficiencyResult = this.sufficiencyService.evaluateSufficiency({
      interpretation,
      verificationResult,
      options
    });

    // ── 6. Grounded Answer Generation & Grounding Verification ────────────
    const answerResult = await this.answerService.generateGroundedAnswer({
      interpretation,
      sufficiencyResult,
      options
    });

    // ── 7. Deep Learning Follow-Up Discovery ──────────────────────────────
    let deepLearningSuggestions = [];
    if (answerResult.answerStatus === ANSWER_STATUS.ANSWERED && sufficiencyResult.overallSufficiency === 'SUFFICIENT') {
      const dlResult = await this.deepLearningService.generateFollowUps({
        interpretation,
        sufficiencyResult,
        answerResult,
        options
      });
      if (dlResult && Array.isArray(dlResult.suggestions)) {
        deepLearningSuggestions = dlResult.suggestions;
      }
    }

    // ── 8. Knowledge Journey Registration ──────────────────────────────────
    let journeyRecordId = null;
    let addRecordOutcome = null;

    if (
      sufficiencyResult.overallSufficiency === 'SUFFICIENT' &&
      answerResult.answerStatus === ANSWER_STATUS.ANSWERED &&
      answerResult.groundingVerification?.status === 'VERIFIED' &&
      answerResult.groundingVerification?.isFullyGrounded === true
    ) {
      const journeyAddResult = await this.journeyService.addRecord({
        sessionId,
        interpretation,
        sufficiencyResult,
        answerResult,
        origin,
        parentRecordId,
        options
      });

      addRecordOutcome = journeyAddResult.result;
      if (journeyAddResult.record) {
        journeyRecordId = journeyAddResult.record.id;
      }
    }

    // Fetch current Journey State for the session
    const journeyState = await this.journeyService.getJourneyState(sessionId);

    // ── 9. Construct Client-Safe Output Payload ────────────────────────────
    return {
      status: answerResult.answerStatus,
      statusLabel: this._resolveStatusLabel(answerResult.answerStatus),
      answer: answerResult.answerText,
      citations: (answerResult.citations || []).map(c => ({
        chunkId: c.chunkId,
        sourceName: c.sourceName,
        text: c.text
      })),
      sources: (answerResult.sources || []).map(s => ({
        sourceId: s.sourceId,
        sourceName: s.sourceName,
        sourceUrl: s.sourceUrl || ''
      })),
      deepLearningSuggestions: deepLearningSuggestions.map(s => ({
        followUpId: s.followUpId,
        question: s.question,
        origin: s.origin,
        parentRecordId: journeyRecordId // Bound to the newly verified parent record
      })),
      journeyProgress: {
        uniqueVerifiedCount: journeyState.uniqueVerifiedCount,
        targetCount: journeyState.targetCount,
        progressPercentage: journeyState.progressPercentage,
        milestoneReached: journeyState.milestoneReached,
        assessmentEligible: journeyState.assessmentEligible
      },
      assessmentEligible: journeyState.assessmentEligible,
      sessionId,
      recordId: journeyRecordId,
      duplicateDetected: (addRecordOutcome === 'DUPLICATE')
    };
  }

  /**
   * Helper to fetch Journey State directly.
   * @param {string} sessionId
   * @returns {Promise<Object>}
   */
  async getJourneyState(sessionId) {
    return this.journeyService.getJourneyState(sessionId);
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  async _buildSpecialRoutingResponse({ status, statusLabel, answerText, sessionId }) {
    const journeyState = await this.journeyService.getJourneyState(sessionId);
    return {
      status,
      statusLabel,
      answer: answerText,
      citations: [],
      sources: [],
      deepLearningSuggestions: [],
      journeyProgress: {
        uniqueVerifiedCount: journeyState.uniqueVerifiedCount,
        targetCount: journeyState.targetCount,
        progressPercentage: journeyState.progressPercentage,
        milestoneReached: journeyState.milestoneReached,
        assessmentEligible: journeyState.assessmentEligible
      },
      assessmentEligible: journeyState.assessmentEligible,
      sessionId,
      recordId: null,
      duplicateDetected: false
    };
  }

  _resolveStatusLabel(status) {
    switch (status) {
      case ANSWER_STATUS.ANSWERED:
        return 'إجابة موثقة';
      case ANSWER_STATUS.PARTIAL:
        return 'إجابة جزئية موثقة';
      case ANSWER_STATUS.INSUFFICIENT:
        return 'أدلة غير كافية';
      case ANSWER_STATUS.REFER_TO_AUTHORITY:
        return 'إحالة إلى دار الإفتاء';
      case ANSWER_STATUS.NEEDS_CLARIFICATION:
        return 'استيضاح المطلوب';
      case ANSWER_STATUS.SERVICE_ERROR:
        return 'خلل مؤقت في الخدمة';
      default:
        return 'معالجة السؤال';
    }
  }
}

export const defaultMishkatPipeline = new MishkatPipelineService();
export default defaultMishkatPipeline;
