/**
 * Mishkat AI Question Interpreter — Phase 2 Gemini Semantic Adapter
 * 
 * Clean, isolated server-side adapter for Google Gemini.
 * Responsibilities:
 * - Pure semantic intent understanding using LLM reasoning.
 * - Enforces structured JSON output matching schema.
 * - Handles API network calls, latency recording, retries, and errors.
 * - Never leaks keys to frontend/client bundles.
 */

import { QUESTION_UNDERSTANDING_SYSTEM_PROMPT, QUESTION_INTERPRETATION_JSON_SCHEMA } from './questionSchema.js';
import { validateQuestionInterpretation } from './questionValidator.js';

// Auto-load .env in Node.js server environments if not already loaded
try {
  if (process.loadEnvFile && !process.env.GEMINI_API_KEY) {
    process.loadEnvFile();
  }
} catch {
  // Ignored if .env doesn't exist
}

// Global runtime diagnostics for cost, latency, and call tracking
export const aiDiagnostics = {
  totalCalls: 0,
  successfulCalls: 0,
  failedCalls: 0,
  schemaRetries: 0,
  fallbackUsages: 0,
  totalLatencyMs: 0,
  get averageLatencyMs() {
    return this.successfulCalls > 0 ? Math.round(this.totalLatencyMs / this.successfulCalls) : 0;
  },
  reset() {
    this.totalCalls = 0;
    this.successfulCalls = 0;
    this.failedCalls = 0;
    this.schemaRetries = 0;
    this.fallbackUsages = 0;
    this.totalLatencyMs = 0;
  }
};

/**
 * Checks whether server-side Gemini credentials are configured
 */
export function isGeminiConfigured() {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Calls Gemini REST API to interpret the user's question
 * 
 * @param {string} originalQuestion
 * @param {Object} options
 * @returns {Promise<{ success: boolean, data: Object|null, error: string|null, latencyMs: number, retries: number }>}
 */
export async function callGeminiQuestionInterpreter(originalQuestion, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = options.model || process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

  if (!apiKey || apiKey.trim().length === 0) {
    return {
      success: false,
      data: null,
      error: 'GEMINI_API_KEY_NOT_CONFIGURED: متغير البيئة GEMINI_API_KEY أو GOOGLE_API_KEY غير موجود في الخادم.',
      latencyMs: 0,
      retries: 0
    };
  }

  aiDiagnostics.totalCalls++;
  const startTime = Date.now();
  let retries = 0;
  const timeoutMs = options.timeoutMs ?? 3000;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  async function executeRequest(userPrompt) {
    const payload = {
      systemInstruction: {
        parts: [{ text: QUESTION_UNDERSTANDING_SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: QUESTION_INTERPRETATION_JSON_SCHEMA,
        temperature: 0.1
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const jsonRes = await res.json();
    const candidateText = jsonRes?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('No candidate content returned by Gemini.');
    }

    return JSON.parse(candidateText);
  }

  try {
    // Attempt 1: Standard interpretation
    let parsedData = await executeRequest(originalQuestion);
    let validation = validateQuestionInterpretation(parsedData, originalQuestion);

    // If validation fails, retry once with schema correction feedback
    if (!validation.isValid) {
      aiDiagnostics.schemaRetries++;
      retries++;
      const correctionPrompt = `سؤال السائل: "${originalQuestion}"
ملاحظة تصحيحية: مخرجاتك السابقة فشلت في التدقيق النمطي بسبب الأخطاء التالية:
${validation.errors.join('\n')}
يرجى إعادة تحليل نية السائل بدقة والالتزام الصارم بـ JSON Schema وحقولها المعتمدة دون اختلاق مهام غير موجودة.`;

      parsedData = await executeRequest(correctionPrompt);
      validation = validateQuestionInterpretation(parsedData, originalQuestion);
    }

    const elapsed = Date.now() - startTime;

    if (validation.isValid) {
      aiDiagnostics.successfulCalls++;
      aiDiagnostics.totalLatencyMs += elapsed;
      return {
        success: true,
        data: validation.sanitized,
        error: null,
        latencyMs: elapsed,
        retries
      };
    } else {
      aiDiagnostics.failedCalls++;
      return {
        success: false,
        data: null,
        error: `Schema validation failed after retry: ${validation.errors.join('; ')}`,
        latencyMs: elapsed,
        retries
      };
    }
  } catch (err) {
    const elapsed = Date.now() - startTime;
    aiDiagnostics.failedCalls++;
    return {
      success: false,
      data: null,
      error: `Gemini API execution error: ${err.message}`,
      latencyMs: elapsed,
      retries
    };
  }
}

export default callGeminiQuestionInterpreter;
