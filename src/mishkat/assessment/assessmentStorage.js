/**
 * Mishkat Phase 10: Assessment Storage Abstraction
 *
 * Defines the storage interface for saving/retrieving assessment instances
 * and submission results.
 *
 * Includes InMemoryAssessmentStorage for deterministic tests and offline execution.
 * Zero Firebase dependencies.
 */

export class AssessmentStorageBase {
  /** @param {Object} assessment */
  async saveAssessment(assessment) { // eslint-disable-line no-unused-vars
    throw new Error('Not implemented: saveAssessment');
  }

  /** @param {string} id */
  async getAssessment(id) { // eslint-disable-line no-unused-vars
    throw new Error('Not implemented: getAssessment');
  }

  /** @param {Object} submission */
  async saveSubmission(submission) { // eslint-disable-line no-unused-vars
    throw new Error('Not implemented: saveSubmission');
  }

  /** @param {string} id */
  async getSubmission(id) { // eslint-disable-line no-unused-vars
    throw new Error('Not implemented: getSubmission');
  }
}

export class InMemoryAssessmentStorage extends AssessmentStorageBase {
  constructor() {
    super();
    /** @type {Map<string, Object>} assessmentId -> assessment */
    this._assessments = new Map();
    /** @type {Map<string, Object>} submissionId -> submission */
    this._submissions = new Map();
  }

  async saveAssessment(assessment) {
    if (!assessment || !assessment.assessmentId) {
      throw new Error('Invalid assessment: missing assessmentId');
    }
    this._assessments.set(assessment.assessmentId, JSON.parse(JSON.stringify(assessment)));
  }

  async getAssessment(id) {
    const item = this._assessments.get(id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  async saveSubmission(submission) {
    if (!submission || !submission.submissionId) {
      throw new Error('Invalid submission: missing submissionId');
    }
    this._submissions.set(submission.submissionId, JSON.parse(JSON.stringify(submission)));
  }

  async getSubmission(id) {
    const item = this._submissions.get(id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  reset() {
    this._assessments.clear();
    this._submissions.clear();
  }
}
