/**
 * Base Source Adapter — Abstract Contract for Knowledge Ingestion
 * 
 * Standardizes source data extraction into canonical KnowledgeRecords.
 * All domain-specific and format-specific adapters must implement this contract.
 */

export class BaseSourceAdapter {
  constructor(sourceId, options = {}) {
    if (!sourceId || typeof sourceId !== 'string') {
      throw new Error('INVALID_ADAPTER_SOURCE_ID: Adapter requires a registered sourceId.');
    }
    this.sourceId = sourceId.trim();
    this.options = options;
  }

  /**
   * Loads raw content from a given input (file path, raw string, or buffer)
   * @param {any} input 
   * @returns {Promise<any>|any}
   */
  async load(input) {
    throw new Error('NOT_IMPLEMENTED: load() must be implemented by subclass.');
  }

  /**
   * Normalizes raw input data into structured intermediate form
   * @param {any} rawData 
   * @returns {any}
   */
  normalize(rawData) {
    return rawData;
  }

  /**
   * Validates intermediate structured data before conversion
   * @param {any} structuredData 
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  validate(structuredData) {
    return { isValid: true, errors: [] };
  }

  /**
   * Transforms structured data into canonical KnowledgeRecord array
   * @param {any} structuredData 
   * @returns {Promise<Array<Object>>|Array<Object>}
   */
  toKnowledgeRecords(structuredData) {
    throw new Error('NOT_IMPLEMENTED: toKnowledgeRecords() must be implemented by subclass.');
  }

  /**
   * Full ingestion pipeline: load -> normalize -> validate -> toKnowledgeRecords
   * @param {any} input 
   * @returns {Promise<Array<Object>>}
   */
  async ingest(input) {
    const rawData = await this.load(input);
    const normalizedData = this.normalize(rawData);
    const validation = this.validate(normalizedData);
    if (!validation.isValid) {
      throw new Error(`ADAPTER_VALIDATION_FAILED: ${validation.errors.join('; ')}`);
    }
    return this.toKnowledgeRecords(normalizedData);
  }
}

export default BaseSourceAdapter;
