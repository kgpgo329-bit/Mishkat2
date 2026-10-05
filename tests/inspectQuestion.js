/**
 * Mishkat Question Understanding — Manual Inspection CLI Tool
 * 
 * Allows developers and researchers to inspect question interpretation and claim planning
 * without triggering any retrieval, RAG, or answer generation.
 * 
 * Usage:
 *   node tests/inspectQuestion.js "لماذا يعبد المسلمون الكعبة؟"
 *   node tests/inspectQuestion.js "أعطني حديثاً يثبت هذا الكلام"
 *   node tests/inspectQuestion.js
 */

import { processQuestionInterpretation } from '../src/mishkat/question/questionInterpreter.js';
import readline from 'readline';

function formatInspectionOutput(interpretation) {
  const line = '═'.repeat(70);
  const subLine = '─'.repeat(70);

  return `
${line}
                   فحص وفهم السؤال | MISHKAT QUESTION INSPECTOR
${line}
Original Question:    ${interpretation.originalQuestion}
Normalized:           ${interpretation.normalizedQuestion}
Task:                 ${interpretation.task}
Topic:                ${interpretation.topic}
Subtopics:            ${interpretation.subtopics.join(', ') || 'لا توجد'}
User Goal:            ${interpretation.userGoal}

Personal Fatwa?       ${interpretation.isPersonalFatwa ? '⚠️ نعم (استفتاء شخصي - يتطلب إحالة)' : 'لا (معرفة إسلامية عامة)'}
Needs Clarification?  ${interpretation.needsClarification ? `⚠️ نعم (${interpretation.clarificationReason})` : 'لا'}
Confidence:           ${(interpretation.confidence * 100).toFixed(0)}%

Requested Evidence:
${interpretation.requestedEvidence.map(e => `  • ${e}`).join('\n')}

Claims To Resolve (${interpretation.claimsToResolve.length} Claims):
${interpretation.claimsToResolve.map((c, i) => `  [${i + 1}] (${c.importance}) ${c.statement}\n      Type: ${c.requiredEvidenceType}`).join('\n')}
${subLine}
* تنبيه منهجي: لا يتم استرجاع أي مصادر أو توليد أي إجابة في هذه المرحلة.
${line}
`;
}

// Check command-line arguments
const cliArgs = process.argv.slice(2).join(' ').trim();

if (cliArgs) {
  const result = processQuestionInterpretation(cliArgs);
  console.log(formatInspectionOutput(result));
  process.exit(0);
} else {
  // Interactive mode
  console.log('\n--- أداة الفحص اليدوي لفهم السؤال في مشكاة ---');
  console.log('اكتب أي سؤال واضغط Enter (أو اكتب exit للخروج):\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const promptUser = () => {
    rl.question('السؤال > ', (input) => {
      const q = input.trim();
      if (!q || q.toLowerCase() === 'exit') {
        rl.close();
        return;
      }
      const res = processQuestionInterpretation(q);
      console.log(formatInspectionOutput(res));
      promptUser();
    });
  };

  promptUser();
}
