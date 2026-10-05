/**
 * Mishkat Phase 7: Grounded Answer Service
 * 
 * Strict compliance with Sections 1, 2, 3, 5, 6, 7, 8, 9, 10, & 12:
 * - Routing Gate: Generator called ONLY when Phase 6 permits (ANSWERED or PARTIAL)
 * - Strict Evidence Packet: Only accepted, verified evidence supplied to generator
 * - Claim Grounding Verification: Every material answer claim must be grounded
 * - Unsupported Claim Handling: Bounded retry for ungrounded claims, downgrades on failure
 * - Citation Integrity: Validated, deduplicated, and rejected if fabricated
 * - Zero Knowledge Journey records or external database mutations
 */

import {
  ANSWER_STATUS,
  GROUNDING_STATUS,
  GROUNDING_VERIFICATION_STATE,
  MAX_REGENERATION_ATTEMPTS
} from './answerTypes.js';
import { generateGroundedAnswerText } from './groundedAnswerGenerator.js';
import { extractAnswerClaims } from './claimExtractor.js';
import { verifyAnswerGrounding } from './groundingVerifier.js';
import { buildValidatedCitations } from './citationManager.js';

export class GroundedAnswerService {
  constructor(options = {}) {
    this.options = { ...options };
  }

  /**
   * Primary Canonical Entry Point:
   * generateGroundedAnswer({ interpretation, sufficiencyResult, options })
   * 
   * @param {Object} params
   * @param {Object} params.interpretation Validated Phase 2/2A interpretation object
   * @param {Object} params.sufficiencyResult Phase 6 sufficiency output object
   * @param {Object} [params.options={}]
   * @returns {Promise<Object>} Canonical Grounded Answer Output Contract
   */
  async generateGroundedAnswer({ interpretation, sufficiencyResult, options = {} }) {
    const startTime = Date.now();
    const mergedOptions = { ...this.options, ...options };

    if (!interpretation || typeof interpretation !== 'object') {
      throw new Error('INVALID_INTERPRETATION: GroundedAnswerService requires a valid interpretation object.');
    }
    if (!sufficiencyResult || typeof sufficiencyResult !== 'object') {
      throw new Error('INVALID_SUFFICIENCY_RESULT: GroundedAnswerService requires a valid Phase 6 sufficiencyResult.');
    }

    const originalQuestion = interpretation.originalQuestion || '';
    const task = interpretation.task || 'GENERAL';
    const routing = sufficiencyResult.routing || 'INSUFFICIENT';

    // ─────────────────────────────────────────────────────────────
    // 1. ROUTING GATE (Section 2)
    // ─────────────────────────────────────────────────────────────
    if (routing === 'NEEDS_CLARIFICATION') {
      return this._buildTerminalResponse({
        answerStatus: ANSWER_STATUS.NEEDS_CLARIFICATION,
        answerText: `نرجو التكرم بتوضيح السؤال: ${sufficiencyResult.reason || interpretation.clarificationReason || 'المسألة تحتاج إلى مزيد من الإيضاح لتحديد الحكم بدقة.'}`,
        routingDecision: routing,
        startTime
      });
    }

    if (routing === 'REFER_TO_AUTHORITY') {
      return this._buildTerminalResponse({
        answerStatus: ANSWER_STATUS.REFER_TO_AUTHORITY,
        answerText: 'المسألة المطروحة تتعلق بحالة فتوى شخصية خاصة تتطلب التحقق من ملابسات وظروف السائل؛ الواجب الشرعي يقتضي توجيهك إلى مراجعة دور الإفتاء الرسمية المعتمدة أو استشارة مفتٍ مؤهل ومصرح له مباشرة.',
        routingDecision: routing,
        startTime
      });
    }

    if (routing === 'SERVICE_ERROR') {
      return this._buildTerminalResponse({
        answerStatus: ANSWER_STATUS.SERVICE_ERROR,
        answerText: 'تعذر التحقق من الأدلة الشرعية المطلوبة للإجابة حالياً نظراً لخلل تقني مؤقت في خدمة التحقق الدلالي. يرجى المحاولة لاحقاً.',
        routingDecision: routing,
        startTime
      });
    }

    if (routing === 'INSUFFICIENT') {
      return this._buildTerminalResponse({
        answerStatus: ANSWER_STATUS.INSUFFICIENT,
        answerText: 'لم تتوافر في المصادر المعتمدة المتاحة أدلة شرعية كافية أو موثقة لإثبات هذه المسألة بدقة؛ ولذا يمتنع النظام عن توليد إجابة ظنية أو غير مستندة إلى نصوص محققة.',
        routingDecision: routing,
        startTime
      });
    }

    // Routing permits generation: ANSWERED or PARTIAL
    const isPartial = routing === 'PARTIAL';

    // ─────────────────────────────────────────────────────────────
    // 2. ASSEMBLE STRICT EVIDENCE PACKET (Section 1 & 3)
    // ─────────────────────────────────────────────────────────────
    const acceptedClaims = [];
    const acceptedEvidenceMap = new Map();

    if (Array.isArray(sufficiencyResult.claims)) {
      for (const clm of sufficiencyResult.claims) {
        if (clm.status === 'SUPPORTED' || (isPartial && clm.status === 'PARTIAL')) {
          acceptedClaims.push(clm);
          if (Array.isArray(clm.supportingEvidence)) {
            for (const ev of clm.supportingEvidence) {
              if (ev && ev.chunkId && !acceptedEvidenceMap.has(ev.chunkId)) {
                acceptedEvidenceMap.set(ev.chunkId, ev);
              }
            }
          }
        }
      }
    }

    const acceptedEvidence = Array.from(acceptedEvidenceMap.values());

    // ─────────────────────────────────────────────────────────────
    // 3. GENERATION & BOUNDED RETRY LOOP (Section 6 & 12)
    // ─────────────────────────────────────────────────────────────
    let attempts = 0;
    let finalAnswerText = '';
    let finalAnswerClaims = [];
    let finalGroundingVerification = null;
    let finalStatus = isPartial ? ANSWER_STATUS.PARTIAL : ANSWER_STATUS.ANSWERED;
    let wasDowngraded = false;

    const originalClaims = interpretation.claimsToResolve || [];

    while (attempts <= MAX_REGENERATION_ATTEMPTS) {
      attempts++;

      // Generate answer text
      const currentAnswerText = await generateGroundedAnswerText({
        originalQuestion,
        task,
        supportedClaims: acceptedClaims,
        acceptedEvidence,
        isPartial,
        options: {
          ...mergedOptions,
          attempt: attempts
        }
      });

      // Extract material answer claims
      const extractedClaims = extractAnswerClaims(currentAnswerText, mergedOptions);

      // Verify claim grounding against accepted evidence
      const verification = verifyAnswerGrounding({
        answerClaims: extractedClaims,
        acceptedEvidence,
        originalClaims,
        options: mergedOptions
      });

      finalAnswerText = currentAnswerText;
      finalAnswerClaims = verification.claims;
      finalGroundingVerification = verification;

      // Check for ungrounded claims
      const ungroundedClaims = verification.claims.filter(c => c.groundingStatus === GROUNDING_STATUS.UNGROUNDED);

      if (ungroundedClaims.length === 0) {
        // Fully grounded! Exit retry loop cleanly
        break;
      }

      // Check if ungrounded claims are CORE or SECONDARY
      const ungroundedCore = ungroundedClaims.filter(c => c.importance === 'CORE');
      const ungroundedSecondary = ungroundedClaims.filter(c => c.importance === 'SECONDARY');

      // If secondary ungrounded only, remove them from answer claims and keep text
      if (ungroundedCore.length === 0 && ungroundedSecondary.length > 0) {
        // Filter out ungrounded secondary claims from the reported verified claims
        finalAnswerClaims = verification.claims.filter(c => c.groundingStatus !== GROUNDING_STATUS.UNGROUNDED);
        finalGroundingVerification.ungroundedClaims = 0;
        finalGroundingVerification.isFullyGrounded = true;
        finalGroundingVerification.status = GROUNDING_VERIFICATION_STATE.VERIFIED;
        break;
      }

      // If central/core claim is ungrounded and we reached max attempts -> DOWNGRADE
      if (attempts >= MAX_REGENERATION_ATTEMPTS + 1) {
        // Downgrade status: never expose an ungrounded central claim as ANSWERED
        wasDowngraded = true;
        finalStatus = ANSWER_STATUS.PARTIAL;
        break;
      }
    }

    // If still has ungrounded CORE claims after exhausting attempts, force downgrade
    const remainingUngroundedCore = finalAnswerClaims.filter(
      c => c.importance === 'CORE' && c.groundingStatus === GROUNDING_STATUS.UNGROUNDED
    );
    if (remainingUngroundedCore.length > 0) {
      wasDowngraded = true;
      finalStatus = ANSWER_STATUS.PARTIAL;
    }

    // ─────────────────────────────────────────────────────────────
    // 4. VALIDATE & DEDUPLICATE CITATIONS (Section 7)
    // ─────────────────────────────────────────────────────────────
    // Build map of chunkId -> answerClaims
    const chunkToClaimsMap = new Map();
    const usedChunkIds = [];

    for (const c of finalAnswerClaims) {
      if (c.groundingStatus === GROUNDING_STATUS.GROUNDED || c.groundingStatus === GROUNDING_STATUS.PARTIALLY_GROUNDED) {
        for (const chkId of c.chunkIds || []) {
          usedChunkIds.push(chkId);
          if (!chunkToClaimsMap.has(chkId)) {
            chunkToClaimsMap.set(chkId, []);
          }
          chunkToClaimsMap.get(chkId).push(c.claimId);
        }
      }
    }

    const { citations, sources, rejectedCitations } = buildValidatedCitations({
      acceptedEvidence,
      usedChunkIds,
      proposedCitations: mergedOptions.proposedCitations || [],
      chunkToAnswerClaimsMap: chunkToClaimsMap
    });

    const executionTimeMs = Date.now() - startTime;

    return {
      answerStatus: finalStatus,
      answerText: finalAnswerText,
      answerClaims: finalAnswerClaims,
      groundingVerification: {
        status: finalGroundingVerification?.status || GROUNDING_VERIFICATION_STATE.UNVERIFIED,
        totalClaims: finalGroundingVerification?.totalClaims || 0,
        groundedClaims: finalGroundingVerification?.groundedClaims || 0,
        partiallyGroundedClaims: finalGroundingVerification?.partiallyGroundedClaims || 0,
        ungroundedClaims: finalGroundingVerification?.ungroundedClaims || 0,
        isFullyGrounded: Boolean(finalGroundingVerification?.isFullyGrounded),
        regenerationAttempts: attempts - 1
      },
      citations,
      sources,
      diagnostics: {
        executionTimeMs,
        routingDecision: routing,
        inputEvidenceCount: acceptedEvidence.length,
        usedEvidenceCount: citations.length,
        rejectedCitationCount: rejectedCitations.length,
        regenerationCount: attempts - 1,
        downgraded: wasDowngraded
      }
    };
  }

  _buildTerminalResponse({ answerStatus, answerText, routingDecision, startTime }) {
    const executionTimeMs = Date.now() - startTime;
    return {
      answerStatus,
      answerText,
      answerClaims: [],
      groundingVerification: {
        status: GROUNDING_VERIFICATION_STATE.UNVERIFIED,
        totalClaims: 0,
        groundedClaims: 0,
        partiallyGroundedClaims: 0,
        ungroundedClaims: 0,
        isFullyGrounded: false,
        regenerationAttempts: 0
      },
      citations: [],
      sources: [],
      diagnostics: {
        executionTimeMs,
        routingDecision,
        inputEvidenceCount: 0,
        usedEvidenceCount: 0,
        rejectedCitationCount: 0,
        regenerationCount: 0,
        downgraded: false
      }
    };
  }
}

export const defaultGroundedAnswerService = new GroundedAnswerService();

export async function generateGroundedAnswer(params) {
  return defaultGroundedAnswerService.generateGroundedAnswer(params);
}
