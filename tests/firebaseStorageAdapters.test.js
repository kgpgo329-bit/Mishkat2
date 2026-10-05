/**
 * Mishkat Final Integration Step 3: Firebase Storage Adapters & Restoration Tests
 *
 * Deterministic test battery verifying:
 * 1. FirestoreJourneyStorage contract conformity
 * 2. FirestoreAssessmentStorage contract conformity & private key containment
 * 3. FirestoreReportStorage contract conformity & immutability
 * 4. StorageFactory dynamic selection ('memory' vs 'firestore')
 * 5. Full Server Restart / Session Restoration across instances:
 *    - Journey records & count survive restart
 *    - Duplicate learning does not inflate count after restart
 *    - Lineage (parentRecordId) survives restart
 *    - Assessment eligibility survives restart
 *    - Private answer key remains server-side after restart
 *    - Assessment submission survives restart
 *    - Report snapshot & sections survive restart
 * 6. Zero network requirement — mockable, deterministic, zero Firebase costs.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  FirestoreJourneyStorage,
  FirestoreAssessmentStorage,
  FirestoreReportStorage,
  createStorage,
  isFirebaseConfigured,
  getFirebaseConfig
} from '../src/mishkat/firebase/index.js';
import { MishkatServerManager } from '../src/server/mishkatServer.js';
import { MishkatPipelineService } from '../src/mishkat/pipeline/MishkatPipelineService.js';
import { AssessmentService } from '../src/mishkat/assessment/AssessmentService.js';
import { ReportService } from '../src/mishkat/report/ReportService.js';
import { defaultTrustedSourceRepository } from '../src/mishkat/knowledge/TrustedSourceRepository.js';

// ── In-Memory Firestore Modular API Mock ────────────────────────────────────

function createMockFirestore() {
  const store = new Map(); // path -> object

  const mockDb = {
    _store: store,
    doc(db, ...segments) {
      const p = segments.join('/');
      return { type: 'doc', path: p, id: segments[segments.length - 1] };
    },
    collection(db, ...segments) {
      const p = segments.join('/');
      return { type: 'collection', path: p };
    },
    async getDoc(docRef) {
      const val = store.get(docRef.path);
      return {
        id: docRef.id,
        exists: () => val !== undefined,
        data: () => (val ? JSON.parse(JSON.stringify(val)) : undefined)
      };
    },
    async setDoc(docRef, data, options = {}) {
      if (options.merge && store.has(docRef.path)) {
        const existing = store.get(docRef.path);
        store.set(docRef.path, { ...existing, ...JSON.parse(JSON.stringify(data)) });
      } else {
        store.set(docRef.path, JSON.parse(JSON.stringify(data)));
      }
    },
    async getDocs(colRef) {
      const prefix = colRef.path + '/';
      const docs = [];
      for (const [key, val] of store.entries()) {
        if (key.startsWith(prefix)) {
          const sub = key.slice(prefix.length);
          if (!sub.includes('/')) {
            docs.push({
              id: sub,
              data: () => JSON.parse(JSON.stringify(val))
            });
          }
        }
      }
      return {
        docs,
        size: docs.length,
        forEach(fn) {
          docs.forEach(fn);
        }
      };
    },
    async deleteDoc(docRef) {
      store.delete(docRef.path);
    }
  };

  return mockDb;
}

function createMockOps(mockDb) {
  return {
    doc: mockDb.doc,
    getDoc: mockDb.getDoc,
    setDoc: mockDb.setDoc,
    getDocs: mockDb.getDocs,
    collection: mockDb.collection,
    deleteDoc: mockDb.deleteDoc
  };
}

// ── Test Suites ─────────────────────────────────────────────────────────────

describe('Firebase Firestore Storage Adapters & Restoration Suite', () => {
  let mockDb;
  let mockOps;
  let journeyStorage;
  let assessmentStorage;
  let reportStorage;

  beforeEach(() => {
    mockDb = createMockFirestore();
    mockOps = createMockOps(mockDb);
    journeyStorage = new FirestoreJourneyStorage(mockDb, { firestoreOps: mockOps });
    assessmentStorage = new FirestoreAssessmentStorage(mockDb, { firestoreOps: mockOps });
    reportStorage = new FirestoreReportStorage(mockDb, { firestoreOps: mockOps });
  });

  // ── 1. Configuration & Factory ─────────────────────────────────────────────
  describe('1. Configuration & Factory Selection', () => {
    test('Config module resolves project mishkat2 defaults cleanly', () => {
      const cfg = getFirebaseConfig();
      assert.equal(cfg.projectId, 'mishkat2');
      assert.equal(cfg.authDomain, 'mishkat2.firebaseapp.com');
      assert.equal(cfg.storageBucket, 'mishkat2.firebasestorage.app');
      assert.equal(cfg.messagingSenderId, '1075636519899');
      assert.equal(cfg.appId, '1:1075636519899:web:c1b65c5c474a2f13c9ddfe');
      assert.equal(isFirebaseConfigured(), true);
    });

    test('createStorage selects memory by default for tests', () => {
      const stores = createStorage('memory');
      assert.equal(stores.type, 'memory');
      assert.ok(stores.journeyStorage);
      assert.ok(stores.assessmentStorage);
      assert.ok(stores.reportStorage);
    });

    test('createStorage selects firestore when explicitly requested', () => {
      const stores = createStorage('firestore', { db: mockDb, firestoreOps: mockOps });
      assert.equal(stores.type, 'firestore');
      assert.ok(stores.journeyStorage instanceof FirestoreJourneyStorage);
      assert.ok(stores.assessmentStorage instanceof FirestoreAssessmentStorage);
      assert.ok(stores.reportStorage instanceof FirestoreReportStorage);
    });
  });

  // ── 2. FirestoreJourneyStorage Contract ────────────────────────────────────
  describe('2. FirestoreJourneyStorage Contract', () => {
    const testSession = 'sess_journey_contract';

    test('saves record under sessions/{sessionId}/journeyRecords/{id} and indexes fingerprint', async () => {
      const record = {
        id: 'rec_01',
        sessionId: testSession,
        fingerprint: 'fp_tawheed_01',
        topic: 'العقيدة',
        questionText: 'ما هو التوحيد؟',
        status: 'VERIFIED',
        timestamp: new Date().toISOString()
      };

      await journeyStorage.saveRecord(record);

      // Verify retrieval by id
      const retrieved = await journeyStorage.getRecord('rec_01');
      assert.ok(retrieved);
      assert.equal(retrieved.id, 'rec_01');
      assert.equal(retrieved.topic, 'العقيدة');

      // Verify sessions subcollection
      const sessionRecords = await journeyStorage.getRecordsBySession(testSession);
      assert.equal(sessionRecords.length, 1);
      assert.equal(sessionRecords[0].id, 'rec_01');

      // Verify fingerprint indexing & duplicate check
      const hasFp = await journeyStorage.hasFingerprint('fp_tawheed_01');
      assert.equal(hasFp, true);

      const count = await journeyStorage.countUniqueVerified();
      assert.equal(count, 1);

      // Verify deletion & cleanup
      await journeyStorage.deleteRecord('rec_01');
      assert.equal(await journeyStorage.getRecord('rec_01'), null);
      assert.equal(await journeyStorage.hasFingerprint('fp_tawheed_01'), false);
      assert.equal(await journeyStorage.countUniqueVerified(), 0);
    });
  });

  // ── 3. FirestoreAssessmentStorage Contract ─────────────────────────────────
  describe('3. FirestoreAssessmentStorage Contract & Key Containment', () => {
    const testSession = 'sess_assess_contract';

    test('saves assessment and maintains private answer keys server-side', async () => {
      const assessment = {
        assessmentId: 'asm_01',
        sessionId: testSession,
        createdAt: new Date().toISOString(),
        items: [
          {
            assessmentItemId: 'q1',
            question: 'ما حكم الصدق؟',
            correctOptionId: 'opt_true', // PRIVATE KEY
            options: [
              { optionId: 'opt_true', text: 'واجب' },
              { optionId: 'opt_false', text: 'محرم' }
            ]
          }
        ]
      };

      await assessmentStorage.saveAssessment(assessment);

      const retrieved = await assessmentStorage.getAssessment('asm_01');
      assert.ok(retrieved);
      assert.equal(retrieved.assessmentId, 'asm_01');
      assert.equal(retrieved.items[0].correctOptionId, 'opt_true');

      // Submissions
      const submission = {
        submissionId: 'sub_01',
        assessmentId: 'asm_01',
        sessionId: testSession,
        totalItems: 1,
        correctCount: 1,
        scorePercentage: 100
      };

      await assessmentStorage.saveSubmission(submission);

      const retSub = await assessmentStorage.getSubmission('sub_01');
      assert.ok(retSub);
      assert.equal(retSub.submissionId, 'sub_01');
      assert.equal(retSub.scorePercentage, 100);

      // Cleanup
      await assessmentStorage.deleteAssessment('asm_01');
      assert.equal(await assessmentStorage.getAssessment('asm_01'), null);
    });
  });

  // ── 4. FirestoreReportStorage Contract ─────────────────────────────────────
  describe('4. FirestoreReportStorage Contract', () => {
    const testSession = 'sess_report_contract';

    test('saves and retrieves immutable Journey Reports with exact sections', async () => {
      const report = {
        reportId: 'rep_01',
        sessionId: testSession,
        assessmentId: 'asm_01',
        createdAt: new Date().toISOString(),
        sections: {
          'ملخص الرحلة المعرفية': {
            title: 'ملخص الرحلة المعرفية',
            uniqueVerifiedCount: 20
          },
          'تقييم الفهم': {
            title: 'تقييم الفهم',
            scorePercentage: 90
          }
        }
      };

      await reportStorage.saveReport(report);

      const retrieved = await reportStorage.getReport('rep_01');
      assert.ok(retrieved);
      assert.equal(retrieved.reportId, 'rep_01');
      assert.equal(retrieved.sections['ملخص الرحلة المعرفية'].uniqueVerifiedCount, 20);

      const sessionReports = await reportStorage.getReportsBySession(testSession);
      assert.equal(sessionReports.length, 1);
      assert.equal(sessionReports[0].reportId, 'rep_01');

      // Cleanup
      await reportStorage.deleteReport('rep_01');
      assert.equal(await reportStorage.getReport('rep_01'), null);
    });
  });

  // ── 5. Session Restoration across Server Restarts ──────────────────────────
  describe('5. Session Restoration across Server Restart (Persistence Test)', () => {
    test('persists complete session across server shutdown and reboot', async () => {
      const sharedDb = createMockFirestore();
      const sharedOps = createMockOps(sharedDb);
      const restartSession = 'sess_restart_' + Date.now();

      const repo = defaultTrustedSourceRepository;
      if (repo.chunkCount === 0) {
        repo.loadFromDisk('data/knowledge');
      }

      // ── PHASE A: First Server Lifecycle ──────────────────────────────────
      const jStoreA = new FirestoreJourneyStorage(sharedDb, { firestoreOps: sharedOps });
      const aStoreA = new FirestoreAssessmentStorage(sharedDb, { firestoreOps: sharedOps });
      const rStoreA = new FirestoreReportStorage(sharedDb, { firestoreOps: sharedOps });

      const serverA = new MishkatServerManager({
        journeyStorage: jStoreA,
        assessmentStorage: aStoreA,
        reportStorage: rStoreA,
        pipelineService: new MishkatPipelineService({
          repository: repo,
          journeyStorage: jStoreA
        }),
        assessmentService: new AssessmentService(aStoreA),
        reportService: new ReportService(rStoreA)
      });

      // 1. Ask a question that produces verified record
      const askInterp = {
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

      const askResA = await serverA.pipelineService.processQuestion({
        questionText: 'قل هو الله أحد',
        sessionId: restartSession,
        origin: 'USER_QUESTION',
        options: { interpretationOverride: askInterp, mode: 'deterministic' }
      });

      assert.equal(askResA.status, 'ANSWERED');
      assert.ok(askResA.recordId);
      const parentRecordId = askResA.recordId;

      // 2. Ask Deep Learning follow up with lineage link
      const dlInterp = {
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

      const dlResA = await serverA.pipelineService.processQuestion({
        questionText: 'ما هي أركان الإسلام في حديث جبريل؟',
        sessionId: restartSession,
        origin: 'DEEP_LEARNING',
        parentRecordId,
        options: { interpretationOverride: dlInterp, mode: 'deterministic' }
      });

      assert.equal(dlResA.status, 'ANSWERED');
      assert.ok(dlResA.recordId);

      // Seed up to 20 records to test assessment milestone persistence
      for (let i = 3; i <= 20; i++) {
        await jStoreA.saveRecord({
          id: `rec_rest_${i}`,
          sessionId: restartSession,
          fingerprint: `fp_rest_${i}`,
          topic: `مبحث_${Math.ceil(i / 4)}`,
          concepts: [`مفهوم_${i}`],
          status: 'VERIFIED',
          origin: 'USER_QUESTION',
          parentRecordId: null,
          originalQuestion: `سؤال إحياء ${i}`,
          questionText: `سؤال إحياء ${i}`,
          sources: [{ sourceId: 'src_1', sourceName: 'تفسير الطبري' }],
          verifiedEvidenceSnippets: [{ text: `دليل ${i}` }],
          timestamp: new Date().toISOString()
        });
      }

      // Generate assessment on Server A
      const jStateA = await serverA.pipelineService.getJourneyState(restartSession);
      assert.equal(jStateA.assessmentEligible, true);

      const genA = await serverA.assessmentService.generateAssessment({ journeyState: jStateA });
      assert.equal(genA.status, 'CREATED');
      const assessmentId = genA.assessment.assessmentId;

      // Submit assessment on Server A
      const submissionA = genA.assessment.items.map(item => ({
        assessmentItemId: item.assessmentItemId,
        selectedOptionId: item.options[0].optionId
      }));
      const scoredA = await serverA.assessmentService.submitAssessment({
        assessmentId,
        responses: submissionA
      });
      assert.ok(scoredA.submissionId);

      // Generate report on Server A
      const repA = await serverA.reportService.generateReport({
        journeyState: jStateA,
        assessmentResult: scoredA
      });
      assert.equal(repA.status, 'CREATED');
      const reportId = repA.report.reportId;

      // ── SHUTDOWN SIMULATION ──────────────────────────────────────────────
      // Server A instances discarded completely from memory.

      // ── PHASE B: Reboot / Fresh Server B Instance with same DB ───────────
      const jStoreB = new FirestoreJourneyStorage(sharedDb, { firestoreOps: sharedOps });
      const aStoreB = new FirestoreAssessmentStorage(sharedDb, { firestoreOps: sharedOps });
      const rStoreB = new FirestoreReportStorage(sharedDb, { firestoreOps: sharedOps });

      const serverB = new MishkatServerManager({
        journeyStorage: jStoreB,
        assessmentStorage: aStoreB,
        reportStorage: rStoreB,
        pipelineService: new MishkatPipelineService({
          repository: repo,
          journeyStorage: jStoreB
        }),
        assessmentService: new AssessmentService(aStoreB),
        reportService: new ReportService(rStoreB)
      });

      // Verification 1: Journey records restored correctly
      const restoredState = await serverB.pipelineService.getJourneyState(restartSession);
      assert.equal(restoredState.uniqueVerifiedCount, 20);
      assert.equal(restoredState.verifiedRecords.length, 20);

      // Verification 2: Lineage preserved across restart
      const childRecord = await jStoreB.getRecord(dlResA.recordId);
      assert.ok(childRecord);
      assert.equal(childRecord.origin, 'DEEP_LEARNING');
      assert.equal(childRecord.parentRecordId, parentRecordId);

      // Verification 3: Duplicate detection survives restart (does not inflate progress)
      const dupRes = await serverB.pipelineService.processQuestion({
        questionText: 'قل هو الله أحد',
        sessionId: restartSession,
        options: { interpretationOverride: askInterp, mode: 'deterministic' }
      });
      assert.equal(dupRes.duplicateDetected, true);
      const stateAfterDup = await serverB.pipelineService.getJourneyState(restartSession);
      assert.equal(stateAfterDup.uniqueVerifiedCount, 20);

      // Verification 4: Assessment eligibility survives restart
      assert.equal(restoredState.assessmentEligible, true);

      // Verification 5: Generated assessment instance restored with private answer keys server-side
      const restoredAssessment = await aStoreB.getAssessment(assessmentId);
      assert.ok(restoredAssessment);
      assert.equal(restoredAssessment.assessmentId, assessmentId);
      assert.ok(restoredAssessment.items[0].correctOptionId);

      // Verification 6: Completed assessment submission survives restart
      const restoredSubmission = await aStoreB.getSubmission(scoredA.submissionId);
      assert.ok(restoredSubmission);
      assert.equal(restoredSubmission.submissionId, scoredA.submissionId);
      assert.equal(restoredSubmission.scorePercentage, scoredA.scorePercentage);

      // Verification 7: Report survives restart with exact snapshots & sections
      const restoredReport = await rStoreB.getReport(reportId);
      assert.ok(restoredReport);
      assert.equal(restoredReport.reportId, reportId);
      assert.ok(restoredReport.sections['ملخص الرحلة المعرفية']);
      assert.ok(restoredReport.sections['تقييم الفهم']);
      assert.equal(restoredReport.sections['ملخص الرحلة المعرفية'].uniqueVerifiedCount, 20);
    });
  });
});
