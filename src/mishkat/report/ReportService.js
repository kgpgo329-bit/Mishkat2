/**
 * Mishkat Phase 11: Final Journey Report Service Orchestrator
 *
 * Coordinates report eligibility gating, summary compilation, storage immutability,
 * and client-safe delivery.
 *
 * INVARIANTS:
 * - Operates ONLY on milestone-eligible journeys with valid completed assessment results.
 * - Creates ZERO KnowledgeRecords and does NOT mutate journey progress.
 * - Storage is abstracted and in-memory (no Firebase).
 * - Delivers exactly two primary user-facing sections.
 */

import { REPORT_STATUS } from './reportTypes.js';
import { checkReportEligibility } from './reportGate.js';
import { buildJourneyReport, toClientSafeReport } from './reportBuilder.js';
import { InMemoryReportStorage } from './reportStorage.js';

export class ReportService {
  /**
   * @param {Object} [storage] Object implementing ReportStorageBase
   */
  constructor(storage) {
    this._storage = storage || new InMemoryReportStorage();
  }

  /**
   * Generates the final learning report.
   *
   * @param {Object} params
   * @param {Object} params.journeyState
   * @param {Object} params.assessmentResult
   * @param {string} [params.version]
   * @returns {Promise<{
   *   status: string,
   *   report: Object|null,
   *   reason?: string
   * }>}
   */
  async generateReport({ journeyState, assessmentResult, version = '1.0' }) {
    // 1. Eligibility Check
    const gate = checkReportEligibility({ journeyState, assessmentResult });
    if (!gate.eligible) {
      return {
        status: REPORT_STATUS.REPORT_NOT_ELIGIBLE,
        report: null,
        reason: gate.reason
      };
    }

    // 2. Build Internal Report
    const internalReport = buildJourneyReport({
      journeyState,
      assessmentResult,
      version
    });

    // 3. Persist Immutable Report
    await this._storage.saveReport(internalReport);

    // 4. Return Client-Safe Representation
    return {
      status: REPORT_STATUS.CREATED,
      report: toClientSafeReport(internalReport)
    };
  }

  /**
   * Fetches client-safe report by ID.
   * @param {string} reportId
   * @returns {Promise<Object|null>}
   */
  async getClientReport(reportId) {
    const internal = await this._storage.getReport(reportId);
    return internal ? toClientSafeReport(internal) : null;
  }

  /**
   * Fetches internal report by ID (for inspection/lineage tests).
   * @param {string} reportId
   * @returns {Promise<Object|null>}
   */
  async getInternalReport(reportId) {
    return this._storage.getReport(reportId);
  }

  /**
   * Fetches all reports for a session.
   * @param {string} sessionId
   * @returns {Promise<Array>}
   */
  async getReportsBySession(sessionId) {
    const list = await this._storage.getReportsBySession(sessionId);
    return list.map(toClientSafeReport);
  }
}

const defaultReportService = new ReportService();
export default defaultReportService;
