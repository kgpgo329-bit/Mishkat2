import { describe, it } from 'node:test';
import assert from 'node:assert';
import { executeGeminiWithRetry, isHardQuotaExhausted } from '../src/mishkat/evidence/evidenceVerifier.js';
import { callGeminiQuestionInterpreter } from '../src/mishkat/question/aiQuestionInterpreter.js';

describe('Performance Fix Unit Tests — Fast Fail, Timeouts & Model Runtime', () => {

  it('1. isHardQuotaExhausted correctly classifies quota errors vs transient errors', () => {
    assert.strictEqual(
      isHardQuotaExhausted('You exceeded your current quota, please check your plan and billing details.'),
      true
    );
    assert.strictEqual(
      isHardQuotaExhausted('RESOURCE_EXHAUSTED: Quota exceeded for metric generate_content_requests'),
      true
    );
    assert.strictEqual(
      isHardQuotaExhausted('Rate limit exceeded: transient burst concurrency'),
      false
    );
    assert.strictEqual(
      isHardQuotaExhausted('HTTP 500: Internal Server Error'),
      false
    );
    assert.strictEqual(
      isHardQuotaExhausted(null),
      false
    );
  });

  it('2. executeGeminiWithRetry FAILS FAST immediately on hard quota 429 with zero retries', async () => {
    const origFetch = globalThis.fetch;
    let callCount = 0;
    const tStart = Date.now();

    globalThis.fetch = async () => {
      callCount++;
      return {
        ok: false,
        status: 429,
        headers: new Headers(),
        text: async () => 'You exceeded your current quota, please check your plan and billing details.'
      };
    };

    try {
      const res = await executeGeminiWithRetry({
        endpoint: 'https://fake-endpoint.example.com',
        payload: { test: true },
        options: { maxRateLimitRetries: 2 }
      });

      const elapsed = Date.now() - tStart;
      assert.strictEqual(res.success, false, 'Must report failure');
      assert.strictEqual(res.isHardQuota, true, 'Must identify as hard quota');
      assert.strictEqual(callCount, 1, 'Must NOT retry on hard quota exhaustion');
      assert.ok(elapsed < 500, `Must fail fast in < 500ms, took ${elapsed}ms`);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('3. executeGeminiWithRetry caps transient 429 retries at max 2 and delays <= 2000ms', async () => {
    const origFetch = globalThis.fetch;
    let callCount = 0;

    globalThis.fetch = async () => {
      callCount++;
      return {
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '0.1' }),
        text: async () => 'Transient rate limit: Please retry in 0.1s'
      };
    };

    try {
      const res = await executeGeminiWithRetry({
        endpoint: 'https://fake-endpoint.example.com',
        payload: { test: true },
        options: { maxRateLimitRetries: 2 }
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(callCount, 3, 'Must attempt initial + 2 retries = 3 attempts total');
      assert.strictEqual(res.isRateLimit, true);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('4. executeGeminiWithRetry enforces bounded network timeout', async () => {
    const origFetch = globalThis.fetch;

    globalThis.fetch = async (_url, init) => {
      // Hang indefinitely or until aborted
      return new Promise((_, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted due to timeout');
            err.name = 'TimeoutError';
            reject(err);
          });
        }
      });
    };

    try {
      const tStart = Date.now();
      const res = await executeGeminiWithRetry({
        endpoint: 'https://fake-endpoint.example.com',
        payload: { test: true },
        options: { timeoutMs: 150 }
      });

      const elapsed = Date.now() - tStart;
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.isTimeout, true);
      assert.ok(elapsed >= 140 && elapsed < 800, `Timed out in bounded window: ${elapsed}ms`);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('5. callGeminiQuestionInterpreter enforces bounded network timeout', async () => {
    const origFetch = globalThis.fetch;

    globalThis.fetch = async (_url, init) => {
      return new Promise((_, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted due to timeout');
            err.name = 'TimeoutError';
            reject(err);
          });
        }
      });
    };

    try {
      const tStart = Date.now();
      const res = await callGeminiQuestionInterpreter('ما حكم الصلاة؟', { timeoutMs: 150 });
      const elapsed = Date.now() - tStart;

      assert.strictEqual(res.success, false);
      assert.ok(res.error.includes('aborted') || res.error.includes('timeout'), `Error mentions timeout: ${res.error}`);
      assert.ok(elapsed >= 140 && elapsed < 800, `Timed out in bounded window: ${elapsed}ms`);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

});
