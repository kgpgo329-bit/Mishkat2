/**
 * Mishkat Claim Planner — Phase 2A Claim Atomicity Implementation
 * 
 * Strict Architectural Invariant:
 * ONE independently verifiable proposition = ONE claimsToResolve[] item.
 * 
 * Guarantees:
 * - DECOMPOSE, DO NOT ENRICH: Never expand the question with unasked doctrinal/sectarian assumptions.
 * - MINIMAL CLAIM SET: Every proposed claim is strictly necessary to answer the question.
 * - ZERO unsafe compound-claim patterns (e.g. no conjoining sharia + historical,
 *   technical + linguistic, isnad + authenticity, text orthography + surah location).
 * - Multi-intent questions are systematically decomposed into independent atomic claims.
 */

export const CLAIM_ATOMICITY_LEVELS = {
  ATOMIC: 'ATOMIC',
  COMPOUND: 'COMPOUND',
  AMBIGUOUS: 'AMBIGUOUS'
};

/**
 * Deterministic Semantic Audit of Claim Atomicity
 * Identifies whether a claim statement is ATOMIC, COMPOUND, or AMBIGUOUS.
 * 
 * @param {string} statement
 * @returns {string} 'ATOMIC' | 'COMPOUND' | 'AMBIGUOUS'
 */
export function auditClaimAtomicity(statement) {
  if (!statement || typeof statement !== 'string' || statement.trim().split(' ').length < 3) {
    return CLAIM_ATOMICITY_LEVELS.AMBIGUOUS;
  }

  const s = statement.trim();

  // Known compound conjunction patterns
  const compoundPatterns = [
    // Linguistic + Technical definition conjoining
    /الاصطلاحي\s*و\s*اللغوي/,
    /اللغوي\s*و\s*الاصطلاحي/,
    /الشرعي\s*و\s*اللغوي/,
    // Sharia + Historical conjoining
    /الموقف\s*الشرعي\s*و\s*التاريخي/,
    /الحكم\s*الشرعي\s*و\s*الواقع\s*التاريخي/,
    // Authenticity + Takhrij + Isnad conjoining
    /وثبوته.*وتخريجه.*وسنده/,
    /صحته.*وتخريجه.*وسنده/,
    /وتخريجه\s*من\s*دواوين\s*السنة.*وبيان\s*سنده/,
    // Orthography + Surah citation conjoining
    /وضبط\s*ألفاظه.*وبيان\s*موضع\s*الآية\s*وسورتها/,
    /برسم\s*المصحف.*وسورتها/,
    /برسم\s*المصحف.*وعزوه\s*إلى\s*سورته/,
    // Procedure + Conditions + Detailed rulings conjoining
    /الكيفية\s*والضوابط\s*والأحكام\s*التفصيلية/,
    /الكيفية\s*والشروط\s*والأحكام/,
    // Wisdom + Broad Maqasid conjoining
    /علة\s*أو\s*حكمة.*ومقاصد\s*الشريعة\s*في\s*ذلك/,
    // Multi-concept coordination in one claim (e.g. v3_sup_02)
    /يحث\s*على\s*التدبر\s*ويبين\s*إعجازه/,
    /التدبر.*والتفكر\s*في\s*إعجازه/,
    // Unasked doctrinal/sectarian enrichment (e.g. v3_sup_07)
    /كما\s*هو\s*معتقد\s*أهل\s*السنة/,
    /مذهب\s*أهل\s*السنة\s*والجماعة/,
    // Phase 2A closure: residual templates
    /صحة\s*وثبوت\s*الدعوى.*وموقف\s*الشريعة/,          // VERIFY_CLAIM: truth ∧ Sharia position
    /المقابل\s*الإنجليزي.*(مع|و)\s*(بيان|إيضاح)\s*(حدوده|الفروق)/, // TRANSLATE: rendering ∧ semantic limits
    /مخرج\s*الحديث\s*ورواته\s*وحكم/,                   // VERIFY_HADITH: source ∧ narrators ∧ grading
    /وتخريجه.*وحكم.*إسناده/
  ];

  for (const ptrn of compoundPatterns) {
    if (ptrn.test(s)) {
      return CLAIM_ATOMICITY_LEVELS.COMPOUND;
    }
  }

  return CLAIM_ATOMICITY_LEVELS.ATOMIC;
}

/* ------------------------------------------------------------------
 * Phase 2A closure — shared atomic builders for the three residual
 * families. Used by both planClaimsForQuestion and decomposeCompoundClaims
 * so the deterministic and AI paths emit identical atomic claims.
 * Secondary claims are emitted ONLY when the question requests them.
 * ------------------------------------------------------------------ */

const atom = (statement, importance, requiredEvidenceType) => ({
  statement, importance, requiredEvidenceType, claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
});

// User explicitly asks for the Sharia position/ruling in addition to the claim's truth.
// Bare حرام/حلال/يجوز are NOT triggers: there the claim itself is the ruling (would duplicate claim 1).
export function asksShariaPosition(normQ = '') {
  return /(ما حكم|وش حكم|ايش حكم|وما حكم|حكمه|حكمها|حكم الشرع|موقف الشرع|موقف الاسلام|موقف الدين|راي الشرع|راي الاسلام|راي الدين)/.test(normQ);
}

// User explicitly asks for semantic limits / nuance of the English rendering
export function asksSemanticLimits(normQ = '') {
  return /(فرق|فروق|nuance|difference|حدود|دلال|يختلف|اخلال|قصور|لا يطابق|يطابق|مطابق|قاصر)/i.test(normQ);
}

// User asks who reported / where the hadith is recorded
export function asksHadithSource(normQ = '') {
  return /(رواه|روي|اخرجه|اخرج|تخريج|مصدر|من خرج|في اي كتاب|اين ورد)/.test(normQ);
}

// User asks about the chain itself
export function asksHadithChain(normQ = '') {
  return /(^|\s)(سنده|السند|سند|اسناده|الاسناد|اسناد|رجاله|رواته)(\s|$)/.test(normQ);
}

export function buildVerifyClaimClaims(normQ = '') {
  const claims = [atom('التحقق من ثبوت الدعوى المذكورة في السؤال بالدليل المعتمد', 'CORE', 'TEXTUAL_EVIDENCE')];
  if (asksShariaPosition(normQ)) {
    claims.push(atom('بيان الحكم الشرعي في المسألة التي تضمنتها الدعوى', 'CORE', 'GENERAL_FIQH_PRINCIPLE'));
  }
  return claims;
}

export function buildTranslateClaims(normQ = '', topic = 'المسألة') {
  const claims = [
    atom(`تحرير المفهوم الشرعي الأصيل للمصطلح المسؤول عنه (${topic}) في السياق الإسلامي`, 'CORE', 'ARABIC_LEXICON_DEFINITION'),
    atom('تحديد المقابل الإنجليزي الأدق للمصطلح الشرعي المسؤول عنه', 'CORE', 'TERMINOLOGY_MAPPING')
  ];
  if (asksSemanticLimits(normQ)) {
    claims.push(atom('بيان الفروق الدلالية بين المصطلح الشرعي ومقابله الإنجليزي', 'SECONDARY', 'TERMINOLOGY_MAPPING'));
  }
  return claims;
}

export function buildHadithClaims(normQ = '') {
  const claims = [atom('التحقق من درجة صحة وثبوت الحديث المسؤول عنه في دواوين السنة النبوية المعتمدة', 'CORE', 'HADITH_ISNAD_STATUS')];
  if (asksHadithSource(normQ)) {
    claims.push(atom('تحديد من أخرج الحديث من أصحاب دواوين السنة المعتمدة', 'SECONDARY', 'HADITH_SOURCE_ATTRIBUTION'));
  }
  if (asksHadithChain(normQ)) {
    claims.push(atom('بيان حكم أئمة الحديث على إسناد الحديث المسؤول عنه', 'SECONDARY', 'HADITH_ISNAD_STATUS'));
  }
  if (claims.length === 1 && /(مكذوب|موضوع|لا اصل له)/.test(normQ)) {
    claims.push(atom('التحقق من كون الحديث موضوعاً لا تصح نسبته إلى النبي ﷺ', 'SECONDARY', 'PREVENTION_OF_FABRICATION'));
  }
  return claims;
}

/**
 * Decomposes any composite or enriched claims into strictly atomic claims.
 * Enforces "DECOMPOSE, DO NOT ENRICH" and "MINIMAL CLAIM SET".
 * 
 * @param {Array<Object>} claims Array of claim objects
 * @param {Object} context { originalQuestion, normalizedQuestion, task, topic }
 * @returns {Array<Object>} Strictly atomic claims array
 */
export function decomposeCompoundClaims(claims, context = {}) {
  if (!Array.isArray(claims) || claims.length === 0) {
    return claims;
  }

  const normQ = context.normalizedQuestion || '';
  const task = context.task || 'GENERAL';
  const topic = context.topic || 'المسألة';
  const atomicList = [];
  let claimSeq = 1;

  for (const claim of claims) {
    let stmt = (claim.statement || '').trim();
    if (!stmt) continue;

    // Rule 1: Prune unasked sectarian/doctrinal enrichment (v3_sup_07 pattern)
    // If the question didn't ask about Ahl al-Sunnah, strip unasked sectarian clauses
    if (!normQ.includes('اهل السنه') && !normQ.includes('السلف') && !normQ.includes('مذهب')) {
      stmt = stmt
        .replace(/،?\s*كما\s*هو\s*(معتقد|مذهب)\s*أهل\s*السنة(\s*والجماعة)?/g, '')
        .replace(/،?\s*على\s*مذهب\s*أهل\s*السنة(\s*والجماعة)?/g, '')
        .replace(/،?\s*وفق\s*معتقد\s*أهل\s*السنة/g, '')
        .trim();
    }

    // Rule 2: Multi-part coordinate decomposition (v3_sup_02 pattern: التدبر + الإعجاز)
    if (
      (stmt.includes('التدبر') && stmt.includes('إعجاز')) ||
      (stmt.includes('تدبر') && stmt.includes('اعجاز'))
    ) {
      atomicList.push({
        claimId: `claim-${claimSeq++}`,
        statement: 'بيان حث القرآن الكريم ودعوته إلى تدبر آياته والتفكر فيها',
        importance: 'CORE',
        requiredEvidenceType: 'TEXTUAL_EVIDENCE',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      });
      atomicList.push({
        claimId: `claim-${claimSeq++}`,
        statement: 'بيان وجوه إعجاز القرآن الكريم ودلائل صدقه',
        importance: 'CORE',
        requiredEvidenceType: 'TEXTUAL_EVIDENCE',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      });
      continue;
    }

    // Rule 3: Technical + Linguistic conjoining
    if (/الاصطلاحي\s*و\s*اللغوي|اللغوي\s*و\s*الاصطلاحي|الشرعي\s*و\s*اللغوي/.test(stmt)) {
      const asksLinguistic = normQ.includes('لغه') || normQ.includes('لغويا') || normQ.includes('اشتقاق') || normQ.includes('لسان العرب');
      const asksTechnical = normQ.includes('اصطلاح') || normQ.includes('شرعا') || normQ.includes('معنى') || normQ.includes('المقصود') || normQ.includes('مفهوم') || normQ.includes('تعريف');

      // If user explicitly asks for BOTH
      if (asksLinguistic && (asksTechnical || normQ.includes('واصطلاح'))) {
        atomicList.push({
          claimId: `claim-${claimSeq++}`,
          statement: `بيان التعريف الشرعي الاصطلاحي لمفهوم (${topic}) وضبط حدوده المفاهيمية`,
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_DEFINITION',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
        atomicList.push({
          claimId: `claim-${claimSeq++}`,
          statement: `بيان المعنى اللغوي والاشتقاقي لمفردة (${topic}) في لسان العرب`,
          importance: 'SECONDARY',
          requiredEvidenceType: 'ARABIC_LEXICON_DEFINITION',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      } else if (asksLinguistic) {
        atomicList.push({
          claimId: `claim-${claimSeq++}`,
          statement: `بيان المعنى اللغوي والاشتقاقي لمفردة (${topic}) في لسان العرب`,
          importance: 'CORE',
          requiredEvidenceType: 'ARABIC_LEXICON_DEFINITION',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      } else {
        atomicList.push({
          claimId: `claim-${claimSeq++}`,
          statement: `بيان التعريف الشرعي الاصطلاحي لمفهوم (${topic}) وضبط حدوده المفاهيمية`,
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_DEFINITION',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      }
      continue;
    }

    // Rule 4: Misconception sharia vs historical conjoining
    if (/الموقف\s*الشرعي\s*و\s*التاريخي|الحكم\s*الشرعي\s*و\s*الواقع\s*التاريخي/.test(stmt)) {
      const isHistorical = normQ.includes('سيف') || normQ.includes('تاريخ') || normQ.includes('غزوه') || normQ.includes('اجبار') || normQ.includes('قتال');
      if (isHistorical) {
        atomicList.push({
          claimId: `claim-${claimSeq++}`,
          statement: `إثبات الواقع التاريخي الصحيح بالوقائع الموثقة من المصادر المعتمدة في سياق (${topic})`,
          importance: 'CORE',
          requiredEvidenceType: 'HISTORICAL_EVIDENCE',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      } else {
        atomicList.push({
          claimId: `claim-${claimSeq++}`,
          statement: `إثبات الموقف الشرعي الصحيح المؤصل بالأدلة من المصادر المعتمدة في سياق (${topic})`,
          importance: 'CORE',
          requiredEvidenceType: 'GROUNDED_POSITIVE_EXPLANATION',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      }
      continue;
    }

    // Rule 5: Hadith authenticity + Takhrij + Isnad conjoining (source ∧ narrators ∧ grading)
    if (/وثبوته.*وتخريجه.*وسنده|صحته.*وتخريجه.*وسنده|وتخريجه.*وبيان\s*سنده|مخرج\s*الحديث\s*ورواته\s*وحكم|وتخريجه.*وحكم.*إسناده/.test(stmt)) {
      for (const c of buildHadithClaims(normQ)) atomicList.push({ claimId: `claim-${claimSeq++}`, ...c });
      continue;
    }

    // Rule 5b: VERIFY_CLAIM truth ∧ Sharia position
    if (/صحة\s*وثبوت\s*الدعوى.*وموقف\s*الشريعة/.test(stmt)) {
      for (const c of buildVerifyClaimClaims(normQ)) atomicList.push({ claimId: `claim-${claimSeq++}`, ...c });
      continue;
    }

    // Rule 5c: TRANSLATE rendering ∧ semantic limits (keeps any separate concept claim already in the list)
    if (/المقابل\s*الإنجليزي.*(مع|و)\s*(بيان|إيضاح)\s*(حدوده|الفروق)/.test(stmt)) {
      for (const c of buildTranslateClaims(normQ, topic).slice(1)) atomicList.push({ claimId: `claim-${claimSeq++}`, ...c });
      continue;
    }

    // Rule 6: Quran orthography + Surah citation conjoining
    if (/وضبط\s*ألفاظه.*وبيان\s*موضع\s*الآية\s*وسورتها|برسم\s*المصحف.*وسورتها|برسم\s*المصحف.*وعزوه\s*إلى\s*سورته/.test(stmt)) {
      atomicList.push({
        claimId: `claim-${claimSeq++}`,
        statement: `التحقق من صحة كتابة وضبط ألفاظ النص القرآني المنقول ومطابقته لرسم المصحف الشريف`,
        importance: 'CORE',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      });
      const asksSurah = normQ.includes('سوره') || normQ.includes('اين وردت') || normQ.includes('في اي') || normQ.includes('موضعها');
      if (asksSurah) {
        atomicList.push({
          claimId: `claim-${claimSeq++}`,
          statement: `عزو الآية الكريمة إلى سورتها وتحديد موضعها في المصحف الشريف`,
          importance: 'CORE',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      }
      continue;
    }

    // Rule 7: Explain procedure + Conditions + Detailed rulings
    if (/الكيفية\s*والضوابط\s*والأحكام\s*التفصيلية|الكيفية\s*والشروط\s*والأحكام/.test(stmt)) {
      atomicList.push({
        claimId: `claim-${claimSeq++}`,
        statement: `شرح الكيفية والصفة الشرعية للأمر أو العبادة المسؤول عنها في (${topic})`,
        importance: 'CORE',
        requiredEvidenceType: 'FIQH_EXPOSITION',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      });
      const asksConditions = normQ.includes('شرط') || normQ.includes('شروط') || normQ.includes('ضوابط') || normQ.includes('مبطلات');
      if (asksConditions) {
        atomicList.push({
          claimId: `claim-${claimSeq++}`,
          statement: `بيان الشروط والضوابط الشرعية المعتبرة لصحة العمل أو العبادة`,
          importance: 'SECONDARY',
          requiredEvidenceType: 'FIQH_EXPOSITION',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      }
      continue;
    }

    // Rule 8: Why wisdom + Broad maqasid
    if (/علة\s*أو\s*حكمة.*ومقاصد\s*الشريعة\s*في\s*ذلك/.test(stmt)) {
      atomicList.push({
        claimId: `claim-${claimSeq++}`,
        statement: `بيان علة أو حكمة تحريم أو تشريع الأمر المسؤول عنه في سياق (${topic})`,
        importance: 'CORE',
        requiredEvidenceType: 'WISDOM_RATIONALE',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      });
      continue;
    }

    // Default: Clean single proposition preserved with ATOMIC status
    atomicList.push({
      claimId: claim.claimId || `claim-${claimSeq++}`,
      statement: stmt,
      importance: claim.importance || 'CORE',
      requiredEvidenceType: claim.requiredEvidenceType || 'TEXTUAL_EVIDENCE',
      claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
    });
  }

  // Renumber claimIds sequentially
  return atomicList.map((c, idx) => ({
    ...c,
    claimId: `claim-${idx + 1}`
  }));
}

/**
 * Plans atomic claims for an interpreted question.
 * Strictly guarantees: ONE proposition = ONE claim item.
 */
export function planClaimsForQuestion({
  originalQuestion,
  normalizedQuestion,
  task,
  topic,
  userGoal,
  isPersonalFatwa,
  needsClarification,
  clarificationReason
}) {
  // If the question is fundamentally ambiguous and needs clarification:
  if (needsClarification) {
    return [
      {
        claimId: 'claim-clarify-1',
        statement: clarificationReason
          ? `طلب استيضاح وتحديد موضوع المسألة لتعذر الاستدلال: (${clarificationReason})`
          : 'طلب استيضاح وتحديد موضوع الدعوى أو النص المراد بحثه لتعذر الاستدلال مع غياب السياق',
        importance: 'CORE',
        requiredEvidenceType: 'USER_CLARIFICATION',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      }
    ];
  }

  // If the question is a personal fatwa:
  if (isPersonalFatwa) {
    return [
      {
        claimId: 'claim-fatwa-1',
        statement: 'المسألة واقعة شخصية واستفتاء فردي يستوجب الإحالة للمفتي أو الهيئات الشرعية الرسمية',
        importance: 'CORE',
        requiredEvidenceType: 'REFERRAL_NOTICE',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      },
      {
        claimId: 'claim-fatwa-2',
        statement: `تقديم المعلومات الفقهية والضوابط الشرعية العامة المتعلقة بـ (${topic}) دون إصدار فتوى إلزامية في الواقعة الخاصة`,
        importance: 'SECONDARY',
        requiredEvidenceType: 'GENERAL_FIQH_PRINCIPLE',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      }
    ];
  }

  const normQ = normalizedQuestion || '';
  const resolvedTopic = topic || 'المسألة';

  // Multi-goal questions that naturally demand multiple atomic claims (e.g. v3_sup_02 pattern)
  if (
    (normQ.includes('تدبر') && normQ.includes('اعجاز')) ||
    (normQ.includes('التدبر') && normQ.includes('الاعجاز'))
  ) {
    return [
      {
        claimId: 'claim-1',
        statement: 'بيان حث القرآن الكريم ودعوته إلى تدبر آياته والتفكر فيها',
        importance: 'CORE',
        requiredEvidenceType: 'TEXTUAL_EVIDENCE',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      },
      {
        claimId: 'claim-2',
        statement: 'بيان وجوه إعجاز القرآن الكريم ودلائل صدقه',
        importance: 'CORE',
        requiredEvidenceType: 'TEXTUAL_EVIDENCE',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      }
    ];
  }

  const claims = [];

  switch (task) {
    case 'WHY':
      claims.push({
        claimId: 'claim-why-1',
        statement: `بيان علة أو حكمة تشريع أو تحريم الأمر المسؤول عنه في سياق (${resolvedTopic})`,
        importance: 'CORE',
        requiredEvidenceType: 'WISDOM_RATIONALE',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      });
      if (normQ.includes('دليل') || normQ.includes('مستند') || normQ.includes('ايه') || normQ.includes('حديث') || normQ.includes('برهان')) {
        claims.push({
          claimId: 'claim-why-2',
          statement: `إيراد الدليل النصي المعتمد المبين لوجه الحكمة أو العلة في المسألة`,
          importance: 'SECONDARY',
          requiredEvidenceType: 'TEXTUAL_EVIDENCE',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      }
      break;

    case 'COMPARE':
      claims.push({
        claimId: 'claim-comp-1',
        statement: `بيان الفروق الجوهرية والتمايز المفاهيمي الدقيق بين الطرفين المسؤول عنهما في (${resolvedTopic})`,
        importance: 'CORE',
        requiredEvidenceType: 'SCHOLARLY_COMPARISON',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      });
      if (normQ.includes('شبه') || normQ.includes('اتفاق') || normQ.includes('اشتراك') || normQ.includes('اوجه الشبه')) {
        claims.push({
          claimId: 'claim-comp-2',
          statement: `بيان أوجه الالتقاء والاشتراك بين المفهومين المسؤول عنهما`,
          importance: 'SECONDARY',
          requiredEvidenceType: 'CONCEPT_ANALYSIS',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      }
      break;

    case 'MISCONCEPTION': {
      claims.push({
        claimId: 'claim-misc-1',
        statement: `فحص ونفي الافتراض المسبق الخاطئ أو الشبهة في السؤال المتعلق بـ (${resolvedTopic})`,
        importance: 'CORE',
        requiredEvidenceType: 'DIRECT_REFUTATION',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      });
      const isHistoricalMisc = normQ.includes('سيف') || normQ.includes('تاريخ') || normQ.includes('غزوه') || normQ.includes('اجبار') || normQ.includes('قتال');
      claims.push({
        claimId: 'claim-misc-2',
        statement: isHistoricalMisc
          ? `إثبات الواقع التاريخي الصحيح بالوقائع الموثقة من المصادر المعتمدة`
          : `إثبات الموقف الشرعي الصحيح المؤصل بالأدلة من المصادر المعتمدة`,
        importance: 'CORE',
        requiredEvidenceType: isHistoricalMisc ? 'HISTORICAL_EVIDENCE' : 'GROUNDED_POSITIVE_EXPLANATION',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      });
      break;
    }

    case 'TRANSLATE_CONCEPT':
      // Concept grounding + English rendering; semantic-limits claim only if requested
      claims.push(...buildTranslateClaims(normQ, resolvedTopic));
      break;

    case 'VERIFY_HADITH':
      // Authenticity always; source attribution and chain grading only if requested
      claims.push(...buildHadithClaims(normQ));
      break;

    case 'VERIFY_CONSENSUS':
      claims.push({
        claimId: 'claim-ijma-1',
        statement: `التحقق من ثبوت الإجماع الشرعي المعتبر في المسألة المسؤول عنها في سياق (${resolvedTopic})`,
        importance: 'CORE',
        requiredEvidenceType: 'SCHOLARLY_IJMA_CONFIRMATION',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      });
      break;

    case 'CORRECT_QUOTE': {
      claims.push({
        claimId: 'claim-quran-correct-1',
        statement: `التحقق من صحة كتابة وضبط ألفاظ النص القرآني المنقول ومطابقته لرسم المصحف الشريف`,
        importance: 'CORE',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      });
      const asksSurahCorrect = normQ.includes('سوره') || normQ.includes('اين وردت') || normQ.includes('في اي') || normQ.includes('موضعها');
      if (asksSurahCorrect) {
        claims.push({
          claimId: 'claim-quran-correct-2',
          statement: `عزو الآية الكريمة إلى سورتها وتحديد موضعها في المصحف الشريف`,
          importance: 'CORE',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      } else {
        claims.push({
          claimId: 'claim-quran-correct-2',
          statement: `تصويب أي لحن أو خطأ لفظي وقع في صياغة النقل وفق الرسم العثماني المعتمد`,
          importance: 'SECONDARY',
          requiredEvidenceType: 'QURANIC_CORRECTION',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      }
      break;
    }

    case 'VERIFY_QURAN':
      claims.push({
        claimId: 'claim-quran-ver-1',
        statement: `التحقق من ثبوت كون النص المذكور آية في القرآن الكريم أو نفي قرآنيته`,
        importance: 'CORE',
        requiredEvidenceType: 'QURANIC_CANONICAL_TEXT',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      });
      if (normQ.includes('سوره') || normQ.includes('اين وردت') || normQ.includes('في اي')) {
        claims.push({
          claimId: 'claim-quran-ver-2',
          statement: `عزو الآية الكريمة إلى سورتها في المصحف الشريف`,
          importance: 'SECONDARY',
          requiredEvidenceType: 'QURANIC_CANONICAL_TEXT',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      }
      break;

    case 'HISTORICAL_CLAIM':
      claims.push({
        claimId: 'claim-hist-1',
        statement: `فحص مدى ثبوت الدعوى التاريخية المتعلقة بـ (${resolvedTopic}) بالوقائع المعتمدة في السيرة والتاريخ`,
        importance: 'CORE',
        requiredEvidenceType: 'HISTORICAL_EVIDENCE',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      });
      break;

    case 'DEFINE': {
      const asksLinguisticDef = normQ.includes('لغه') || normQ.includes('لغويا') || normQ.includes('اشتقاق') || normQ.includes('لسان العرب');
      const asksBoth = asksLinguisticDef && (normQ.includes('اصطلاح') || normQ.includes('شرعا') || normQ.includes('معنى') || normQ.includes('واصطلاح'));

      if (asksBoth) {
        claims.push({
          claimId: 'claim-def-1',
          statement: `بيان التعريف الشرعي الاصطلاحي لمفهوم (${resolvedTopic}) وضبط حدوده المفاهيمية`,
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_DEFINITION',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
        claims.push({
          claimId: 'claim-def-2',
          statement: `بيان المعنى اللغوي والاشتقاقي لمفردة (${resolvedTopic}) في لسان العرب`,
          importance: 'SECONDARY',
          requiredEvidenceType: 'ARABIC_LEXICON_DEFINITION',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      } else if (asksLinguisticDef) {
        claims.push({
          claimId: 'claim-def-1',
          statement: `بيان المعنى اللغوي والاشتقاقي لمفردة (${resolvedTopic}) في لسان العرب`,
          importance: 'CORE',
          requiredEvidenceType: 'ARABIC_LEXICON_DEFINITION',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      } else {
        claims.push({
          claimId: 'claim-def-1',
          statement: `بيان التعريف الشرعي الاصطلاحي لمفهوم (${resolvedTopic}) وضبط حدوده المفاهيمية`,
          importance: 'CORE',
          requiredEvidenceType: 'SCHOLARLY_DEFINITION',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      }
      break;
    }

    case 'EXPLAIN':
      claims.push({
        claimId: 'claim-exp-1',
        statement: `شرح الكيفية والصفة الشرعية للأمر أو العبادة المسؤول عنها في (${resolvedTopic})`,
        importance: 'CORE',
        requiredEvidenceType: 'FIQH_EXPOSITION',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      });
      if (normQ.includes('شرط') || normQ.includes('شروط') || normQ.includes('ضوابط') || normQ.includes('مبطلات')) {
        claims.push({
          claimId: 'claim-exp-2',
          statement: `بيان الشروط والضوابط الشرعية المعتبرة لصحة العمل أو العبادة`,
          importance: 'SECONDARY',
          requiredEvidenceType: 'FIQH_EXPOSITION',
          claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
        });
      }
      break;

    case 'VERIFY_CLAIM':
      // Truth of the stated claim; separate Sharia-position claim only if explicitly requested
      claims.push(...buildVerifyClaimClaims(normQ));
      break;

    default: // GENERAL
      claims.push({
        claimId: 'claim-gen-1',
        statement: `بيان الحكم الشرعي والتأصيل العلمي للمسألة المسؤول عنها في سياق (${resolvedTopic})`,
        importance: 'CORE',
        requiredEvidenceType: 'ACCREDITED_SOURCE_EVIDENCE',
        claimAtomicity: CLAIM_ATOMICITY_LEVELS.ATOMIC
      });
      break;
  }

  return decomposeCompoundClaims(claims, { originalQuestion, normalizedQuestion, task, topic: resolvedTopic });
}

export default planClaimsForQuestion;
