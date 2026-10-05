/**
 * Mishkat Server & API Bridge
 *
 * Implements the lightweight server-side API bridge exposing:
 *  - POST /api/ask
 *  - GET  /api/journey
 *  - POST /api/assessment/generate
 *  - POST /api/assessment/submit
 *  - POST /api/report/generate
 *
 * ARCHITECTURAL INVARIANTS:
 * - Keeps all Node-only domain execution on the server side.
 * - Zero secrets (GEMINI_API_KEY) or stack traces returned to client.
 * - Never trusts client-supplied assessment keys or scoring results.
 * - Reuses existing Phase 9, 10, 11 services without duplicating domain logic.
 */

import http from 'node:http';
import { URL } from 'node:url';
import { MishkatPipelineService } from '../mishkat/pipeline/MishkatPipelineService.js';
import { AssessmentService } from '../mishkat/assessment/AssessmentService.js';
import { ReportService } from '../mishkat/report/ReportService.js';
import { InMemoryJourneyStorage } from '../mishkat/journey/journeyStorage.js';
import { InMemoryAssessmentStorage } from '../mishkat/assessment/assessmentStorage.js';
import { InMemoryReportStorage } from '../mishkat/report/reportStorage.js';

import { createStorage } from '../mishkat/firebase/storageFactory.js';

export class MishkatServerManager {
  constructor(options = {}) {
    // Shared session-backed stores (resolved via factory or explicit injection)
    const stores = createStorage(options.storageType, options);
    this.journeyStorage = options.journeyStorage || stores.journeyStorage;
    this.assessmentStorage = options.assessmentStorage || stores.assessmentStorage;
    this.reportStorage = options.reportStorage || stores.reportStorage;
    this.historyStorage = options.historyStorage || stores.historyStorage;

    this.pipelineService = options.pipelineService || new MishkatPipelineService({
      journeyStorage: this.journeyStorage,
      historyStorage: this.historyStorage
    });
    this.assessmentService = options.assessmentService || new AssessmentService(this.assessmentStorage);
    this.reportService = options.reportService || new ReportService(this.reportStorage);
  }

  /**
   * Main HTTP request router.
   */
  async handleRequest(req, res) {
    // Set standard JSON & CORS headers
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    try {
      // ── 1. POST /api/ask ────────────────────────────────────────────────
      if (req.method === 'POST' && pathname === '/api/ask') {
        const body = await this._parseJsonBody(req);
        const { questionText, sessionId = 'default_session', origin = 'USER_QUESTION', parentRecordId = null, options = {} } = body;

        if (!questionText || typeof questionText !== 'string' || questionText.trim().length === 0) {
          return this._sendJson(res, 400, {
            error: 'INVALID_REQUEST',
            message: 'questionText is required and must be non-empty.'
          });
        }

        const result = await this.pipelineService.processQuestion({
          questionText,
          sessionId,
          origin,
          parentRecordId,
          options
        });

        return this._sendJson(res, 200, result);
      }

      // ── 2. GET /api/journey ──────────────────────────────────────────────
      if (req.method === 'GET' && pathname === '/api/journey') {
        const sessionId = parsedUrl.searchParams.get('sessionId') || 'default_session';
        const journeyState = await this.pipelineService.getJourneyState(sessionId);
        return this._sendJson(res, 200, journeyState);
      }

      // ── 2B. GET /api/history ─────────────────────────────────────────────
      if (req.method === 'GET' && pathname === '/api/history') {
        const sessionId = parsedUrl.searchParams.get('sessionId') || 'default_session';
        const history = await this.pipelineService.getQuestionHistory(sessionId);
        return this._sendJson(res, 200, { sessionId, history });
      }

      // ── 3. POST /api/assessment/generate ─────────────────────────────────
      if (req.method === 'POST' && pathname === '/api/assessment/generate') {
        const body = await this._parseJsonBody(req);
        const sessionId = body.sessionId || 'default_session';
        const journeyState = await this.pipelineService.getJourneyState(sessionId);

        const genResult = await this.assessmentService.generateAssessment({
          journeyState,
          options: body.options || {}
        });

        if (genResult.status === 'NOT_ELIGIBLE') {
          return this._sendJson(res, 403, genResult);
        }

        return this._sendJson(res, 200, genResult);
      }

      // ── 4. POST /api/assessment/submit ───────────────────────────────────
      if (req.method === 'POST' && pathname === '/api/assessment/submit') {
        const body = await this._parseJsonBody(req);
        const { assessmentId, responses = [] } = body;

        if (!assessmentId) {
          return this._sendJson(res, 400, {
            error: 'INVALID_REQUEST',
            message: 'assessmentId is required.'
          });
        }

        const normalizedResponses = (responses || []).map(r => ({
          assessmentItemId: r.assessmentItemId || r.itemId,
          selectedOptionId: r.selectedOptionId
        }));

        const scoredResult = await this.assessmentService.submitAssessment({
          assessmentId,
          responses: normalizedResponses
        });

        return this._sendJson(res, 200, scoredResult);
      }

      // ── 5. POST /api/report/generate ─────────────────────────────────────
      if (req.method === 'POST' && pathname === '/api/report/generate') {
        const body = await this._parseJsonBody(req);
        const sessionId = body.sessionId || 'default_session';
        const { assessmentResult, version = '1.0' } = body;

        const journeyState = await this.pipelineService.getJourneyState(sessionId);

        const repResult = await this.reportService.generateReport({
          journeyState,
          assessmentResult,
          version
        });

        if (repResult.status === 'REPORT_NOT_ELIGIBLE') {
          return this._sendJson(res, 403, repResult);
        }

        return this._sendJson(res, 200, repResult);
      }

      // ── 404 Not Found ────────────────────────────────────────────────────
      return this._sendJson(res, 404, {
        error: 'ENDPOINT_NOT_FOUND',
        message: `Endpoint ${req.method} ${pathname} not found.`
      });

    } catch (err) {
      // Return safe structured error without leaking secrets or stack traces
      return this._sendJson(res, 500, {
        error: 'SERVER_ERROR',
        message: err.message || 'An internal error occurred.'
      });
    }
  }

  // ── Helper Utilities ───────────────────────────────────────────────────────

  _sendJson(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.end(JSON.stringify(payload));
  }

  _parseJsonBody(req) {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => {
        data += chunk;
        if (data.length > 1e6) { // 1MB guard
          req.destroy();
          reject(new Error('PAYLOAD_TOO_LARGE'));
        }
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (e) {
          reject(new Error('INVALID_JSON: Failed to parse request body.'));
        }
      });
      req.on('error', err => reject(err));
    });
  }
}

/**
 * Creates and starts a standalone Node HTTP server instance.
 *
 * @param {Object} [options]
 * @returns {http.Server}
 */
export function createMishkatServer(options = {}) {
  const manager = new MishkatServerManager(options);
  const server = http.createServer((req, res) => manager.handleRequest(req, res));
  server.manager = manager;
  return server;
}

export const manager = new MishkatServerManager();

