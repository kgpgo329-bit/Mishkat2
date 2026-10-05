/**
 * Mishkat Phase 2 — Question Understanding & Claim Planning Test Suite
 * 
 * Executes comprehensive multi-dimensional evaluations across:
 * 1. Task Classification Accuracy across 14 Task Families
 * 2. Clarification Detection Accuracy (Ambiguous anaphora vs grounded questions)
 * 3. Personal Fatwa Detection Precision & Recall
 * 4. Claim Planning Quality (non-empty, captures task intent, structured types)
 * 5. Paraphrase Robustness Suite (Dialectal and phrasing variations)
 * 6. Detailed Confusion Matrix
 */

import fs from 'fs';
import path from 'path';
import { processQuestionInterpretation, TASK_FAMILIES } from '../src/mishkat/question/questionInterpreter.js';

// Load dataset
const datasetPath = path.resolve('tests/datasets/question-understanding-development.json');
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

console.log('═'.repeat(75));
console.log('      اختبارات المرحلة الثانية: فهم السؤال وتخطيط الدعاوى');
console.log('      MISHKAT PHASE 2: QUESTION UNDERSTANDING & CLAIM PLANNING');
console.log('═'.repeat(75));
console.log(`إجمالي عدد أسئلة التطوير في المجموعة: ${dataset.length} سؤالاً\n`);

// 1. Task Classification & Detection Metrics
let correctTaskCount = 0;
let clarificationExpectedCount = 0;
let clarificationCorrectCount = 0;
let fatwaExpectedCount = 0;
let fatwaCorrectCount = 0;
let highQualityClaimsCount = 0;

// Confusion Matrix tracking: matrix[expected][predicted]
const taskList = Object.values(TASK_FAMILIES);
const confusionMatrix = {};
taskList.forEach(t1 => {
  confusionMatrix[t1] = {};
  taskList.forEach(t2 => {
    confusionMatrix[t1][t2] = 0;
  });
});

const discrepancies = [];

dataset.forEach((item, index) => {
  const result = processQuestionInterpretation(item.question);
  const expectedTask = item.expectedTaskFamily;
  const predictedTask = result.task;

  // Track confusion matrix
  if (confusionMatrix[expectedTask] && confusionMatrix[expectedTask][predictedTask] !== undefined) {
    confusionMatrix[expectedTask][predictedTask]++;
  }

  // Check task accuracy
  const taskMatched = expectedTask === predictedTask;
  if (taskMatched) {
    correctTaskCount++;
  } else {
    discrepancies.push({
      index: index + 1,
      question: item.question,
      expected: expectedTask,
      predicted: predictedTask,
      notes: item.notes,
      clarificationReason: result.clarificationReason
    });
  }

  // Check Clarification Detection (if notes or expected behavior indicates need for clarification)
  const shouldNeedClarification =
    item.notes?.includes('استيضاح') ||
    item.notes?.includes('مبهم') ||
    item.notes?.includes('مجردتان') ||
    item.expectedBehavior?.includes('طلب استيضاح') ||
    item.expectedBehavior?.includes('طلب توضيح');

  if (shouldNeedClarification) {
    clarificationExpectedCount++;
    if (result.needsClarification) {
      clarificationCorrectCount++;
    }
  }

  // Check Personal Fatwa Detection
  if (expectedTask === 'PERSONAL_FATWA') {
    fatwaExpectedCount++;
    if (result.isPersonalFatwa && result.task === 'PERSONAL_FATWA') {
      fatwaCorrectCount++;
    }
  }

  // Check Claim Planning Quality:
  // Must have at least 1 claim, not just a single word topic, importance defined, requiredEvidenceType defined
  const claims = result.claimsToResolve;
  const hasValidClaims = claims && claims.length > 0 && claims.every(c =>
    c.statement &&
    c.statement.split(' ').length >= 3 &&
    c.importance &&
    c.requiredEvidenceType
  );

  if (hasValidClaims) {
    highQualityClaimsCount++;
  }
});

// 2. Paraphrase Robustness Suite
const paraphrasePairs = [
  {
    original: "ما حكم صلاة الوتر وما الدليل عليها؟",
    paraphrase: "هل صلاة الوتر واجبة أم سنة وما مستند ذلك؟",
    expectedTask: "GENERAL"
  },
  {
    original: "لماذا حرم الإسلام الكذب في جميع الأحوال؟",
    paraphrase: "ليش حرم الله الكذب وما الحكمة من منعه؟",
    expectedTask: "WHY"
  },
  {
    original: "ما الفرق بين الإسلام والإيمان في حديث جبريل؟",
    paraphrase: "وش الفرق بين مفهومي الإسلام والإيمان؟",
    expectedTask: "COMPARE"
  },
  {
    original: "وش معنى التقوى بالإنجليزي وكيف نترجمها صح؟",
    paraphrase: "كيف أترجم مصطلح التقوى إلى اللغة الإنجليزية؟",
    expectedTask: "TRANSLATE_CONCEPT"
  },
  {
    original: "لماذا يعبد المسلمون الكعبة المشرفة في مكة؟",
    paraphrase: "هل يسجد المسلمون للكعبة عبادة لها ولماذا يتوجهون إليها؟",
    expectedTask: "MISCONCEPTION"
  },
  {
    original: "هل القرآن من تأليف محمد ﷺ اقتبسه من الرهبان؟",
    paraphrase: "هل ألف النبي محمد القرآن الكريم بنفسه؟",
    expectedTask: "MISCONCEPTION"
  },
  {
    original: "أنا طلقت زوجتي طلقة وأنا غضبان جداً في البيت، هل يقع طلاقي؟",
    paraphrase: "حلفت على زوجتي بالطلاق وأنا معصب فهل طلاقي واقع؟",
    expectedTask: "PERSONAL_FATWA"
  },
  {
    original: "أعطني حديثاً يثبت هذا الكلام",
    paraphrase: "أبي حديث يثبت هذا القول",
    expectedTask: "VERIFY_HADITH"
  },
  {
    original: "هل انتشر الإسلام بالسيف والقوة كما يزعم البعض؟",
    paraphrase: "هل دخلت الشعوب في الإسلام بحد السيف تاريخياً؟",
    expectedTask: "HISTORICAL_CLAIM"
  },
  {
    original: "هل أجمع العلماء على وجوب الصلوات الخمس؟",
    paraphrase: "هل هناك إجماع بين فقهاء الأمة على فرضية الصلوات الخمس؟",
    expectedTask: "VERIFY_CONSENSUS"
  }
];

let robustCount = 0;
const paraphraseResults = [];

paraphrasePairs.forEach((pair, idx) => {
  const res1 = processQuestionInterpretation(pair.original);
  const res2 = processQuestionInterpretation(pair.paraphrase);

  const matched = res1.task === res2.task && res1.isPersonalFatwa === res2.isPersonalFatwa && res1.needsClarification === res2.needsClarification;
  if (matched) robustCount++;

  paraphraseResults.push({
    pairIndex: idx + 1,
    pair: [pair.original, pair.paraphrase],
    task1: res1.task,
    task2: res2.task,
    matched
  });
});

// Calculate percentages
const taskAccuracy = ((correctTaskCount / dataset.length) * 100).toFixed(2);
const clarificationAccuracy = clarificationExpectedCount > 0 ? ((clarificationCorrectCount / clarificationExpectedCount) * 100).toFixed(2) : 100;
const fatwaAccuracy = fatwaExpectedCount > 0 ? ((fatwaCorrectCount / fatwaExpectedCount) * 100).toFixed(2) : 100;
const claimQualityRate = ((highQualityClaimsCount / dataset.length) * 100).toFixed(2);
const paraphraseRobustness = ((robustCount / paraphrasePairs.length) * 100).toFixed(2);

// Output Results
console.log('───────────────────────────────────────────────────────────────────────────');
console.log('                   نتائج التدقيق والتقييم (EVALUATION METRICS)');
console.log('───────────────────────────────────────────────────────────────────────────');
console.log(`• دقة تصنيف المهام (Task Classification Accuracy):   ${taskAccuracy}% (${correctTaskCount}/${dataset.length})`);
console.log(`• دقة رصد الأسئلة المبهمة (Clarification Accuracy):  ${clarificationAccuracy}% (${clarificationCorrectCount}/${clarificationExpectedCount})`);
console.log(`• دقة رصد الفتاوى الشخصية (Personal Fatwa Accuracy): ${fatwaAccuracy}% (${fatwaCorrectCount}/${fatwaExpectedCount})`);
console.log(`• جودة تخطيط الدعاوى (Claim Planning Quality):        ${claimQualityRate}% (${highQualityClaimsCount}/${dataset.length})`);
console.log(`• متانة المعالجة أمام إعادة الصياغة (Robustness):    ${paraphraseRobustness}% (${robustCount}/${paraphrasePairs.length})`);
console.log('───────────────────────────────────────────────────────────────────────────\n');

// Print Confusion Matrix for Active Tasks
console.log('مصفوفة الارتباك (Confusion Matrix):');
console.log('الصفوف = المتوقع (Expected) | الأعمدة = المتنبأ به (Predicted)\n');

// Filter tasks that have at least 1 expected in dataset
const activeTasks = taskList.filter(t => {
  return dataset.some(d => d.expectedTaskFamily === t);
});

// Header
const colHeader = activeTasks.map(t => t.slice(0, 7).padEnd(8)).join(' ');
console.log('EXPECTED \\ PREDICTED | ' + colHeader);
console.log('-'.repeat(22 + colHeader.length));

activeTasks.forEach(expected => {
  const rowVals = activeTasks.map(predicted => {
    const val = confusionMatrix[expected][predicted];
    return String(val).padEnd(8);
  }).join(' ');
  console.log(expected.padEnd(20) + ' | ' + rowVals);
});

console.log('\n───────────────────────────────────────────────────────────────────────────');

if (discrepancies.length > 0) {
  console.log(`\nالحالات التي اختلفت عن التصنيف المتوقع (${discrepancies.length} حالات):`);
  discrepancies.forEach((d, i) => {
    console.log(`  [${i + 1}] سؤال: «${d.question}»`);
    console.log(`      المتوقع: ${d.expected}  <--->  الناتج الفعلي: ${d.predicted}`);
    console.log(`      ملاحظات: ${d.notes || 'لا توجد'}`);
  });
} else {
  console.log('\nلا توجد أي تناقضات في تصنيف مهام الأسئلة.');
}

console.log('\n═══════════════════════════════════════════════════════════════════════════');
