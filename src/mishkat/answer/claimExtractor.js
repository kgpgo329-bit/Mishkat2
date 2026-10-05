/**
 * Mishkat Phase 7: Answer Claim Extractor
 * 
 * Strict compliance with Section 4:
 * - Identifies material factual, religious, and historical claims made in generated answer text
 * - Excludes greetings, closings, transitions, and purely stylistic wording
 * - Segments propositions into independent verifiable answer claims
 */

// Common non-material greeting / transitional patterns
const NON_MATERIAL_PATTERNS = [
  /^(السلام\s+عليكم(\s+ورحمة\s+الله(\s+وبركاته)?)?)/i,
  /^(بسم\s+الله\s+الرحمن\s+الرحيم)/i,
  /^(الحمد\s+لله(\s+رب\s+العالمين)?)/i,
  /^(والصلاة\s+والسلام\s+على\s+رسول\s+الله)/i,
  /^(أما\s+بعد|وبعد\s*:)/i,
  /^(والله\s+(تعالى\s+)?أعلم)/i,
  /^(هذا\s+وبالله\s+التوفيق)/i,
  /^(وفيما\s+يلي\s+بيان\s+ذلك|نوضح\s+ذلك\s+فيما\s+يلي)/i,
  /^(ختاماً|في\s+الختام|وخلاصة\s+القول)/i,
  /^(أهلاً\s+بك|مرحباً\s+بك)/i
];

/**
 * Checks if a candidate sentence is non-material (greeting, transition, closing)
 */
export function isNonMaterialSentence(sentence) {
  if (!sentence || typeof sentence !== 'string') return true;
  const trimmed = sentence.trim();
  if (trimmed.length < 8) return true;

  for (const pat of NON_MATERIAL_PATTERNS) {
    if (pat.test(trimmed)) {
      // If the sentence ONLY contains the greeting/transition, it's non-material
      const stripped = trimmed.replace(pat, '').trim();
      if (stripped.length < 12) return true;
    }
  }

  // Structural headings, bullet headers, colon-terminated titles, or warnings
  if (trimmed.endsWith(':') && trimmed.length < 70) return true;
  if (/^(\d+[\.\)]|\-|\*|#+)\s*(المعنى|الترجمة|بيان|تمهيد|تنبيه|المقدمة|الخاتمة|الدليل)/.test(trimmed) && trimmed.length < 80) return true;
  if (/^(تنبيه\s*:)/.test(trimmed)) return true;

  return false;
}

/**
 * Detects whether a sentence contains an affirmative factual, religious, or historical proposition
 */
export function isMaterialProposition(sentence) {
  if (isNonMaterialSentence(sentence)) return false;

  const s = sentence.trim();

  // Religious, factual, textual, or historical indicators
  const materialTriggers = [
    /(حكم|واجب|يجب|حرام|يحرم|مستحب|مسنون|مكروه|جائز|يجوز|مباح|فرض|سنة|بدعة|صحيح|ضعيف|موضوع)/,
    /(قال\s+الله|قال\s+تعالى|روى|أخرج|في\s+صحيح|حديث|آية|سورة|أجمع\s+العلماء|اتفق\s+الفقهاء|ذهب\s+جمهور)/,
    /(تعريفه|معناه|المراد\s+به|يقصد\s+به|اصطلاحا|لغة|اشتقاق)/,
    /(تاريخياً|في\s+عهد|في\s+سنة|غزوة|صلح|معاهدة|وثيقة)/,
    /(لا\s+يجوز|لا\s+يصح|يثبت|لا\s+يثبت|دليل|استدلال)/
  ];

  return materialTriggers.some(trigger => trigger.test(s)) || s.length > 25;
}

/**
 * Extracts material answer claims from generated text
 * 
 * @param {string} answerText Generated user-facing answer
 * @param {Object} [options={}]
 * @returns {Array<Object>} List of extracted material answer claims
 */
export function extractAnswerClaims(answerText, options = {}) {
  if (!answerText || typeof answerText !== 'string' || answerText.trim().length === 0) {
    return [];
  }

  // If explicit structured claims were passed (e.g. from structured AI output or mock)
  if (Array.isArray(options.explicitClaims) && options.explicitClaims.length > 0) {
    return options.explicitClaims.map((clm, idx) => ({
      claimId: clm.claimId || `ans_claim_${idx + 1}`,
      statement: clm.statement || clm.text || '',
      importance: clm.importance || 'CORE',
      isMaterial: true
    }));
  }

  // Sentence and proposition splitter
  const rawSegments = answerText
    .split(/[\n\r]+|[.؛!؟]\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  const materialClaims = [];
  let claimSeq = 1;

  for (const seg of rawSegments) {
    if (isNonMaterialSentence(seg)) {
      continue;
    }

    if (isMaterialProposition(seg)) {
      materialClaims.push({
        claimId: `ans_claim_${claimSeq++}`,
        statement: seg,
        importance: 'CORE',
        isMaterial: true
      });
    }
  }

  return materialClaims;
}
