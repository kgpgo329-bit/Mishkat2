/**
 * Mishkat Phase 11: Report Storage Abstraction
 *
 * Defines the storage contract and in-memory implementation for immutable
 * Journey Reports.
 * Zero Firebase dependencies.
 */

export class ReportStorageBase {
  /** @param {Object} report */
  async saveReport(report) { // eslint-disable-line no-unused-vars
    throw new Error('Not implemented: saveReport');
  }

  /** @param {string} id */
  async getReport(id) { // eslint-disable-line no-unused-vars
    throw new Error('Not implemented: getReport');
  }

  /** @param {string} sessionId */
  async getReportsBySession(sessionId) { // eslint-disable-line no-unused-vars
    throw new Error('Not implemented: getReportsBySession');
  }
}

export class InMemoryReportStorage extends ReportStorageBase {
  constructor() {
    super();
    /** @type {Map<string, Object>} reportId -> report */
    this._reports = new Map();
  }

  async saveReport(report) {
    if (!report || !report.reportId) {
      throw new Error('Invalid report: missing reportId');
    }
    this._reports.set(report.reportId, JSON.parse(JSON.stringify(report)));
  }

  async getReport(id) {
    const item = this._reports.get(id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  async getReportsBySession(sessionId) {
    const all = [...this._reports.values()];
    return all
      .filter(r => r.sessionId === sessionId)
      .map(r => JSON.parse(JSON.stringify(r)));
  }

  reset() {
    this._reports.clear();
  }
}
