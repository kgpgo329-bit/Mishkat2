/**
 * Mishkat Phase 8: Real AI Deep Learning Follow-Up Generator
 *
 * Calls Gemini server-side to generate deep, educational follow-up questions
 * strictly grounded in the verified answer context and its accepted evidence.
 *
 * SAFETY INVARIANTS:
 * - Generates questions ONLY (أسئلة استكشافية فقط).
 * - Never returns answers, fatwas, rulings, evidence, or fabrications.
 * - Bound by strict timeout (<= 2500ms) to protect latency.
 * - Safe fallback to deterministic synthesis on any failure or timeout.
 * - Credentials remain strictly server-side.
 */

import { FOLLOW_UP_ORIGIN } from './deepLearningTypes.js';

export const AI_FOLLOW_UP_SYSTEM_PROMPT = `أنت مساعد تربوي في منصة «مشكاة» للرحلات المعرفية الإسلامية الموثقة.
مهمتك توليد 2 إلى 3 أسئلة استكشافية عميقة ومحفزة في إطار «التعلّم العميق» لمساعدة المستخدم على التوسع في فهم المسألة بعد تلقي الجواب الموثق.

القواعد الصارمة:
1. ولّد أسئلة فقط تنتهي بعلامة استفهام (؟).
2. لا تقدم إجابات، ولا فتاوى خاصة، ولا أحكاماً حاسمة، ولا استنتاجات مسبقة.
3. لا تلفق أي آيات قرآنية أو أحاديث نبوية أو مصادر.
4. يجب أن تكون الأسئلة تعليمية، موضوعية، ومبنية على سياق الجواب والمصادر المعتمدة المذكورة.
5. أعد النتيجة بصيغة JSON حصراً وفق المخطط المطلوب.`;

export const AI_FOLLOW_UP_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          rationale: { type: 'STRING' }
        },
        required: ['question']
      }
    }
  },
  required: ['questions']
};

/**
 * Checks if Gemini API key is configured in server environment.
 * @returns {boolean}
 */
export function isGeminiConfigured() {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Calls Gemini server-side to generate educational follow-up questions.
 *
 * @param {Object} ctx Generation context from verified answer
 * @param {Object} [options]
 * @returns {Promise<Array<{question: string, rationale: string, origin: string, parentRecordId: null}>|null>}
 */
export async function generateAiFollowUps(ctx, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const timeoutMs = options.timeoutMs || 2500;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  // Construct prompt summarizing the verified answer context
  const { originalQuestion, answerClaims, acceptedEvidence, usedSources } = ctx;
  const sourcesSummary = (usedSources || []).map(s => s.sourceName).filter(Boolean).join('، ');
  const claimsSummary = (answerClaims || []).map(c => c.statement).filter(Boolean).join(' | ');

  const userPrompt = `السؤال الأصلي للمستخدم: "${originalQuestion || ''}"
المسائل الموثقة في الجواب: "${claimsSummary || ''}"
المصادر المعتمدة المستخدمة: "${sourcesSummary || 'المصادر الإسلامية المعتمدة'}"

المطلوب: ولّد من 2 إلى 3 أسئلة استكشافية متقدمة (تعلّم عميق) يستفيد منها القارئ لمواصلة رحلته المعرفية حول هذا الموضوع.`;

  const payload = {
    systemInstruction: {
      parts: [{ text: AI_FOLLOW_UP_SYSTEM_PROMPT }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: AI_FOLLOW_UP_SCHEMA,
      temperature: 0.3
    }
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) {
      return null;
    }

    const jsonRes = await res.json();
    const candidateText = jsonRes?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return null;
    }

    const parsed = JSON.parse(candidateText);
    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return null;
    }

    // Sanitize and validate generated questions
    const validQuestions = [];
    for (const item of parsed.questions) {
      let qText = item?.question;
      if (typeof qText === 'string') {
        qText = qText.trim();
        if (qText.length >= 6) {
          if (!qText.endsWith('؟') && !qText.endsWith('?')) {
            qText += '؟';
          }
          validQuestions.push({
            question: qText,
            rationale: typeof item.rationale === 'string' ? item.rationale.trim() : 'سؤال استكشافي مشتق من سياق الجواب الموثق',
            origin: FOLLOW_UP_ORIGIN,
            parentRecordId: null
          });
        }
      }
    }

    return validQuestions.length >= 2 ? validQuestions : null;
  } catch (err) {
    // Graceful fallback on abort (timeout), network error, or invalid JSON
    return null;
  } finally {
    clearTimeout(timer);
  }
}
