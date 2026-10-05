/**
 * Mishkat Client API Layer
 *
 * Provides typed, clean HTTP methods for communicating with the server API bridge.
 *
 * INVARIANTS:
 * - Pure client-side code: zero Node.js imports, zero Gemini imports, zero secrets.
 * - Handles session persistence in localStorage with safe fallback.
 * - Returns normalized responses { success, data, error }.
 * - Browser communicates with the Mishkat backend ONLY via HTTP fetch to /api/*.
 */

const STORAGE_KEY = 'mishkat_session_id';
let apiBaseUrl = '';

/**
 * Configures the base URL for API requests (defaults to empty string for browser relative paths).
 * @param {string} url
 */
export function setApiBaseUrl(url) {
  apiBaseUrl = url || '';
}

/**
 * Returns the currently configured API base URL.
 * @returns {string}
 */
export function getApiBaseUrl() {
  return apiBaseUrl;
}

/**
 * Retrieves the current session ID, or generates and stores a new one.
 * @returns {string} sessionId
 */
export function getSessionId() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      let sid = window.localStorage.getItem(STORAGE_KEY);
      if (!sid) {
        sid = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        window.localStorage.setItem(STORAGE_KEY, sid);
      }
      return sid;
    } catch {
      // Fallback if localStorage is inaccessible
    }
  }
  return 'default_session';
}

/**
 * Sets a specific session ID into client storage.
 * @param {string} id
 */
export function setSessionId(id) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Ignore storage errors in restricted environments
    }
  }
}

/**
 * Helper to execute JSON HTTP requests against the API server.
 */
async function apiRequest(endpoint, options = {}) {
  const url = apiBaseUrl ? `${apiBaseUrl.replace(/\/$/, '')}${endpoint}` : endpoint;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: data?.message || data?.error || `HTTP ${res.status}`,
        data
      };
    }

    return {
      success: true,
      status: res.status,
      data
    };
  } catch (err) {
    return {
      success: false,
      status: 0,
      error: err.message || 'تعذر الاتصال بالخادم، يرجى التحقق من الشبكة والمحاولة مجدداً.',
      data: null
    };
  }
}

/**
 * Submits a question to the canonical pipeline via POST /api/ask.
 *
 * @param {Object} params
 * @param {string} params.questionText
 * @param {string} [params.sessionId]
 * @param {string} [params.origin] 'USER_QUESTION' | 'DEEP_LEARNING'
 * @param {string|null} [params.parentRecordId]
 * @param {Object} [params.options]
 * @returns {Promise<{success: boolean, data: any, error?: string}>}
 */
export async function askQuestion({
  questionText,
  sessionId,
  origin = 'USER_QUESTION',
  parentRecordId = null,
  options = {}
}) {
  const sid = sessionId || getSessionId();
  return apiRequest('/api/ask', {
    method: 'POST',
    body: JSON.stringify({
      questionText,
      sessionId: sid,
      origin,
      parentRecordId,
      options
    })
  });
}

/**
 * Retrieves the current user's Knowledge Journey state via GET /api/journey.
 *
 * @param {string} [sessionId]
 * @returns {Promise<{success: boolean, data: any, error?: string}>}
 */
export async function getJourney(sessionId) {
  const sid = sessionId || getSessionId();
  return apiRequest(`/api/journey?sessionId=${encodeURIComponent(sid)}`, {
    method: 'GET'
  });
}

/**
 * Retrieves the user's Question History via GET /api/history.
 *
 * @param {string} [sessionId]
 * @returns {Promise<{success: boolean, data: any, error?: string}>}
 */
export async function getQuestionHistory(sessionId) {
  const sid = sessionId || getSessionId();
  return apiRequest(`/api/history?sessionId=${encodeURIComponent(sid)}`, {
    method: 'GET'
  });
}

/**
 * Requests dynamic assessment generation via POST /api/assessment/generate.
 *
 * @param {Object} [params]
 * @param {string} [params.sessionId]
 * @param {Object} [params.options]
 * @returns {Promise<{success: boolean, data: any, error?: string}>}
 */
export async function generateAssessment({ sessionId, options = {} } = {}) {
  const sid = sessionId || getSessionId();
  return apiRequest('/api/assessment/generate', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: sid,
      options
    })
  });
}

/**
 * Submits user responses for assessment evaluation via POST /api/assessment/submit.
 *
 * @param {Object} params
 * @param {string} params.assessmentId
 * @param {Array<{itemId: string, selectedOptionId: string}>} params.responses
 * @returns {Promise<{success: boolean, data: any, error?: string}>}
 */
export async function submitAssessment({ assessmentId, responses = [] }) {
  return apiRequest('/api/assessment/submit', {
    method: 'POST',
    body: JSON.stringify({
      assessmentId,
      responses
    })
  });
}

/**
 * Requests the final Knowledge Journey report via POST /api/report/generate.
 *
 * @param {Object} params
 * @param {string} [params.sessionId]
 * @param {Object} params.assessmentResult
 * @param {string} [params.version]
 * @returns {Promise<{success: boolean, data: any, error?: string}>}
 */
export async function generateReport({ sessionId, assessmentResult, version = '1.0' }) {
  const sid = sessionId || getSessionId();
  return apiRequest('/api/report/generate', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: sid,
      assessmentResult,
      version
    })
  });
}

export const mishkatApi = {
  setApiBaseUrl,
  getApiBaseUrl,
  getSessionId,
  setSessionId,
  askQuestion,
  getJourney,
  getQuestionHistory,
  generateAssessment,
  submitAssessment,
  generateReport
};

export default mishkatApi;
