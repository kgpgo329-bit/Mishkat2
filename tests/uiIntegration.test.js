/**
 * Mishkat UI & Client API Integration Tests
 *
 * Verifies:
 * 1. Client API module (src/api/mishkatApi.js) isolation & exports.
 * 2. Zero server secrets or Node-only builtins in client code.
 * 3. Client HTTP contract with MishkatServerManager:
 *    - POST /api/ask (standard, personal fatwa, clarification, insufficient, deep learning origin)
 *    - GET /api/journey
 *    - POST /api/assessment/generate (before & after milestone)
 *    - POST /api/assessment/submit
 *    - POST /api/report/generate
 * 4. Lineage binding and anti-leakage guards across client-facing payloads.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

import { MishkatServerManager } from '../src/server/mishkatServer.js';
import { InMemoryJourneyStorage } from '../src/mishkat/journey/journeyStorage.js';
import { InMemoryAssessmentStorage } from '../src/mishkat/assessment/assessmentStorage.js';
import { InMemoryReportStorage } from '../src/mishkat/report/reportStorage.js';
import { MishkatPipelineService } from '../src/mishkat/pipeline/MishkatPipelineService.js';
import { AssessmentService } from '../src/mishkat/assessment/AssessmentService.js';
import { ReportService } from '../src/mishkat/report/ReportService.js';
import { defaultTrustedSourceRepository } from '../src/mishkat/knowledge/TrustedSourceRepository.js';
import { mishkatApi } from '../src/api/mishkatApi.js';

const IKHLAS_INTERPRETATION = {
  originalQuestion: 'قل هو الله أحد',
  task: 'VERIFY_QURAN',
  userGoal: 'التحقق من نص الآية الكريمة',
  claimsToResolve: [
    {
      claimId: 'claim-ikhlas',
      statement: 'قل هو الله أحد آية من سورة الإخلاص تثبت توحيد الله الخالص',
      importance: 'CORE',
      requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
    }
  ]
};

const ISLAM_PILLARS_INTERPRETATION = {
  originalQuestion: 'ما هي أركان الإسلام في حديث جبريل؟',
  task: 'EXPLAIN_RULING',
  topic: 'أركان الإسلام',
  userGoal: 'معرفة أركان الإسلام الخمسة من حديث جبريل',
  claimsToResolve: [
    {
      claimId: 'c_hadith_jibril_direct',
      statement: 'روي في حديث جبريل أن أركان الإسلام خمسة: شهادة أن لا إله إلا الله وأن محمداً رسول الله، وإقام الصلاة، وإيتاء الزكاة، وصوم رمضان، وحج البيت',
      importance: 'CORE',
      requiredEvidenceType: 'PROPHETIC_HADITH_TEXT'
    }
  ]
};

describe('UI & Client API Integration Suite', () => {
  let server;
  let serverUrl;
  let journeyStorage;
  let assessmentStorage;
  let reportStorage;
  let serverManager;

  before(async () => {
    const repo = defaultTrustedSourceRepository;
    if (repo.chunkCount === 0) {
      repo.loadFromDisk('data/knowledge');
    }

    journeyStorage = new InMemoryJourneyStorage();
    assessmentStorage = new InMemoryAssessmentStorage();
    reportStorage = new InMemoryReportStorage();

    const pipelineService = new MishkatPipelineService({
      repository: repo,
      journeyStorage
    });
    const assessmentService = new AssessmentService(assessmentStorage);
    const reportService = new ReportService(reportStorage);

    serverManager = new MishkatServerManager({
      journeyStorage,
      assessmentStorage,
      reportStorage,
      pipelineService,
      assessmentService,
      reportService
    });

    server = http.createServer((req, res) => {
      serverManager.handleRequest(req, res);
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        serverUrl = `http://127.0.0.1:${addr.port}`;
        mishkatApi.setApiBaseUrl(serverUrl);
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  // ── 1. Client Code Cleanliness & Security Isolation ────────────────────────
  describe('Security & Isolation Guards', () => {
    const clientFiles = [
      'src/api/mishkatApi.js',
      'src/App.jsx',
      'src/ui/views/HomeView.jsx',
      'src/ui/views/ResultView.jsx',
      'src/ui/views/JourneyView.jsx',
      'src/ui/views/AssessmentView.jsx',
      'src/ui/views/JourneyReportView.jsx',
      'src/ui/components/DeepLearningSection.jsx'
    ];

    test('1. Client files must NOT import Node-only builtins (fs, crypto, http, path)', () => {
      for (const relPath of clientFiles) {
        const fullPath = path.resolve(process.cwd(), relPath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert.doesNotMatch(content, /from\s+['"]node:crypto['"]/, `${relPath} imports node:crypto`);
          assert.doesNotMatch(content, /from\s+['"]crypto['"]/, `${relPath} imports crypto`);
          assert.doesNotMatch(content, /from\s+['"]node:fs['"]/, `${relPath} imports node:fs`);
          assert.doesNotMatch(content, /from\s+['"]fs['"]/, `${relPath} imports fs`);
          assert.doesNotMatch(content, /from\s+['"]node:http['"]/, `${relPath} imports node:http`);
        }
      }
    });

    test('2. Client files must NOT import server Gemini SDK or domain internals', () => {
      for (const relPath of clientFiles) {
        const fullPath = path.resolve(process.cwd(), relPath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert.doesNotMatch(content, /@google\/genai/, `${relPath} imports @google/genai`);
          assert.doesNotMatch(content, /from\s+['"]\.\.?\/mishkat\//, `${relPath} directly imports src/mishkat/`);
        }
      }
    });

    test('3. Client files must NOT expose GEMINI_API_KEY or VITE_* secret references', () => {
      for (const relPath of clientFiles) {
        const fullPath = path.resolve(process.cwd(), relPath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert.doesNotMatch(content, /process\.env\.GEMINI_API_KEY/, `${relPath} references GEMINI_API_KEY`);
          assert.doesNotMatch(content, /VITE_GEMINI_API_KEY/, `${relPath} references VITE_GEMINI_API_KEY`);
        }
      }
    });

    test('4. Root .gitignore exists and ignores .env, node_modules, and logs', () => {
      const gitignorePath = path.resolve(process.cwd(), '.gitignore');
      assert.ok(fs.existsSync(gitignorePath), '.gitignore must exist');
      const content = fs.readFileSync(gitignorePath, 'utf8');
      assert.ok(content.includes('.env'), '.gitignore must ignore .env');
      assert.ok(content.includes('node_modules'), '.gitignore must ignore node_modules');
    });
  });

  // ── 2. Client API Bridge Tests ─────────────────────────────────────────────
  describe('Client HTTP API Bridge Contract', () => {
    const testSession = 'ui_test_session_' + Date.now();

    test('5. POST /api/ask via mishkatApi with valid question returns grounded answer', async () => {
      const res = await mishkatApi.askQuestion({
        questionText: 'قل هو الله أحد',
        sessionId: testSession,
        origin: 'USER_QUESTION',
        options: {
          interpretationOverride: IKHLAS_INTERPRETATION,
          mode: 'deterministic'
        }
      });

      assert.equal(res.success, true);
      assert.equal(res.data.status, 'ANSWERED');
      assert.ok(res.data.answer && res.data.answer.length > 20);
      assert.ok(Array.isArray(res.data.sources) && res.data.sources.length > 0);
      assert.ok(Array.isArray(res.data.citations));
      assert.ok(Array.isArray(res.data.deepLearningSuggestions));
      assert.ok(res.data.recordId, 'Must produce a journey recordId');
    });

    test('6. POST /api/ask with personal fatwa returns REFER_TO_AUTHORITY', async () => {
      const res = await mishkatApi.askQuestion({
        questionText: 'طلقت زوجتي طلقة واحدة وأنا غضبان هل يقع طلاقي؟',
        sessionId: testSession,
        options: { mode: 'deterministic' }
      });

      assert.equal(res.success, true);
      assert.equal(res.data.status, 'REFER_TO_AUTHORITY');
      assert.match(res.data.answer, /مراجعة دور الإفتاء|مفتٍ/);
      assert.equal(res.data.recordId, null);
    });

    test('7. POST /api/ask with ambiguous question returns NEEDS_CLARIFICATION', async () => {
      const res = await mishkatApi.askQuestion({
        questionText: 'هل هذا الحديث صحيح؟',
        sessionId: testSession,
        options: { mode: 'deterministic' }
      });

      assert.equal(res.success, true);
      assert.equal(res.data.status, 'NEEDS_CLARIFICATION');
      assert.ok(res.data.answer.includes('توضيح'));
      assert.equal(res.data.recordId, null);
    });

    test('8. POST /api/ask with ungrounded/unknown claim returns INSUFFICIENT', async () => {
      const res = await mishkatApi.askQuestion({
        questionText: 'ما هي مواصفات المحرك النفاث التوربيني؟',
        sessionId: testSession,
        options: { mode: 'deterministic' }
      });

      assert.equal(res.success, true);
      assert.equal(res.data.status, 'INSUFFICIENT');
      assert.equal(res.data.recordId, null);
    });

    test('9. GET /api/journey returns current verified progress and records', async () => {
      const res = await mishkatApi.getJourney(testSession);
      assert.equal(res.success, true);
      const json = res.data;
      assert.equal(json.sessionId, testSession);
      assert.equal(json.uniqueVerifiedCount, 1);
      assert.equal(json.targetCount, 20);
      assert.ok(Array.isArray(json.verifiedRecords));
      assert.equal(json.verifiedRecords.length, 1);
    });

    test('10. POST /api/ask with origin DEEP_LEARNING preserves parent lineage', async () => {
      const journeyRes = await mishkatApi.getJourney(testSession);
      const parentRecordId = journeyRes.data.verifiedRecords[0].id;

      const dlRes = await mishkatApi.askQuestion({
        questionText: 'ما هي أركان الإسلام في حديث جبريل؟',
        sessionId: testSession,
        origin: 'DEEP_LEARNING',
        parentRecordId,
        options: {
          interpretationOverride: ISLAM_PILLARS_INTERPRETATION,
          mode: 'deterministic'
        }
      });

      assert.equal(dlRes.success, true);
      assert.equal(dlRes.data.status, 'ANSWERED');

      // Verify record registered with lineage
      const record = await journeyStorage.getRecord(dlRes.data.recordId);
      assert.ok(record);
      assert.equal(record.origin, 'DEEP_LEARNING');
      assert.equal(record.parentRecordId, parentRecordId);
    });

    test('11. POST /api/assessment/generate before milestone returns 403 NOT_ELIGIBLE', async () => {
      const res = await mishkatApi.generateAssessment({ sessionId: testSession });
      assert.equal(res.success, false);
      assert.equal(res.status, 403);
      assert.equal(res.data.status, 'NOT_ELIGIBLE');
    });

    test('12. Assessment generation after reaching milestone (20 records) returns client-safe items', async () => {
      const milestoneSession = 'milestone_session_' + Date.now();

      // Seed 20 verified records into milestoneSession with fingerprints
      for (let i = 1; i <= 20; i++) {
        await journeyStorage.saveRecord({
          id: `rec_ms_${i}`,
          sessionId: milestoneSession,
          fingerprint: `fp_ms_${i}`,
          topic: `الموضوع_${Math.ceil(i / 4)}`,
          canonicalTopic: `الموضوع_${Math.ceil(i / 4)}`,
          concepts: [`المفهوم_${i}`],
          status: 'VERIFIED',
          origin: 'USER_QUESTION',
          parentRecordId: null,
          questionHash: `hash_${i}`,
          originalQuestion: `سؤال موثق رقم ${i}`,
          questionText: `سؤال موثق رقم ${i}`,
          sources: [{ sourceId: 'src_1', sourceName: 'تفسير الطبري' }],
          verifiedEvidenceSnippets: [{ text: `دليل موثق رقم ${i}` }],
          timestamp: new Date().toISOString()
        });
      }

      const res = await mishkatApi.generateAssessment({ sessionId: milestoneSession });
      assert.equal(res.success, true);
      assert.equal(res.data.status, 'CREATED');

      const assessment = res.data.assessment || res.data;
      assert.ok(assessment.assessmentId);
      assert.equal(assessment.totalItems, 10);
      assert.ok(Array.isArray(assessment.items) && assessment.items.length === 10);

      // Verify no answers leaked in client items
      for (const item of assessment.items) {
        assert.ok(item.assessmentItemId || item.itemId);
        assert.ok(item.question);
        assert.ok(Array.isArray(item.options) && item.options.length >= 2);
        assert.equal(item.correctOptionId, undefined, 'Must not leak correctOptionId');
        for (const opt of item.options) {
          assert.equal(opt.isCorrect, undefined, 'Must not leak isCorrect');
        }
      }

      // 13. POST /api/assessment/submit evaluates responses correctly
      const submission = assessment.items.map(item => ({
        assessmentItemId: item.assessmentItemId || item.itemId,
        selectedOptionId: item.options[0].optionId || item.options[0].id
      }));

      const submitRes = await mishkatApi.submitAssessment({
        assessmentId: assessment.assessmentId,
        responses: submission
      });

      assert.equal(submitRes.success, true);
      assert.ok(submitRes.data.submissionId);
      assert.equal(submitRes.data.totalItems, 10);
      assert.equal(typeof submitRes.data.scorePercentage, 'number');

      // 14. POST /api/report/generate produces client-safe two-part report
      const repRes = await mishkatApi.generateReport({
        sessionId: milestoneSession,
        assessmentResult: submitRes.data
      });

      assert.equal(repRes.success, true);
      const report = repRes.data.report || repRes.data;
      assert.ok(report.reportId);
      assert.ok(report.sections['ملخص الرحلة المعرفية']);
      assert.ok(report.sections['تقييم الفهم']);

      const jsSection = report.sections['ملخص الرحلة المعرفية'];
      const asSection = report.sections['تقييم الفهم'];
      assert.ok(jsSection.uniqueVerifiedCount >= 20);
      assert.equal(asSection.totalItems, 10);
      assert.equal(asSection.scorePercentage, submitRes.data.scorePercentage);
    });

    test('15. POST /api/report/generate before completed assessment returns 403', async () => {
      const freshSession = 'fresh_session_' + Date.now();
      const res = await mishkatApi.generateReport({
        sessionId: freshSession,
        assessmentResult: null
      });

      assert.equal(res.success, false);
      assert.equal(res.status, 403);
      assert.equal(res.data.status, 'REPORT_NOT_ELIGIBLE');
    });

    test('16. POST /api/ask rejects empty questionText with 400', async () => {
      const res = await mishkatApi.askQuestion({
        questionText: '   '
      });

      assert.equal(res.success, false);
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'INVALID_REQUEST');
    });

    test('17. Unknown endpoints return 404', async () => {
      const rawRes = await fetch(`${serverUrl}/api/unknown_route`);
      assert.equal(rawRes.status, 404);
      const json = await rawRes.json();
      assert.equal(json.error, 'ENDPOINT_NOT_FOUND');
    });

    test('18. OPTIONS requests return 204 with CORS headers', async () => {
      const rawRes = await fetch(`${serverUrl}/api/ask`, {
        method: 'OPTIONS'
      });
      assert.equal(rawRes.status, 204);
      assert.equal(rawRes.headers.get('access-control-allow-origin'), '*');
    });
  });
});
