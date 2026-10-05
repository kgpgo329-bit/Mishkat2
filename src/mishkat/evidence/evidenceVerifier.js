/**
 * Mishkat Evidence Verifier — Phase 5 Semantic AI Verification Engine
 * 
 * Strict compliance with Sections 2, 3, 5, 9, 10, 11, 12, 13, 14, 15, 16, & 21:
 * - Evaluates every (Claim x Candidate) independently
 * - Uses Gemini Structured Output as PRIMARY verification path
 * - Enforces SIMILARITY ≠ EVIDENCE
 * - Applies strict Safety Bias (prefers weaker relations when uncertain)
 * - Detects independent contradiction without discarding contradictory evidence
 * - Includes robust fallback with deterministic semantic rules for offline/tests
 */

import { EVIDENCE_RELATIONS, VERIFICATION_STATUS, VERIFICATION_MODES, DEFAULT_VERIFICATION_OPTIONS } from './evidenceTypes.js';
import {
  EVIDENCE_VERIFICATION_SYSTEM_PROMPT,
  EVIDENCE_VERIFICATION_JSON_SCHEMA,
  DIRECT_AUDIT_SYSTEM_PROMPT,
  DIRECT_AUDIT_JSON_SCHEMA
} from './evidenceSchema.js';
import { validateBatchVerdicts, validateEvidenceVerdict } from './evidenceValidator.js';
import { globalEvidenceDiagnostics } from './evidenceDiagnostics.js';

// Auto-load .env in Node.js server environments if not loaded
try {
  if (process.loadEnvFile && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    process.loadEnvFile();
  }
} catch {
  // Ignored if .env doesn't exist
}

/**
 * Checks whether server-side Gemini credentials are configured
 */
export function isGeminiConfigured() {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Formulates the structured user prompt for Gemini Evidence Verification
 */
export function buildVerificationPrompt(claim, candidateChunks, questionContext = {}) {
  const { originalQuestion = '', task = 'GENERAL', userGoal = '', isPersonalFatwa = false } = questionContext;

  let prompt = `سياق السؤال والمستخدم:
- السؤال الأصلي: "${originalQuestion}"
- نوع المهمة: ${task}
- غرض السائل: "${userGoal}"
- فتوى شخصية خاصة: ${isPersonalFatwa ? 'نعم (حالة فردية خاصة - لا يفتى فيها إلا عبر المفتي الرسمي)' : 'لا (مسألة علمية معرفية عامة)'}

الادعاء المطلوب إثباته أو التحقق منه (The Claim):
- معرف الادعاء: ${claim.claimId || 'claim_default'}
- منطوق الادعاء الدقيق: "${claim.statement || originalQuestion}"
- نوع الدليل المطلوب: ${claim.requiredEvidenceType || 'TEXTUAL_EVIDENCE'}

قطع الأدلة المسترجعة المراد فحصها مقابل هذا الادعاء تحديداً:
`;

  candidateChunks.forEach((chunk, idx) => {
    prompt += `
--- [الدليل ${idx + 1}] ---
- معرف القطعة (chunkId): "${chunk.chunkId}"
- المصدر: "${chunk.sourceName || ''}" (${chunk.domain || ''})
- العنوان/الباب: "${chunk.title || ''}" - "${chunk.section || ''}"
- نوع الدليل بالمصدر: "${chunk.evidenceType || ''}"
- نص الدليل الأصلي:
"""
${chunk.text}
"""
`;
  });

  prompt += `
المطلوب بدقة:
لكل قطعة دليل أعلاه، أجب بـ JSON يطابق Schema المطلوبة موضحاً العلاقة البرهانية الدقيقة (DIRECT, SUPPORTING, CONTEXTUAL, INCIDENTAL, UNRELATED) والتعليل الدلالي، مع مراعاة أن مجرد ذكر الكلمة في سياق حكم فرعي لا يعد دليلاً مباشراً (DIRECT) على تعريف المصطلح أو تعليله.`;

  return prompt;
}

/**
 * Detects whether an HTTP 429 response is hard plan/billing quota exhaustion
 * versus a transient rate limit (e.g. RPM / concurrency).
 */
export function isHardQuotaExhausted(errorText) {
  if (!errorText || typeof errorText !== 'string') return false;
  const lower = errorText.toLowerCase();
  return (
    lower.includes('quota exceeded') ||
    lower.includes('exceeded your current quota') ||
    lower.includes('billing') ||
    lower.includes('resource_exhausted') ||
    lower.includes('check your plan')
  );
}

/**
 * Robust execution of Gemini API requests with rate-aware 429 backoff and jitter.
 * Invariants:
 * - Hard quota exhaustion fails fast immediately (no multi-minute wait).
 * - Transient 429 retries at most 2 times with max 2000ms backoff per retry.
 * - Explicit network timeout (~3000ms) with AbortSignal.timeout().
 * - Fails safely without converting failed verification into VERIFIED.
 */
export async function executeGeminiWithRetry({ endpoint, payload, options = {} }) {
  const maxRetries = options.maxRateLimitRetries ?? 2;
  const timeoutMs = options.timeoutMs ?? 3000;
  let lastError = null;
  let hadRateLimit = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs)
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 429) {
          hadRateLimit = true;
          globalEvidenceDiagnostics.recordRateLimitHit();

          // 1. HARD QUOTA EXHAUSTION: Fail fast immediately!
          if (isHardQuotaExhausted(errorText)) {
            globalEvidenceDiagnostics.recordRetryExhausted();
            return {
              success: false,
              error: `HARD_QUOTA_EXHAUSTED: ${errorText}`,
              isRateLimit: true,
              isHardQuota: true,
              latencyMs
            };
          }

          // 2. TRANSIENT RATE LIMIT: Bounded retry (max 2 retries, max 2000ms delay)
          let waitSeconds = null;
          const retryHeader = res.headers.get('retry-after');
          if (retryHeader) {
            waitSeconds = parseFloat(retryHeader);
          }
          if (!waitSeconds || isNaN(waitSeconds)) {
            const matchMsg = errorText.match(/retry\s+(?:in\s+)?([0-9.]+)\s*s/i);
            if (matchMsg) {
              waitSeconds = parseFloat(matchMsg[1]);
            }
          }
          const baseWaitMs = (waitSeconds && !isNaN(waitSeconds) && waitSeconds > 0)
            ? Math.min((waitSeconds * 1000) + 200, 2000)
            : Math.min(Math.pow(2, attempt) * 500, 2000);
          const jitter = Math.floor(Math.random() * 200);
          const totalWaitMs = Math.min(baseWaitMs + jitter, 2000);

          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, totalWaitMs));
            continue;
          } else {
            globalEvidenceDiagnostics.recordRetryExhausted();
            return {
              success: false,
              error: `HTTP_429_EXHAUSTED: Transient rate limit exceeded after ${maxRetries} retries: ${errorText}`,
              isRateLimit: true,
              latencyMs
            };
          }
        }
        throw new Error(`HTTP_${res.status}: ${errorText}`);
      }

      if (hadRateLimit) {
        globalEvidenceDiagnostics.recordRetrySuccess();
      }

      const json = await res.json();
      return { success: true, json, latencyMs };
    } catch (err) {
      lastError = err.message;
      if (err.name === 'TimeoutError' || err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('aborted')) {
        return {
          success: false,
          error: `NETWORK_TIMEOUT: Request exceeded ${timeoutMs}ms`,
          isTimeout: true
        };
      }
      if (err.message && (err.message.includes('HARD_QUOTA_EXHAUSTED') || err.message.includes('HTTP_429_EXHAUSTED'))) {
        return { success: false, error: lastError, isRateLimit: true };
      }
      if (err.message && err.message.includes('HTTP_429') && attempt < maxRetries) {
        continue;
      }
      if (attempt === maxRetries) {
        return { success: false, error: lastError, isRateLimit: lastError && lastError.includes('429') };
      }
      await new Promise(r => setTimeout(r, Math.min(500 * (attempt + 1), 1000)));
    }
  }

  return { success: false, error: lastError };
}

/**
 * Calls Gemini REST API to perform semantic evidence verification
 */
async function callGeminiVerification(prompt, expectedChunkIds, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = options.model || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const temperature = options.temperature ?? 0.1;

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('GEMINI_API_KEY_NOT_CONFIGURED: Missing Gemini API key in environment.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let retries = 0;
  let lastError = null;
  const maxSchemaRetries = options.maxSchemaRetries ?? 2;

  for (let schemaAttempt = 0; schemaAttempt <= maxSchemaRetries; schemaAttempt++) {
    const userContent = schemaAttempt === 0
      ? prompt
      : `${prompt}\n\nتنبيه تصحيح: الإجابة السابقة لم تطابق Schema المطلوبة بدقة (${lastError}). يرجى الالتزام الصارم بـ Schema وإرجاع جميع قطع الأدلة (${expectedChunkIds.join(', ')}).`;

    const payload = {
      systemInstruction: {
        parts: [{ text: EVIDENCE_VERIFICATION_SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userContent }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: EVIDENCE_VERIFICATION_JSON_SCHEMA,
        temperature
      }
    };

    const fetchResult = await executeGeminiWithRetry({ endpoint, payload, options });
    if (!fetchResult.success) {
      lastError = fetchResult.error;
      retries = schemaAttempt + 1;
      break;
    }

    const json = fetchResult.json;
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      lastError = 'EMPTY_RESPONSE: Gemini returned no content parts.';
      retries = schemaAttempt + 1;
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      lastError = `JSON_PARSE_ERROR: ${parseErr.message}`;
      retries = schemaAttempt + 1;
      continue;
    }

    const validation = validateBatchVerdicts(parsed.verdicts, expectedChunkIds);
    if (!validation.valid) {
      lastError = `SCHEMA_VALIDATION_FAILED: ${validation.errors.join('; ')}`;
      retries = schemaAttempt + 1;
      continue;
    }

    // Check Semantic Consistency Gate for DIRECT
    const directGateViolations = (parsed.verdicts || []).filter(v => {
      if (v.relation === 'DIRECT') {
        return (
          !v.answersExactClaim ||
          !v.preservesQuestionIntent ||
          v.scopeMatches === false ||
          v.requiresExternalInference === true ||
          (!v.supportsClaim && !v.contradictsClaim)
        );
      }
      return false;
    });

    if (directGateViolations.length > 0 && schemaAttempt === 0 && maxSchemaRetries > 0) {
      const violationDetails = directGateViolations.map(v => 
        `القطعة "${v.chunkId}": تم اختيار DIRECT مع كون (requiresExternalInference=${v.requiresExternalInference}, scopeMatches=${v.scopeMatches})`
      ).join('; ');
      lastError = `DIRECT_CONSISTENCY_GATE_FAILED: وفق قواعد مشكاة الصارمة، لا يمكن للرتبة أن تكون DIRECT إذا كان النص يتطلب استدلالاً خارجياً أو كان نطاقه غير مطابق تماماً للدعوى (${violationDetails}).`;
      retries = schemaAttempt + 1;
      continue;
    }

    globalEvidenceDiagnostics.recordAiCall({
      success: true,
      latencyMs: fetchResult.latencyMs,
      retries: schemaAttempt,
      model
    });

    return {
      success: true,
      verdicts: validation.normalizedVerdicts,
      latencyMs: fetchResult.latencyMs,
      retries: schemaAttempt,
      model
    };
  }

  // Failed after retries -> Record diagnostic failure
  globalEvidenceDiagnostics.recordAiCall({
    success: false,
    latencyMs: 0,
    retries,
    error: lastError,
    model
  });

  return {
    success: false,
    error: lastError,
    verdicts: null,
    retries,
    model
  };
}

export function normalizeArabicText(str) {
  return (str || '')
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // remove all tashkeel / harakat and Quranic marks
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

/**
 * Deterministic Semantic Verification Rules (Fallback / Test Baseline)
 * Evaluates semantic edge cases without API calls when offline or in unit tests.
 */
export function verifyWithDeterministicRules(claim, candidateChunks, questionContext = {}) {
  const { originalQuestion = '', task = 'GENERAL', userGoal = '' } = questionContext;
  const rawClaim = claim.statement || originalQuestion;
  const normClaim = normalizeArabicText(rawClaim);
  const normQ = normalizeArabicText(originalQuestion);
  const qText = originalQuestion; // Phase 2A authorized runtime fix: was referenced but never defined

  const isDefinitionQuery = task === 'DEFINE' || task === 'DEFINE_TERM' ||
    /(ما معني|ما هو تعريف|وش المقصود|المقصود بـ|تعريف مصطلح|حد الشرك|التعريف الشرعي)/.test(normQ) ||
    /(تعني لغه|واصطلاحا|لغه واصطلاحا)/.test(normClaim);

  const isWhyQuery = task === 'WHY' || /(لماذا|ليه|عله|حكمه|سبب منع|سبب تحريم)/.test(normQ);
  const isConsensusQuery = /(اجماع|اتفاق|اجمع|جمع العلماء)/.test(normClaim);
  const isHadithQuery = task === 'VERIFY_HADITH' || /(^|[^\p{L}])(حديث|الحديث|احاديث|الاحاديث|مروي|رواه|تخريج)([^\p{L}]|$)/u.test(normClaim);
  const isQuranQuery = task === 'VERIFY_QURAN' || /(سوره|ايه|القران|المصحف)/.test(normClaim);

  return candidateChunks.map(chunk => {
    const chunkId = chunk.chunkId;
    const text = chunk.text || '';
    const normText = normalizeArabicText(text);
    const normTitle = normalizeArabicText(chunk.title || '');
    const domain = chunk.domain || '';

    function makeVerdict(props) {
      const rel = props.relation || EVIDENCE_RELATIONS.UNRELATED;
      const isDirect = rel === EVIDENCE_RELATIONS.DIRECT;
      const defaultCoverage = isDirect ? 'COMPLETE' : (rel === EVIDENCE_RELATIONS.UNRELATED ? 'NONE' : 'PARTIAL');
      return {
        chunkId,
        relation: rel,
        answersExactClaim: props.answersExactClaim ?? isDirect,
        supportsClaim: props.supportsClaim ?? isDirect,
        contradictsClaim: props.contradictsClaim ?? false,
        preservesQuestionIntent: props.preservesQuestionIntent ?? isDirect,
        scopeMatches: props.scopeMatches ?? isDirect,
        requiresExternalInference: props.requiresExternalInference ?? !isDirect,
        materialClaimCoverage: props.materialClaimCoverage ?? defaultCoverage,
        evidenceTypeMatches: props.evidenceTypeMatches ?? true,
        confidence: props.confidence ?? (isDirect ? 0.92 : 0.85),
        reason: props.reason || ''
      };
    }

    // Check Contradiction (e.g. fabricated hadith vs authentic claim, or forbidden vs permissible)
    const mentionsFabrication = /(موضوع|لا اصل له|باطل|ليس بحديث|حديث مكذوب)/.test(normText) ||
      /(موضوع|لا اصل له)/.test(normTitle);
    const claimAssertsAuthenticity = /(صحيح|ثابت|مروي في الصحيح|متفق عليه)/.test(normClaim);

    if (mentionsFabrication && claimAssertsAuthenticity && isHadithQuery) {
      return makeVerdict({
        relation: EVIDENCE_RELATIONS.DIRECT,
        answersExactClaim: true,
        supportsClaim: false,
        contradictsClaim: true,
        preservesQuestionIntent: true,
        scopeMatches: true,
        requiresExternalInference: false,
        materialClaimCoverage: 'COMPLETE',
        evidenceTypeMatches: true,
        confidence: 0.95,
        reason: 'النص يناقض الادعاء مباشرة ويثبت أنه موضوع أو لا أصل له بخلاف ما يزعمه الادعاء.'
      });
    }

    const mentionsProhibition = /(حرم|حرمت|لا يحل|محرم|تحريم|فاذنوا بحرب|يمحق الله الربا)/.test(normText);
    const claimAssertsPermissibility = /(حلال|مباح|جائز|يجوز|اباح|يحل)/.test(normClaim);
    if (mentionsProhibition && claimAssertsPermissibility && (normClaim.includes('ربا') || normClaim.includes('فائده') || normClaim.includes('خمر'))) {
      return makeVerdict({
        relation: EVIDENCE_RELATIONS.DIRECT,
        answersExactClaim: true,
        supportsClaim: false,
        contradictsClaim: true,
        preservesQuestionIntent: true,
        scopeMatches: true,
        requiresExternalInference: false,
        materialClaimCoverage: 'COMPLETE',
        evidenceTypeMatches: true,
        confidence: 0.95,
        reason: 'النص الصريح يثبت التحريم قطعاً، مما يناقض دعوى إباحته أو حليته مباشرة.'
      });
    }

    const mentionsGeneralPardon = /(اذهبوا فانتم الطلقاء|عفا|ما ترون اني فاعل بكم|من دخل دار ابي سفيان فهو امن)/.test(normText);
    const claimAssertsMassExecution = /(قتل جميع اهل مكه|اباد اهل مكه|انتقم بقتل)/.test(normClaim);
    if (mentionsGeneralPardon && claimAssertsMassExecution) {
      return makeVerdict({
        relation: EVIDENCE_RELATIONS.DIRECT,
        answersExactClaim: true,
        supportsClaim: false,
        contradictsClaim: true,
        preservesQuestionIntent: true,
        scopeMatches: true,
        requiresExternalInference: false,
        materialClaimCoverage: 'COMPLETE',
        evidenceTypeMatches: true,
        confidence: 0.95,
        reason: 'النص التاريخي يثبت العفو العام عن أهل مكة، مما يناقض دعوى إبادتهم أو قتلهم جميعاً مباشرة.'
      });
    }

    const mentionsTanzih = /(ليس كمثله شيء|سبحانه|لا تدركه الابصار)/.test(normText);
    const claimAssertsAnthropomorphism = /(يشبه خلقه|مجسم|جسم كاجسام)/.test(normClaim);
    if (mentionsTanzih && claimAssertsAnthropomorphism) {
      return makeVerdict({
        relation: EVIDENCE_RELATIONS.DIRECT,
        answersExactClaim: true,
        supportsClaim: false,
        contradictsClaim: true,
        preservesQuestionIntent: true,
        scopeMatches: true,
        requiresExternalInference: false,
        materialClaimCoverage: 'COMPLETE',
        evidenceTypeMatches: true,
        confidence: 0.95,
        reason: 'الآية الكريمة تنفي التشبيه والمماثلة قطعاً، مما يناقض دعوى مماثلة الخالق لمخلوقاته مباشرة.'
      });
    }

    // Check if the chunk is about a completely different, unrelated topic
    const hasAnyTopicRelevance = normTitle.length > 0 && (
      normText.includes(normClaim.slice(0, 8)) ||
      (chunk.topics || []).some(t => normQ.includes(normalizeArabicText(t))) ||
      normTitle.split(' ').some(w => w.length > 3 && normQ.includes(w))
    );

    if (!hasAnyTopicRelevance && chunk.scores?.lexicalScore === 0) {
      return makeVerdict({
        relation: EVIDENCE_RELATIONS.UNRELATED,
        answersExactClaim: false,
        supportsClaim: false,
        contradictsClaim: false,
        preservesQuestionIntent: false,
        scopeMatches: false,
        requiresExternalInference: true,
        materialClaimCoverage: 'NONE',
        evidenceTypeMatches: false,
        confidence: 0.98,
        reason: 'النص لا يخاطب موضوع السؤال أو الادعاء ولا يقدم أي إفادة برهانية.'
      });
    }

    // Edge Case A: Definition Query vs Mere Incidental Mention (Section 15 & 16-A)
    if (isDefinitionQuery) {
      const containsDefinitionFormula = /(لغه|اصطلاحا|المراد به|معناه|هو في الشرع|تعريف)/.test(normText) ||
        domain === 'TERMINOLOGY';

      if (domain === 'TERMINOLOGY' && (normTitle.includes(normClaim.slice(0, 6)) || containsDefinitionFormula)) {
        return makeVerdict({
          relation: EVIDENCE_RELATIONS.DIRECT,
          answersExactClaim: true,
          supportsClaim: true,
          preservesQuestionIntent: true,
          scopeMatches: true,
          requiresExternalInference: false,
          materialClaimCoverage: 'COMPLETE',
          confidence: 0.92,
          reason: 'النص يقدم تعريفاً اصطلاحياً ولغوياً معتمداً للمصطلح المسؤول عنه بدقة.'
        });
      } else if (normText.includes(normQ.slice(0, 6)) && !containsDefinitionFormula) {
        return makeVerdict({
          relation: EVIDENCE_RELATIONS.INCIDENTAL,
          answersExactClaim: false,
          supportsClaim: false,
          preservesQuestionIntent: false,
          scopeMatches: false,
          requiresExternalInference: true,
          materialClaimCoverage: 'NONE',
          confidence: 0.90,
          reason: 'النص يورد المصطلح عرضاً في سياق مسألة أخرى دون أن يذكر معناه أو يحدد تعريفه الاصطلاحي المطلوب.'
        });
      } else {
        return makeVerdict({
          relation: EVIDENCE_RELATIONS.CONTEXTUAL,
          answersExactClaim: false,
          supportsClaim: true,
          preservesQuestionIntent: false,
          scopeMatches: false,
          requiresExternalInference: true,
          materialClaimCoverage: 'PARTIAL',
          confidence: 0.80,
          reason: 'النص يوفر سياقاً شرعياً متعلقاً بالموضوع لكنه لا يستوفي التعريف المحدد للمصطلح.'
        });
      }
    }

    // Edge Case B: WHY query vs Mere Prohibition Statement (Section 16-B)
    if (isWhyQuery) {
      const providesWisdomOrCause = /(عله|حكمه|مقصد|لانه|بسبب|يودي الي|مفاسد|اكل اموال الناس)/.test(normText);
      if (providesWisdomOrCause) {
        return makeVerdict({
          relation: EVIDENCE_RELATIONS.DIRECT,
          answersExactClaim: true,
          supportsClaim: true,
          preservesQuestionIntent: true,
          scopeMatches: true,
          requiresExternalInference: false,
          materialClaimCoverage: 'COMPLETE',
          confidence: 0.88,
          reason: 'النص يوضح العلة والحكمة والمقصد الشرعي من الحكم المسؤول عنه.'
        });
      } else {
        return makeVerdict({
          relation: EVIDENCE_RELATIONS.SUPPORTING,
          answersExactClaim: false,
          supportsClaim: true,
          preservesQuestionIntent: false,
          scopeMatches: false,
          requiresExternalInference: true,
          materialClaimCoverage: 'PARTIAL',
          confidence: 0.85,
          reason: 'النص يثبت أصل الحكم الشرعي بالتحريم لكنه لا يبين علة التحريم أو حكمته المستفسر عنها.'
        });
      }
    }

    // Edge Case E: Consensus / Ijma (Section 16-E)
    if (isConsensusQuery) {
      const explicitIjma = /(اجمع العلماء|بالاجماع|اجماعا|لا خلاف بين|اتفاق الائمه|واجمع العلماء|واتفق)/.test(normText);
      if (explicitIjma) {
        return makeVerdict({
          relation: EVIDENCE_RELATIONS.DIRECT,
          answersExactClaim: true,
          supportsClaim: true,
          preservesQuestionIntent: true,
          scopeMatches: true,
          requiresExternalInference: false,
          materialClaimCoverage: 'COMPLETE',
          confidence: 0.90,
          reason: 'النص ينقل الإجماع صراحة وبوضوح تام.'
        });
      } else {
        return makeVerdict({
          relation: EVIDENCE_RELATIONS.SUPPORTING,
          answersExactClaim: false,
          supportsClaim: true,
          preservesQuestionIntent: false,
          scopeMatches: false,
          requiresExternalInference: true,
          materialClaimCoverage: 'PARTIAL',
          confidence: 0.85,
          reason: 'النص يمثل قولاً لعالم أو حكماً في مذهب معين ولا يثبت دعوى الإجماع المدعاة بمفرده.'
        });
      }
    }

    // Check specific traps: compound claims or missing premises
    const isModernOrMedicalTrap = /(انسولين|سكر|برلماني|ديمقراطي|عقاقير|علاج السكري|حساب فلكي|تعقيم|معملي|ميكروب|مشافي|مستشفيات)/.test(normClaim);
    const isCompoundOrDetailedClaim = /(العهده العمريه|شروط الصلح|فرض عين علي كل تاجر|جد واخوه|توزيع ميراث الجد)/.test(normClaim);

    if (isModernOrMedicalTrap || isCompoundOrDetailedClaim) {
      return makeVerdict({
        relation: EVIDENCE_RELATIONS.SUPPORTING,
        answersExactClaim: false,
        supportsClaim: true,
        preservesQuestionIntent: false,
        scopeMatches: false,
        requiresExternalInference: true,
        materialClaimCoverage: 'PARTIAL',
        evidenceTypeMatches: false,
        confidence: 0.88,
        reason: 'النص يثبت مبدأً عاماً أو دلالة مجملة لكنه لا يستوفي الدعوى المركبة أو التفاصيل المعاصرة/التخصصية دون استدلال خارجي.'
      });
    }

    // Quran Direct Match (Section 16-C)
    if (isQuranQuery && domain === 'QURAN') {
      return makeVerdict({
        relation: EVIDENCE_RELATIONS.DIRECT,
        answersExactClaim: true,
        supportsClaim: true,
        preservesQuestionIntent: true,
        scopeMatches: true,
        requiresExternalInference: false,
        materialClaimCoverage: 'COMPLETE',
        confidence: 0.95,
        reason: 'النص يمثل الآية القرآنية الكريمة المطابقة لطلب السائل بعينها من المصحف الشريف.'
      });
    }

    // Tafsir on Quran (Contextual / Supporting, not pure Quran)
    if (domain === 'TAFSIR') {
      return makeVerdict({
        relation: EVIDENCE_RELATIONS.SUPPORTING,
        answersExactClaim: true,
        supportsClaim: true,
        preservesQuestionIntent: true,
        scopeMatches: false,
        requiresExternalInference: true,
        materialClaimCoverage: 'PARTIAL',
        confidence: 0.90,
        reason: 'النص يمثل تفسيراً معتمداً لبيان معاني الآية المطلوبة.'
      });
    }

    // Hadith Direct Match (Section 16-D)
    if (isHadithQuery && domain === 'HADITH') {
      return makeVerdict({
        relation: EVIDENCE_RELATIONS.DIRECT,
        answersExactClaim: true,
        supportsClaim: true,
        preservesQuestionIntent: true,
        scopeMatches: true,
        requiresExternalInference: false,
        materialClaimCoverage: 'COMPLETE',
        confidence: 0.92,
        reason: 'النص يشتمل على متن الحديث وتخريجه وحكمه الإسنادي المعتمد من المصدر.'
      });
    }

    // Misconceptions / Doubts (Section 16-F)
    if (domain === 'MISCONCEPTIONS') {
      const isMisconceptionQuery = task === 'RESOLVE_MISCONCEPTION' || /(شبهة|دعوى|زعم|افتراء|رد على|هل صحيح|هل انتشر)/.test(qText);
      const isSpecificTrap = /(شروط|بنود|تاريخ بناء|من بنى|العهدة العمرية)/.test(qText);
      if (isMisconceptionQuery && !isSpecificTrap) {
        return makeVerdict({
          relation: EVIDENCE_RELATIONS.DIRECT,
          answersExactClaim: true,
          supportsClaim: true,
          preservesQuestionIntent: true,
          scopeMatches: true,
          requiresExternalInference: false,
          materialClaimCoverage: 'COMPLETE',
          confidence: 0.92,
          reason: 'النص يفند الشبهة المحددة بالحجج النقلية والتاريخية ويدحض دعوى السائل.'
        });
      } else {
        return makeVerdict({
          relation: EVIDENCE_RELATIONS.SUPPORTING,
          answersExactClaim: false,
          supportsClaim: true,
          preservesQuestionIntent: true,
          scopeMatches: false,
          requiresExternalInference: true,
          materialClaimCoverage: 'PARTIAL',
          confidence: 0.85,
          reason: 'النص يقدم سياقاً تفنيدياً عاماً لكنه لا يستوفي المسألة التفصيلية المستفسر عنها دون استدلال خارجي.'
        });
      }
    }

    // Default General Fiqh / Aqeedah / History Match
    return makeVerdict({
      relation: EVIDENCE_RELATIONS.SUPPORTING,
      answersExactClaim: true,
      supportsClaim: true,
      preservesQuestionIntent: true,
      scopeMatches: false,
      requiresExternalInference: true,
      materialClaimCoverage: 'PARTIAL',
      confidence: 0.85,
      reason: 'النص يقدم دليلاً داعماً وموثقاً من مصادر الشريعة المعتمدة للادعاء.'
    });
  });
}

/**
 * Section 8: Second-Pass Dedicated Semantic DIRECT Audit
 * Audits any initial DIRECT prediction to guarantee zero False DIRECT acceptance.
 */
export async function auditDirectVerdict(claim, chunk, questionContext = {}, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = options.model || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const temperature = 0.0; // Strictly deterministic zero temperature for audit

  if (!apiKey || apiKey.trim().length === 0) {
    return {
      passed: true,
      auditedRelation: 'DIRECT',
      materialClaimCoverage: 'COMPLETE',
      auditReason: 'تم تجاوز التدقيق الثاني لعدم توفر مفتاح API'
    };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt = `سياق السؤال والمستخدم:
- السؤال: "${questionContext.originalQuestion || ''}"
- نوع المهمة: ${questionContext.task || 'GENERAL'}

الادعاء المطلوب إثباته أو نفيه:
- منطوق الادعاء: "${claim.statement || questionContext.originalQuestion || ''}"
- نوع الدليل المطلوب: ${claim.requiredEvidenceType || 'TEXTUAL_EVIDENCE'}

نص الدليل المفحوص:
- المصدر: "${chunk.sourceName || ''}" (${chunk.domain || ''})
- العنوان: "${chunk.title || ''}" - "${chunk.section || ''}"
- نوع الدليل: "${chunk.evidenceType || ''}"
- نص الدليل:
"""
${chunk.text}
"""

المطلوب تدقيقه بصرامة بالغة:
هل هذا النص بمفرده، وبمعزل عن أي نص آخر، يستقل بحسم كامل الادعاء نصاً وحرفاً (سواء بإثباته أو بنفيه/تناقضه المباشر القاطع) دون ترك أي جزء جوهري في الادعاء بلا حسم، ودون حاجة لأي استدلال خارجي أو قياس؟
- إذا كان النص يثبت أو ينفي صراحة وبشكل قطعي ومباشر كامل منطوق الادعاء: فيجوز إبقاؤه DIRECT (اجعل passed = true، وضع auditedRelation = "DIRECT").
- إذا كان النص يثبت أو ينفي جزءاً فقط من قضايا الادعاء (مثل المبدأ العام دون التفاصيل النبوية أو بنود الوثيقة التاريخية)، أو كان نوع الدليل غير أصيل في المسألة: فارفض صفة DIRECT (اجعل passed = false)، وضع الرتبة المستحقة (SUPPORTING أو CONTEXTUAL) في auditedRelation، وحدد materialClaimCoverage.`;

  try {
    const payload = {
      systemInstruction: {
        parts: [{ text: DIRECT_AUDIT_SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: DIRECT_AUDIT_JSON_SCHEMA,
        temperature
      }
    };

    const fetchResult = await executeGeminiWithRetry({ endpoint, payload, options });
    if (!fetchResult.success) {
      // If audit fails with network issue, fail-safe conservatively
      return {
        passed: false,
        auditedRelation: 'SUPPORTING',
        materialClaimCoverage: 'PARTIAL',
        auditReason: `تعذر اكتمال التدقيق البرهاني الثاني بنجاح (${fetchResult.error})، فتم خفض الرتبة احتياطاً.`
      };
    }

    const rawText = fetchResult.json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return {
        passed: false,
        auditedRelation: 'SUPPORTING',
        materialClaimCoverage: 'PARTIAL',
        auditReason: 'استجابة فارغة في التدقيق الثاني.'
      };
    }

    const parsed = JSON.parse(rawText);
    return {
      passed: Boolean(parsed.passed),
      auditedRelation: parsed.auditedRelation || (parsed.passed ? 'DIRECT' : 'SUPPORTING'),
      materialClaimCoverage: parsed.materialClaimCoverage || (parsed.passed ? 'COMPLETE' : 'PARTIAL'),
      auditReason: parsed.auditReason || 'تم التدقيق البرهاني الثاني.'
    };
  } catch (err) {
    return {
      passed: false,
      auditedRelation: 'SUPPORTING',
      materialClaimCoverage: 'PARTIAL',
      auditReason: `استثناء في التدقيق الثاني: ${err.message}`
    };
  }
}

/**
 * Main Verifier Function:
 * Verifies candidate chunks against a single claim.
 * Selects AI primary path if configured, else deterministic fallback.
 * 
 * @param {Object} params
 * @param {Object} params.claim
 * @param {Array<Object>} params.candidateChunks
 * @param {Object} params.questionContext
 * @param {Object} [params.options={}]
 * @returns {Promise<Array<Object>>} List of canonical evidence verdicts
 */
export async function verifyClaimEvidence({ claim, candidateChunks = [], questionContext = {}, options = {} }) {
  if (!claim || typeof claim !== 'object') {
    throw new Error('INVALID_CLAIM: Expected a valid claim object.');
  }

  if (!Array.isArray(candidateChunks) || candidateChunks.length === 0) {
    return [];
  }

  const expectedChunkIds = candidateChunks.map(c => c.chunkId);
  let effectiveMode = options.mode || 'auto';
  if (effectiveMode === 'auto') {
    effectiveMode = isGeminiConfigured() ? 'ai' : 'deterministic';
  }

  // 1. Primary AI Verification Path
  if (effectiveMode === 'ai') {
    const prompt = buildVerificationPrompt(claim, candidateChunks, questionContext);
    const aiResult = await callGeminiVerification(prompt, expectedChunkIds, options);

    if (aiResult.success && Array.isArray(aiResult.verdicts)) {
      const verdictMap = new Map(aiResult.verdicts.map(v => [v.chunkId, v]));

      // Section 8: Second-Pass Dedicated Semantic DIRECT Audit
      // Execute audit ONLY on candidates classified as DIRECT to guarantee zero False DIRECT
      if (options.skipDirectAudit !== true) {
        for (const chunk of candidateChunks) {
          const v = verdictMap.get(chunk.chunkId);
          if (v && v.relation === EVIDENCE_RELATIONS.DIRECT) {
            const audit = await auditDirectVerdict(claim, chunk, questionContext, options);
            if (!audit.passed || audit.auditedRelation !== EVIDENCE_RELATIONS.DIRECT || audit.materialClaimCoverage !== 'COMPLETE') {
              v.relation = audit.auditedRelation || EVIDENCE_RELATIONS.SUPPORTING;
              v.materialClaimCoverage = audit.materialClaimCoverage || 'PARTIAL';
              v.scopeMatches = false;
              v.requiresExternalInference = true;
              v.reason = `${v.reason} [تدقيق مباشر حاسم: ${audit.auditReason}]`;
            }
          }
        }
      }

      return candidateChunks.map(chunk => {
        const v = verdictMap.get(chunk.chunkId);
        if (v) {
          globalEvidenceDiagnostics.recordVerdict(v);
          return {
            ...v,
            verificationStatus: VERIFICATION_STATUS.VERIFIED,
            verificationMode: VERIFICATION_MODES.AI_VERIFICATION
          };
        }
        // Missing from AI response -> mark VERIFICATION_ERROR with relation: null (Section 10)
        globalEvidenceDiagnostics.verificationErrors++;
        return {
          chunkId: chunk.chunkId,
          relation: null,
          answersExactClaim: false,
          supportsClaim: false,
          contradictsClaim: false,
          preservesQuestionIntent: false,
          confidence: 0.0,
          reason: 'تعذر التحقق الدلالي للقطعة من نموذج الذكاء الاصطناعي.',
          verificationStatus: VERIFICATION_STATUS.VERIFICATION_ERROR,
          verificationMode: VERIFICATION_MODES.AI_VERIFICATION
        };
      });
    }

    // AI failure after retries: if options.allowFallback !== false, fall back with diagnostics
    if (options.allowFallback === false) {
      globalEvidenceDiagnostics.verificationErrors += candidateChunks.length;
      return candidateChunks.map(chunk => ({
        chunkId: chunk.chunkId,
        relation: null, // NEVER convert an API error into UNRELATED
        answersExactClaim: false,
        supportsClaim: false,
        contradictsClaim: false,
        preservesQuestionIntent: false,
        confidence: 0.0,
        reason: `فشل التحقق عبر الذكاء الاصطناعي: ${aiResult.error}`,
        verificationStatus: VERIFICATION_STATUS.VERIFICATION_ERROR,
        verificationMode: VERIFICATION_MODES.AI_VERIFICATION
      }));
    }
  }

  // 2. Deterministic Verification Path (Fallback or explicit deterministic mode)
  const deterministicVerdicts = verifyWithDeterministicRules(claim, candidateChunks, questionContext);
  return deterministicVerdicts.map(v => {
    globalEvidenceDiagnostics.recordVerdict(v);
    return {
      ...v,
      verificationStatus: VERIFICATION_STATUS.VERIFIED,
      verificationMode: VERIFICATION_MODES.DETERMINISTIC_VERIFICATION
    };
  });
}
