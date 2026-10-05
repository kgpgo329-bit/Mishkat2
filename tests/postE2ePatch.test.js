/**
 * Mishkat Post-E2E Safe Patch: Comprehensive Test Suite
 *
 * Verifies the three UX / integration enhancements:
 * 1. AI Deep Learning follow-ups with bounded timeout & safe deterministic fallback.
 * 2. Question History persistence, endpoints, and strict isolation from Journey progress.
 * 3. Journey view empty state and removal of fake/mock production data.
 * 4. Assessment and Report milestone integrity.
 * 5. Security & secret isolation.
 * 6. Live / mock Firestore history storage (write -> read -> verify -> delete).
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

import { MishkatServerManager } from '../src/server/mishkatServer.js';
import { MishkatPipelineService } from '../src/mishkat/pipeline/MishkatPipelineService.js';
import { AssessmentService } from '../src/mishkat/assessment/AssessmentService.js';
import { ReportService } from '../src/mishkat/report/ReportService.js';
import { defaultTrustedSourceRepository } from '../src/mishkat/knowledge/TrustedSourceRepository.js';
import { InMemoryJourneyStorage } from '../src/mishkat/journey/journeyStorage.js';
import { InMemoryAssessmentStorage } from '../src/mishkat/assessment/assessmentStorage.js';
import { InMemoryReportStorage } from '../src/mishkat/report/reportStorage.js';
import { InMemoryHistoryStorage } from '../src/mishkat/history/historyStorage.js';
import { FirestoreHistoryStorage } from '../src/mishkat/firebase/FirestoreHistoryStorage.js';
import { isAdminCredentialConfigured, getAdminFirestoreDb } from '../src/mishkat/firebase/firebaseAdmin.js';
import { DeepLearningService } from '../src/mishkat/deeplearning/DeepLearningService.js';
import { mishkatApi } from '../src/api/mishkatApi.js';

const IKHLAS_INTERPRETATION = {
  originalQuestion: 'قل هو الله أحد',
  task: 'VERIFY_QURAN',
  userGoal: 'التحقق من نص الآية الكريمة',
  claimsToResolve: [
    {
      claimId: 'claim-ikhlas-test',
      statement: 'قل هو الله أحد آية من سورة الإخلاص تثبت توحيد الله الخالص',
      importance: 'CORE',
      requiredEvidenceType: 'QURANIC_CANONICAL_TEXT'
    }
  ]
};

describe('Mishkat Post-E2E Safe Patch Battery', () => {
  let server;
  let serverUrl;
  let journeyStorage;
  let historyStorage;
  let pipelineService;
  let serverManager;

  before(async () => {
    const repo = defaultTrustedSourceRepository;
    if (repo.chunkCount === 0) {
      repo.loadFromDisk('data/knowledge');
    }

    journeyStorage = new InMemoryJourneyStorage();
    historyStorage = new InMemoryHistoryStorage();
    const assessmentStorage = new InMemoryAssessmentStorage();
    const reportStorage = new InMemoryReportStorage();

    pipelineService = new MishkatPipelineService({
      repository: repo,
      journeyStorage,
      historyStorage
    });

    const assessmentService = new AssessmentService(assessmentStorage);
    const reportService = new ReportService(reportStorage);

    serverManager = new MishkatServerManager({
      journeyStorage,
      historyStorage,
      assessmentStorage,
      reportStorage,
      pipelineService,
      assessmentService,
      reportService
    });

    server = http.createServer((req, res) => serverManager.handleRequest(req, res));

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

  beforeEach(() => {
    journeyStorage.reset();
    historyStorage._history.clear();
  });

  // ── A. Deep Learning AI & Fallback ──────────────────────────────────────────
  describe('A. Deep Learning AI & Fallback Verification', () => {
    test('1. Eligible VERIFIED answer with mock AI generator returns AI suggestions', async () => {
      const dlService = new DeepLearningService();
      const mockAiOutput = [
        {
          question: 'ما هي مناسبة نزول سورة الإخلاص في مكة؟',
          origin: 'DEEP_LEARNING',
          parentRecordId: null,
          rationale: 'استكشاف أسباب النزول'
        },
        {
          question: 'كيف دلت سورة الإخلاص على نفي الشرك بكافة صوره؟',
          origin: 'DEEP_LEARNING',
          parentRecordId: null,
          rationale: 'بيان المعاني العقدية'
        }
      ];

      const res = await dlService.generateFollowUps({
        interpretation: IKHLAS_INTERPRETATION,
        sufficiencyResult: {
          overallSufficiency: 'SUFFICIENT',
          routing: 'ANSWERED',
          claims: [{ claimId: 'claim-1', supportingEvidence: [{ evidenceId: 'ev-1' }] }]
        },
        answerResult: {
          answerStatus: 'ANSWERED',
          answerClaims: [{ claimId: 'ac-1', statement: 'توحيد الله' }],
          sources: [{ sourceId: 'src-1', sourceName: 'تفسير الطبري' }],
          groundingVerification: { status: 'VERIFIED', isFullyGrounded: true }
        },
        options: {
          generatorOverride: async () => mockAiOutput
        }
      });

      assert.equal(res.status, 'SUCCESS');
      assert.equal(res.suggestions.length, 2);
      assert.equal(res.suggestions[0].question, 'ما هي مناسبة نزول سورة الإخلاص في مكة؟');
      assert.equal(res.suggestions[0].origin, 'DEEP_LEARNING');
      assert.equal(res.suggestions[0].parentRecordId, null);
    });

    test('2. AI generator failure safely falls back to deterministic generator without throwing', async () => {
      const dlService = new DeepLearningService();
      const res = await dlService.generateFollowUps({
        interpretation: IKHLAS_INTERPRETATION,
        sufficiencyResult: {
          overallSufficiency: 'SUFFICIENT',
          routing: 'ANSWERED',
          claims: [{ claimId: 'claim-1', supportingEvidence: [{ evidenceId: 'ev-1' }] }]
        },
        answerResult: {
          answerStatus: 'ANSWERED',
          answerClaims: [{ claimId: 'ac-1', statement: 'توحيد الله' }],
          sources: [{ sourceId: 'src-1', sourceName: 'تفسير الطبري' }],
          groundingVerification: { status: 'VERIFIED', isFullyGrounded: true }
        },
        options: {
          generatorOverride: async () => {
            throw new Error('Gemini API 503 Rate limit or network timeout');
          }
        }
      });

      assert.ok(res.status === 'SUCCESS' || res.status === 'GATED');
    });

    test('3. Deduplication rejects AI questions repeating the original question', async () => {
      const dlService = new DeepLearningService();
      const mockDuplicateOutput = [
        { question: 'قل هو الله أحد', origin: 'DEEP_LEARNING', parentRecordId: null, rationale: 'Duplicate' },
        { question: 'ما هو فضل سورة الإخلاص في السنة النبوية؟', origin: 'DEEP_LEARNING', parentRecordId: null, rationale: 'Valid' }
      ];

      const res = await dlService.generateFollowUps({
        interpretation: IKHLAS_INTERPRETATION,
        sufficiencyResult: {
          overallSufficiency: 'SUFFICIENT',
          routing: 'ANSWERED',
          claims: [{ claimId: 'claim-1', supportingEvidence: [{ evidenceId: 'ev-1' }] }]
        },
        answerResult: {
          answerStatus: 'ANSWERED',
          answerClaims: [{ claimId: 'ac-1', statement: 'توحيد الله' }],
          sources: [{ sourceId: 'src-1', sourceName: 'تفسير الطبري' }],
          groundingVerification: { status: 'VERIFIED', isFullyGrounded: true }
        },
        options: {
          generatorOverride: async () => mockDuplicateOutput
        }
      });

      // The duplicate is rejected (1 rejected), and the valid suggestion is accepted (1 accepted)
      assert.equal(res.status, 'SUCCESS');
      assert.equal(res.suggestions.length, 1);
      assert.equal(res.diagnostics.rejectedCount, 1);
      assert.equal(res.diagnostics.rejections[0].reason, 'DUPLICATE_ORIGINAL_QUESTION');
      assert.equal(res.suggestions[0].question, 'ما هو فضل سورة الإخلاص في السنة النبوية؟');
    });

    test('4. Selected Deep Learning follow-up enters same pipeline with origin DEEP_LEARNING', async () => {
      const session = 'test_dl_pipeline_' + Date.now();
      const askRes = await mishkatApi.askQuestion({
        questionText: 'قل هو الله أحد',
        sessionId: session,
        origin: 'USER_QUESTION',
        options: {
          interpretationOverride: IKHLAS_INTERPRETATION,
          mode: 'deterministic'
        }
      });

      assert.equal(askRes.success, true);
      const parentId = askRes.data.recordId;
      assert.ok(parentId);

      // Re-enter with follow-up
      const followUpRes = await mishkatApi.askQuestion({
        questionText: 'ما هي أحكام التوحيد في سورة الإخلاص؟',
        sessionId: session,
        origin: 'DEEP_LEARNING',
        parentRecordId: parentId,
        options: {
          interpretationOverride: IKHLAS_INTERPRETATION,
          mode: 'deterministic'
        }
      });

      assert.equal(followUpRes.success, true);
      assert.equal(followUpRes.data.status, 'ANSWERED');
    });
  });

  // ── B. Question History & Journey Progress Isolation ────────────────────────
  describe('B. Question History & Journey Progress Isolation', () => {
    test('5. Standard answered question is recorded in question history', async () => {
      const histSession = 'hist_session_' + Date.now();
      const res = await mishkatApi.askQuestion({
        questionText: 'قل هو الله أحد',
        sessionId: histSession,
        origin: 'USER_QUESTION',
        options: {
          interpretationOverride: IKHLAS_INTERPRETATION,
          mode: 'deterministic'
        }
      });

      assert.equal(res.success, true);
      const histRes = await mishkatApi.getQuestionHistory(histSession);
      assert.equal(histRes.success, true);
      assert.ok(Array.isArray(histRes.data.history));
      assert.equal(histRes.data.history.length, 1);

      const entry = histRes.data.history[0];
      assert.equal(entry.sessionId, histSession);
      assert.equal(entry.originalQuestion, 'قل هو الله أحد');
      assert.equal(entry.status, 'ANSWERED');
      assert.ok(entry.recordId);
      assert.equal(entry.origin, 'USER_QUESTION');
    });

    test('6. Special routed questions (fatwa, clarification, insufficient) are recorded in history', async () => {
      const histSession = 'hist_session_special_' + Date.now();

      // Personal Fatwa
      await mishkatApi.askQuestion({
        questionText: 'طلقت زوجتي طلقة واحدة وأنا غضبان هل يقع طلاقي؟',
        sessionId: histSession,
        options: { mode: 'deterministic' }
      });

      // Clarification
      await mishkatApi.askQuestion({
        questionText: 'هل هذا الحديث صحيح؟',
        sessionId: histSession,
        options: { mode: 'deterministic' }
      });

      // Insufficient
      await mishkatApi.askQuestion({
        questionText: 'ما هي مواصفات المحرك النفاث التوربيني؟',
        sessionId: histSession,
        options: { mode: 'deterministic' }
      });

      const histRes = await mishkatApi.getQuestionHistory(histSession);
      assert.equal(histRes.success, true);
      assert.equal(histRes.data.history.length, 3);

      const statuses = histRes.data.history.map(h => h.status);
      assert.ok(statuses.includes('REFER_TO_AUTHORITY'));
      assert.ok(statuses.includes('NEEDS_CLARIFICATION'));
      assert.ok(statuses.includes('INSUFFICIENT'));
    });

    test('7. STRICT ISOLATION: Question History does NOT inflate Journey progress', async () => {
      const histSession = 'hist_isolation_' + Date.now();

      // Ask 1 verified question
      await mishkatApi.askQuestion({
        questionText: 'قل هو الله أحد',
        sessionId: histSession,
        options: {
          interpretationOverride: IKHLAS_INTERPRETATION,
          mode: 'deterministic'
        }
      });

      // Ask 3 non-verified questions
      await mishkatApi.askQuestion({
        questionText: 'طلقت زوجتي طلقة واحدة وأنا غضبان هل يقع طلاقي؟',
        sessionId: histSession,
        options: { mode: 'deterministic' }
      });
      await mishkatApi.askQuestion({
        questionText: 'هل هذا الحديث صحيح؟',
        sessionId: histSession,
        options: { mode: 'deterministic' }
      });
      await mishkatApi.askQuestion({
        questionText: 'ما هي مواصفات المحرك النفاث التوربيني؟',
        sessionId: histSession,
        options: { mode: 'deterministic' }
      });

      const journeyRes = await mishkatApi.getJourney(histSession);
      assert.equal(journeyRes.success, true);

      // Only the 1 verified question counts in Journey progress!
      assert.equal(journeyRes.data.uniqueVerifiedCount, 1);
      assert.equal(journeyRes.data.verifiedRecords.length, 1);

      // But history has all 4 entries
      const histRes = await mishkatApi.getQuestionHistory(histSession);
      assert.equal(histRes.data.history.length, 4);
    });

    test('8. Asking ungrounded questions leaves Journey progress at 0 and Assessment locked', async () => {
      const freshSession = 'zero_progress_session_' + Date.now();

      for (let i = 1; i <= 3; i++) {
        await mishkatApi.askQuestion({
          questionText: `ما هي مواصفات المحرك النفاث التوربيني؟`,
          sessionId: freshSession,
          options: { mode: 'deterministic' }
        });
      }

      const journeyRes = await mishkatApi.getJourney(freshSession);
      assert.equal(journeyRes.data.uniqueVerifiedCount, 0);
      assert.equal(journeyRes.data.verifiedRecords.length, 0);

      // Assessment MUST be locked
      const assessRes = await mishkatApi.generateAssessment({ sessionId: freshSession });
      assert.equal(assessRes.success, false);
      assert.equal(assessRes.status, 403);
      assert.equal(assessRes.data.status, 'NOT_ELIGIBLE');
    });
  });

  // ── C. Journey View Empty State & Mock Removal ──────────────────────────────
  describe('C. Journey View Empty State & Real Data Only', () => {
    test('9. Fresh session has exactly 0 verified records and empty array', async () => {
      const freshSession = 'empty_journey_session_' + Date.now();
      const res = await mishkatApi.getJourney(freshSession);
      assert.equal(res.success, true);
      assert.equal(res.data.uniqueVerifiedCount, 0);
      assert.deepEqual(res.data.verifiedRecords, []);
    });

    test('10. Duplicate verified question does NOT inflate Journey progress', async () => {
      const dupSession = 'dup_session_' + Date.now();

      // First ask
      const firstRes = await mishkatApi.askQuestion({
        questionText: 'قل هو الله أحد',
        sessionId: dupSession,
        origin: 'USER_QUESTION',
        options: {
          interpretationOverride: IKHLAS_INTERPRETATION,
          mode: 'deterministic'
        }
      });
      assert.equal(firstRes.data.duplicateDetected, false);

      // Second ask (same question)
      const secondRes = await mishkatApi.askQuestion({
        questionText: 'قل هو الله أحد',
        sessionId: dupSession,
        origin: 'USER_QUESTION',
        options: {
          interpretationOverride: IKHLAS_INTERPRETATION,
          mode: 'deterministic'
        }
      });
      assert.equal(secondRes.data.duplicateDetected, true);

      // Journey progress remains exactly 1
      const journeyRes = await mishkatApi.getJourney(dupSession);
      assert.equal(journeyRes.data.uniqueVerifiedCount, 1);
      assert.equal(journeyRes.data.verifiedRecords.length, 1);

      // But question history records both asks
      const histRes = await mishkatApi.getQuestionHistory(dupSession);
      assert.equal(histRes.data.history.length, 2);
    });
  });

  // ── D. Firestore History Storage Contract & Live Smoke Test ─────────────────
  describe('D. Firestore History Storage Contract & Live Smoke Test', () => {
    test('11. FirestoreHistoryStorage mock contract: save -> get -> delete', async () => {
      const mockStore = new Map();
      const mockDb = {
        doc: (_db, ...segs) => ({ path: segs.join('/'), id: segs[segs.length - 1] }),
        collection: (_db, ...segs) => ({ path: segs.join('/') })
      };
      const mockOps = {
        doc: mockDb.doc,
        collection: mockDb.collection,
        setDoc: async (ref, data) => mockStore.set(ref.path, JSON.parse(JSON.stringify(data))),
        getDocs: async (colRef) => {
          const docs = [];
          for (const [k, v] of mockStore.entries()) {
            if (k.startsWith(colRef.path + '/')) {
              docs.push({ id: k.split('/').pop(), data: () => v });
            }
          }
          return { forEach: (fn) => docs.forEach(fn), docs };
        },
        deleteDoc: async (ref) => mockStore.delete(ref.path)
      };

      const storage = new FirestoreHistoryStorage(mockDb, { firestoreOps: mockOps });
      const testInter = {
        interactionId: 'hist_mock_001',
        sessionId: 'sess_mock',
        originalQuestion: 'سؤال تجريبي للاختبار',
        timestamp: new Date().toISOString(),
        status: 'ANSWERED',
        recordId: 'rec_001',
        origin: 'USER_QUESTION',
        parentRecordId: null
      };

      await storage.saveInteraction(testInter);
      const list = await storage.getHistory('sess_mock');
      assert.equal(list.length, 1);
      assert.equal(list[0].interactionId, 'hist_mock_001');
      assert.equal(list[0].originalQuestion, 'سؤال تجريبي للاختبار');

      await storage.deleteInteraction('sess_mock', 'hist_mock_001');
      const listAfter = await storage.getHistory('sess_mock');
      assert.equal(listAfter.length, 0);
    });

    test('12. LIVE FIRESTORE SMOKE TEST for History Storage (write -> read -> verify -> delete)', async () => {
      if (!isAdminCredentialConfigured()) {
        return;
      }

      const db = getAdminFirestoreDb();
      const liveStorage = new FirestoreHistoryStorage(db);
      const smokeSessionId = 'live_history_smoke_' + Date.now();
      const smokeInteractionId = 'hist_live_' + Date.now();

      const smokeInteraction = {
        interactionId: smokeInteractionId,
        sessionId: smokeSessionId,
        originalQuestion: 'سؤال اختبار الاتصال الحي بسجل التساؤلات',
        timestamp: new Date().toISOString(),
        status: 'ANSWERED',
        recordId: 'rec_smoke_temp',
        origin: 'USER_QUESTION',
        parentRecordId: null
      };

      try {
        // 1. Write
        await liveStorage.saveInteraction(smokeInteraction);

        // 2. Read back
        const history = await liveStorage.getHistory(smokeSessionId);
        assert.ok(Array.isArray(history));
        assert.equal(history.length, 1);

        // 3. Verify
        assert.equal(history[0].interactionId, smokeInteractionId);
        assert.equal(history[0].originalQuestion, smokeInteraction.originalQuestion);
        assert.equal(history[0].status, 'ANSWERED');

        // 4. Delete cleanup
        await liveStorage.deleteInteraction(smokeSessionId, smokeInteractionId);

        // Verify cleanup
        const afterDelete = await liveStorage.getHistory(smokeSessionId);
        assert.equal(afterDelete.length, 0);
      } finally {
        await liveStorage.clearSession(smokeSessionId).catch(() => {});
      }
    });
  });

  // ── E. Security & Isolation ─────────────────────────────────────────────────
  describe('E. Security & Isolation Verification', () => {
    test('13. Client code must NOT import Node-only modules or server files', () => {
      const clientFiles = [
        'src/api/mishkatApi.js',
        'src/App.jsx',
        'src/ui/views/JourneyView.jsx'
      ];

      for (const rel of clientFiles) {
        const full = path.resolve(process.cwd(), rel);
        if (fs.existsSync(full)) {
          const content = fs.readFileSync(full, 'utf8');
          assert.doesNotMatch(content, /from\s+['"]node:/, `${rel} imports node:*`);
          assert.doesNotMatch(content, /process\.env\.GEMINI_API_KEY/, `${rel} references GEMINI_API_KEY`);
          assert.doesNotMatch(content, /serviceAccountKey/, `${rel} references serviceAccountKey`);
        }
      }
    });

    test('14. firestore.rules denies direct client access to /sessions/{sessionId}/history', () => {
      const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
      assert.match(rules, /match\s+\/sessions\/\{sessionId\}\/\{document=\*\*\}\s*\{\s*allow read,\s*write:\s*if false;/);
      assert.match(rules, /match\s+\/\{document=\*\*\}\s*\{\s*allow read,\s*write:\s*if false;/);
    });
  });
});
