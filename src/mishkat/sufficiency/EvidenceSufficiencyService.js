/**
 * Mishkat Phase 6: Evidence Sufficiency Service
 * 
 * Strict compliance with Sections & Rules:
 * - Canonical entry point: evaluateSufficiency({ interpretation, verificationResult, options })
 * - Claim-by-claim evaluation using Phase 2A atomic claims
 * - Priority Routing:
 *     1. REFER_TO_AUTHORITY (Personal Fatwa)
 *     2. NEEDS_CLARIFICATION (Missing referent / ambiguous query)
 *     3. SERVICE_ERROR (Operational Phase 5 failure on material claim)
 * - Overall Sufficiency:
 *     - SUFFICIENT -> Routing: ANSWERED (All material claims supported, no unresolved conflict)
 *     - PARTIAL    -> Routing: PARTIAL (Some material claims supported/partial, or conflicted)
 *     - INSUFFICIENT -> Routing: INSUFFICIENT (Central/material claim unsupported or no support)
 * - Guarantees Phase 6 NEVER generates final religious answers or calls external AI
 */

import crypto from 'node:crypto';
import {
  CLAIM_SUFFICIENCY_STATUS,
  OVERALL_SUFFICIENCY,
  SUFFICIENCY_ROUTING,
  CLAIM_IMPORTANCE
} from './sufficiencyTypes.js';
import { evaluateClaimSufficiency } from './claimSufficiencyEvaluator.js';

export class EvidenceSufficiencyService {
  constructor(options = {}) {
    this.options = { ...options };
  }

  /**
   * Primary Canonical Entry Point:
   * evaluateSufficiency({ interpretation, verificationResult, options })
   * 
   * @param {Object} params
   * @param {Object} params.interpretation Validated Phase 2/2A interpretation object
   * @param {Object} params.verificationResult Phase 5 verification output object
   * @param {Object} [params.options={}]
   * @returns {Object} Canonical Evidence Sufficiency Output Contract
   */
  evaluateSufficiency({ interpretation, verificationResult, options = {} }) {
    if (!interpretation || typeof interpretation !== 'object') {
      throw new Error('INVALID_INTERPRETATION: evaluateSufficiency requires a valid Phase 2 interpretation object.');
    }

    const mergedOptions = { ...this.options, ...options };
    const sufficiencyId = `suf_${crypto.randomBytes(6).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const originalQuestion = interpretation.originalQuestion || '';
    const verificationId = verificationResult?.verificationId || null;
    const queryId = verificationResult?.queryId || null;

    // ─────────────────────────────────────────────────────────────
    // PRIORITY ROUTING RULE 12: Personal Fatwa Check
    // ─────────────────────────────────────────────────────────────
    if (interpretation.isPersonalFatwa === true) {
      return this._buildTerminalResult({
        sufficiencyId,
        verificationId,
        queryId,
        originalQuestion,
        overallSufficiency: OVERALL_SUFFICIENCY.INSUFFICIENT,
        routing: SUFFICIENCY_ROUTING.REFER_TO_AUTHORITY,
        reason: 'السؤال يتعلق بفتوى شخصية خاصة؛ الشريعة تقضي بوجوب إحالة المستفتي إلى جهات الفتوى الرسمية المعتمدة (مثل دور الإفتاء والهيئات الشرعية المصرح لها) للنظر في تفاصيل حالته.',
        claims: [],
        timestamp
      });
    }

    // ─────────────────────────────────────────────────────────────
    // PRIORITY ROUTING RULE 13: Clarification Check
    // ─────────────────────────────────────────────────────────────
    if (interpretation.needsClarification === true) {
      return this._buildTerminalResult({
        sufficiencyId,
        verificationId,
        queryId,
        originalQuestion,
        overallSufficiency: OVERALL_SUFFICIENCY.INSUFFICIENT,
        routing: SUFFICIENCY_ROUTING.NEEDS_CLARIFICATION,
        reason: interpretation.clarificationReason || 'السؤال يحتاج إلى استيضاح لوجود غموض أو نقص في المعطيات الأساسية اللازمة لتحديد الحكم بدقة.',
        claims: [],
        timestamp
      });
    }

    // ─────────────────────────────────────────────────────────────
    // Map Phase 5 verification evidence by claimId
    // ─────────────────────────────────────────────────────────────
    const evidenceMap = new Map();
    if (verificationResult && Array.isArray(verificationResult.claims)) {
      for (const clm of verificationResult.claims) {
        if (clm && clm.claimId) {
          evidenceMap.set(clm.claimId, Array.isArray(clm.evidence) ? clm.evidence : []);
        }
      }
    }

    // Resolve claims to evaluate from Phase 2A interpretation
    let claimsToEvaluate = [];
    if (Array.isArray(interpretation.claimsToResolve) && interpretation.claimsToResolve.length > 0) {
      claimsToEvaluate = interpretation.claimsToResolve;
    } else {
      claimsToEvaluate = [
        {
          claimId: 'claim_default',
          statement: originalQuestion,
          importance: CLAIM_IMPORTANCE.CORE
        }
      ];
    }

    // ─────────────────────────────────────────────────────────────
    // Evaluate Claim-by-Claim (Rule 1)
    // ─────────────────────────────────────────────────────────────
    const evaluatedClaims = [];

    for (const claim of claimsToEvaluate) {
      const claimEvidence = evidenceMap.get(claim.claimId) || [];
      const evaluatedClaim = evaluateClaimSufficiency({
        claim,
        evidence: claimEvidence,
        options: mergedOptions
      });
      evaluatedClaims.push(evaluatedClaim);
    }

    // ─────────────────────────────────────────────────────────────
    // PRIORITY ROUTING RULE 14: Material Verification / Service Error Check
    // ─────────────────────────────────────────────────────────────
    const materialClaims = evaluatedClaims.filter(c => c.importance !== CLAIM_IMPORTANCE.SECONDARY);
    const effectiveMaterialClaims = materialClaims.length > 0 ? materialClaims : evaluatedClaims;

    const blockedMaterialError = effectiveMaterialClaims.find(c => c.isBlockedByServiceError);
    if (blockedMaterialError) {
      return this._buildResult({
        sufficiencyId,
        verificationId,
        queryId,
        originalQuestion,
        overallSufficiency: OVERALL_SUFFICIENCY.INSUFFICIENT,
        routing: SUFFICIENCY_ROUTING.SERVICE_ERROR,
        reason: `تعذر التحقق الدلالي للأدلة المطلوبة لادعاء أساسي (${blockedMaterialError.claimId}) بسبب خطأ تشغيلي وفشل في خدمة التحقق.`,
        claims: evaluatedClaims,
        timestamp
      });
    }

    // ─────────────────────────────────────────────────────────────
    // Overall Sufficiency & Routing Determination (Rules 8, 9, 10, 11)
    // ─────────────────────────────────────────────────────────────
    const supportedMaterial = effectiveMaterialClaims.filter(c => c.status === CLAIM_SUFFICIENCY_STATUS.SUPPORTED);
    const partialMaterial = effectiveMaterialClaims.filter(c => c.status === CLAIM_SUFFICIENCY_STATUS.PARTIAL);
    const unsupportedMaterial = effectiveMaterialClaims.filter(c => c.status === CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED);

    const hasAnyConflict = effectiveMaterialClaims.some(c => c.hasConflict);
    const hasUnresolvedDirectContradiction = effectiveMaterialClaims.some(
      c => c.metrics.directContradictionCount > 0 && c.metrics.directSupportCount === 0
    );

    let overallSufficiency;
    let routing;
    let reason;

    // Rule 8: Material conflict (DIRECT support + DIRECT contradiction) prevents overall SUFFICIENT
    if (hasAnyConflict) {
      overallSufficiency = OVERALL_SUFFICIENCY.PARTIAL;
      routing = SUFFICIENCY_ROUTING.PARTIAL;
      reason = 'توجد أدلة شرعية مباشرة متعارضة حول أحد الادعاءات الأساسية؛ المسألة محل تعارض واختلاف بين الأدلة المباشرة ولا يمكن اعتماد الإثبات التام.';
    } else if (hasUnresolvedDirectContradiction && supportedMaterial.length === 0) {
      // Direct contradiction with zero support -> INSUFFICIENT
      overallSufficiency = OVERALL_SUFFICIENCY.INSUFFICIENT;
      routing = SUFFICIENCY_ROUTING.INSUFFICIENT;
      reason = 'الأدلة الشرعية المباشرة تدحض وتناقض الادعاءات الأساسية للمسألة صراحة وبشكل قاطع.';
    } else if (supportedMaterial.length === effectiveMaterialClaims.length) {
      // Rule 9: Every material claim is SUPPORTED, no unresolved conflict
      overallSufficiency = OVERALL_SUFFICIENCY.SUFFICIENT;
      routing = SUFFICIENCY_ROUTING.ANSWERED;
      reason = 'جميع الادعاءات الأساسية مستوفاة ومدعومة بأدلة شرعية كافية وموثقة دون أي تعارض، وهي صالحة لبناء الإجابة.';
    } else if (supportedMaterial.length > 0 || partialMaterial.length > 0) {
      // Rule 10: Some material claims supported or partial while others remain unfulfilled
      overallSufficiency = OVERALL_SUFFICIENCY.PARTIAL;
      routing = SUFFICIENCY_ROUTING.PARTIAL;
      reason = `الأدلة كافية لإجابة جزئية على بعض أبعاد المسألة (${supportedMaterial.length + partialMaterial.length} من ${effectiveMaterialClaims.length}) مع بقاء ادعاءات أساسية أخرى غير مستوفاة تماماً.`;
    } else {
      // Rule 11: All material claims unsupported / no adequate support
      overallSufficiency = OVERALL_SUFFICIENCY.INSUFFICIENT;
      routing = SUFFICIENCY_ROUTING.INSUFFICIENT;
      reason = 'الأدلة الشرعية المسترجعة غير كافية لإثبات الادعاءات الأساسية للمسألة أو تفتقر إلى الاستدلال الصالح.';
    }

    return this._buildResult({
      sufficiencyId,
      verificationId,
      queryId,
      originalQuestion,
      overallSufficiency,
      routing,
      reason,
      claims: evaluatedClaims,
      timestamp
    });
  }

  _buildResult({
    sufficiencyId,
    verificationId,
    queryId,
    originalQuestion,
    overallSufficiency,
    routing,
    reason,
    claims,
    timestamp
  }) {
    const totalClaims = claims.length;
    const materialClaims = claims.filter(c => c.importance !== CLAIM_IMPORTANCE.SECONDARY).length;
    const supportedClaims = claims.filter(c => c.status === CLAIM_SUFFICIENCY_STATUS.SUPPORTED).length;
    const partialClaims = claims.filter(c => c.status === CLAIM_SUFFICIENCY_STATUS.PARTIAL).length;
    const unsupportedClaims = claims.filter(c => c.status === CLAIM_SUFFICIENCY_STATUS.UNSUPPORTED).length;
    const hasConflict = claims.some(c => c.hasConflict);
    const hasUnresolvedContradiction = claims.some(c => c.hasContradiction);
    const hasVerificationError = claims.some(c => c.hasVerificationError);

    return {
      sufficiencyId,
      verificationId,
      queryId,
      originalQuestion,
      overallSufficiency,
      routing,
      reason,
      claims,
      summary: {
        totalClaims,
        materialClaims,
        supportedClaims,
        partialClaims,
        unsupportedClaims,
        hasConflict,
        hasUnresolvedContradiction,
        hasVerificationError
      },
      timestamp
    };
  }

  _buildTerminalResult({
    sufficiencyId,
    verificationId,
    queryId,
    originalQuestion,
    overallSufficiency,
    routing,
    reason,
    claims,
    timestamp
  }) {
    return {
      sufficiencyId,
      verificationId,
      queryId,
      originalQuestion,
      overallSufficiency,
      routing,
      reason,
      claims,
      summary: {
        totalClaims: claims.length,
        materialClaims: 0,
        supportedClaims: 0,
        partialClaims: 0,
        unsupportedClaims: 0,
        hasConflict: false,
        hasUnresolvedContradiction: false,
        hasVerificationError: false
      },
      timestamp
    };
  }
}

export const defaultEvidenceSufficiencyService = new EvidenceSufficiencyService();

export function evaluateEvidenceSufficiency(params) {
  return defaultEvidenceSufficiencyService.evaluateSufficiency(params);
}
