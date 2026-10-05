/**
 * Mishkat Question Validator — Phase 2 Deterministic Schema & Content Validation
 * 
 * Strict deterministic validator for Question Understanding output.
 * Ensures:
 * - Structural integrity and complete fields.
 * - Allowed task enum conformance (rejects hallucinated task types).
 * - Correct logical consistency (e.g. isPersonalFatwa must be true if task is PERSONAL_FATWA).
 * - Clarification reason is present if needsClarification is true.
 * - Claims do NOT contain religious answers or fabricated evidence text.
 */

import { ALLOWED_TASKS } from './questionSchema.js';
import { auditClaimAtomicity, CLAIM_ATOMICITY_LEVELS } from './claimPlanner.js';

export function validateQuestionInterpretation(data, originalQuestion = '') {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: ['بيانات الفهم المدخلة فارغة أو ليست كائناً برمجياً صالحاً.'],
      sanitized: null
    };
  }

  // 1. Task enum validation
  if (!data.task || typeof data.task !== 'string') {
    errors.push('حقل المهمة (task) مفقود أو غير صالح.');
  } else if (!ALLOWED_TASKS.includes(data.task)) {
    errors.push(`نوع المهمة (${data.task}) غير معتمد في منصة مشكاة.`);
  }

  // 2. Topic & User Goal
  if (!data.topic || typeof data.topic !== 'string' || data.topic.trim().length === 0) {
    errors.push('حقل الموضوع (topic) مفقود أو فارغ.');
  }
  if (!data.userGoal || typeof data.userGoal !== 'string' || data.userGoal.trim().length === 0) {
    errors.push('حقل هدف السائل (userGoal) مفقود أو فارغ.');
  }

  // 3. Boolean fields & consistency
  if (typeof data.isPersonalFatwa !== 'boolean') {
    errors.push('حقل الفتوى الشخصية (isPersonalFatwa) يجب أن يكون قيمة منطقية (boolean).');
  } else if (data.task === 'PERSONAL_FATWA' && !data.isPersonalFatwa) {
    errors.push('تناقض منطقي: المهمة PERSONAL_FATWA بينما isPersonalFatwa تساوي false.');
  }

  if (typeof data.needsClarification !== 'boolean') {
    errors.push('حقل الحاجة للاستيضاح (needsClarification) يجب أن يكون قيمة منطقية (boolean).');
  } else if (data.needsClarification && (!data.clarificationReason || typeof data.clarificationReason !== 'string' || data.clarificationReason.trim().length < 5)) {
    errors.push('السؤال يتطلب استيضاحاً ولكن سبب الاستيضاح (clarificationReason) مفقود أو شديد الاقتضاب.');
  }

  // 4. Confidence validation
  if (typeof data.confidence !== 'number' || isNaN(data.confidence) || data.confidence < 0 || data.confidence > 1) {
    errors.push('نسبة الثقة (confidence) يجب أن تكون رقماً عشرياً بين 0.0 و 1.0.');
  }

  // 5. Claims array validation
  if (!Array.isArray(data.claimsToResolve) || data.claimsToResolve.length === 0) {
    errors.push('قائمة الدعاوى (claimsToResolve) فارغة، ويجب أن تحتوي على دعوى واحدة على الأقل.');
  } else {
    data.claimsToResolve = data.claimsToResolve.map((claim, idx) => {
      if (typeof claim === 'string') {
        return {
          claimId: `claim-res-${idx + 1}`,
          statement: claim,
          importance: idx === 0 ? 'CORE' : 'SECONDARY',
          requiredEvidenceType: 'TEXTUAL_EVIDENCE',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        };
      }
      return claim;
    });

    data.claimsToResolve.forEach((claim, idx) => {
      if (!claim || typeof claim !== 'object') {
        errors.push(`الدعوى رقم [${idx + 1}] ليست كائناً صالحاً.`);
        return;
      }
      if (!claim.statement || typeof claim.statement !== 'string' || claim.statement.trim().split(' ').length < 3) {
        errors.push(`نص الدعوى رقم [${idx + 1}] شديد القصر أو غير محدد.`);
      }
      if (!claim.importance || !['CORE', 'SECONDARY'].includes(claim.importance)) {
        errors.push(`درجة أهمية الدعوى رقم [${idx + 1}] يجب أن تكون CORE أو SECONDARY.`);
      }
      if (!claim.requiredEvidenceType || typeof claim.requiredEvidenceType !== 'string') {
        errors.push(`نوع الدليل المطلوب للدعوى رقم [${idx + 1}] مفقود.`);
      }

      // Check claim atomicity
      if (claim.statement) {
        const atomicity = auditClaimAtomicity(claim.statement);
        if (atomicity === CLAIM_ATOMICITY_LEVELS.COMPOUND) {
          errors.push(`الدعوى رقم [${idx + 1}] مركبة (Compound Claim) وتجمع بين أكثر من قضية إثباتية مستقلة؛ يجب تفكيكها إلى دعاوى ذرية.`);
        }
      }

      // 6. Content Guard: Claims must NOT contain actual religious answers
      const statement = (claim.statement || '').toLowerCase();
      const forbiddenAnswerPatterns = [
        'الجواب الصحيح هو',
        'حكمه حرام قطعا',
        'والفتوى هي',
        'قال الله تعالى في سورة',
        'عن ابي هريرة رضي الله عنه قال قال رسول الله'
      ];
      for (const p of forbiddenAnswerPatterns) {
        if (statement.includes(p)) {
          errors.push(`الدعوى رقم [${idx + 1}] تتضمن نص إجابة أو فتوى أو سرد نص ديني، والمطلوب توصيف قضية الاستدلال فقط.`);
          break;
        }
      }
    });
  }

  // 7. Sanitized clean output
  const sanitized = {
    originalQuestion: data.originalQuestion || originalQuestion,
    normalizedQuestion: data.normalizedQuestion || (originalQuestion ? originalQuestion.trim() : ''),
    task: data.task,
    topic: data.topic,
    subtopics: Array.isArray(data.subtopics) ? data.subtopics : [],
    userGoal: data.userGoal,
    claimsToResolve: Array.isArray(data.claimsToResolve) ? data.claimsToResolve.map((c, idx) => ({
      claimId: c.claimId || `claim-${idx + 1}`,
      statement: c.statement,
      importance: c.importance || 'CORE',
      requiredEvidenceType: c.requiredEvidenceType || 'TEXTUAL_EVIDENCE',
      claimAtomicity: c.claimAtomicity || auditClaimAtomicity(c.statement)
    })) : [],
    requestedEvidence: Array.isArray(data.requestedEvidence) ? data.requestedEvidence : ['TEXTUAL_EVIDENCE'],
    isPersonalFatwa: Boolean(data.isPersonalFatwa),
    needsClarification: Boolean(data.needsClarification),
    clarificationReason: data.needsClarification ? data.clarificationReason : null,
    confidence: typeof data.confidence === 'number' ? Math.max(0, Math.min(1, data.confidence)) : 0.8
  };

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

export default validateQuestionInterpretation;
