# ארכיטקטורת האתר — סביבת לימוד אינטראקטיבית במד״ר (104136)

מסמך זה מתאר את הארכיטקטורה של אתר הקורס: מבנה התוכן, המודולים, שכבות הלוגיקה המתמטית, ומערכת העיצוב.

**עדכון אחרון:** 2 בספטמבר 2026

---

## 1. תמונה כללית

האתר הוא סביבת לימוד אינטראקטיבית לקורס משוואות דיפרנציאליות רגילות (104136), בעברית מלאה (RTL), הבנוי כאוסף מודולים עצמאיים. כל מודול משלב: מבוא תיאורטי, פעילות חקירה אינטראקטיבית, ותרגול עצמי עם משוב.

### מפת האתר

```
/  (עמוד הבית — ארבעה כרטיסי מודולים)
├── /phase-plane                         מישור פאזה                    [פעיל]
│     מבוא │ מישור פאזה (מעבדה) │ הרכבת המטריצה │ תרגול עצמי
├── /constant-coefficients-euler         מקדמים קבועים ומשוואות אוילר  [פעיל]
│     מבוא │ הרכבת המשוואה │ תרגול
│       ├── מקדמים קבועים        (תרגול רב־שלבי)
│       ├── משוואות אוילר        (תרגול טרנספורמציה)
│       └── שחזור משוואה         (מנוע תבניות סדר 2/3)
├── /linear-homogeneous                  משוואות ליניאריות הומוגניות  [בבנייה]
│     מבוא │ הרכבת משוואה │ וורונסקיאן (placeholder) │ תרגול
│       └── השלמה למערכת יסודית  (סדר 2, משפחות זרועות)
└── /function-sequences-series           סדרות וטורי פונקציות         [בבנייה]
      מבוא │ סדרות פונקציות │ טורי פונקציות │ טורי חזקות │ טורי טיילור
        └── מבוא פעיל (מפת דרך); ארבע לשוניות התוכן הן placeholders מתוכננים
```

### מצב המודולים

| מודול | כרטיס בעמוד הבית | מצב |
|---|---|---|
| מישור פאזה | פעיל | שלם: מבוא, מעבדה, הרכבת מטריצה, תרגול |
| מקדמים קבועים ואוילר | פעיל | שלם: מבוא, הרכבה, שלושה מצבי תרגול |
| ליניאריות הומוגניות | **בבנייה** | מבוא ומעבדת הרכבה (סדר 2) פעילים; תרגול השלמה למערכת יסודית פעיל; לשונית וורונסקיאן placeholder; הורדת סדר כללית ויציבות עדיין תיאורטיות בלבד |
| סדרות וטורי פונקציות | **בבנייה** | מעטפת, ניווט ומבוא (מפת דרך) פעילים; ארבע לשוניות התוכן הן placeholders מתוכננים. אין עדיין מעבדת גרפים, מנועי תרגול או מתמטיקה סימבולית |

### טכנולוגיות

| רכיב | פירוט |
|---|---|
| Framework | **vinext** 0.0.50 (Vite 8 + Next.js 16 App Router) |
| UI | React 19, TypeScript |
| מתמטיקה | KaTeX + react-katex |
| אלגברה סימבולית | **nerdamer** 1.1.13 — בשימוש במודול הליניארי ההומוגני בלבד |
| בדיקות | **vitest** — `npm test`; כרגע רק במודול הליניארי ההומוגני |
| פונט | Assistant (משקלים 400/600/700/800) דרך `@fontsource` |
| פריסה | Cloudflare Workers (`worker/index.ts`), wrangler |
| DB (אופציונלי) | Drizzle + D1 — הסכמה ריקה, לא בשימוש |

### ניהול State

React מקומי בלבד: `useState` / `useMemo` / `useRef` / `useEffect`. **אין** Context, Redux, localStorage או פרמטרים ב-URL. לשוניות מנוהלות ב-state פנימי (לא בניתוב). שאלות תרגול נוצרות עם RNG זרוע (seeded) לשחזוריות. מודול ההומוגניות הליניארית **משתמש מחדש** ב-`SeededRandom` של מודול אוילר.

---

## 2. ניתוב ועמודים

| Route | קובץ | תפקיד |
|---|---|---|
| `/` | `app/page.tsx` | עמוד הבית: hero + רשת כרטיסי מודולים (שניים פעילים, שניים בבנייה) |
| `/phase-plane` | `app/phase-plane/page.tsx` | מעטפת דקה שטוענת את `PhasePlaneModule` |
| `/constant-coefficients-euler` | `app/constant-coefficients-euler/page.tsx` | מעטפת מודול עם 3 לשוניות פנימיות |
| `/linear-homogeneous` | `app/linear-homogeneous/page.tsx` | מעטפת מודול עם 4 לשוניות פנימיות |
| `/function-sequences-series` | `app/function-sequences-series/page.tsx` | מעטפת דקה שטוענת את `FunctionSequencesSeriesModule` (5 לשוניות) |
| layout | `app/layout.tsx` | `lang="he" dir="rtl"`, טעינת Assistant + KaTeX CSS + `globals.css` |

ניווט: מעמוד הבית לכרטיסי המודולים; בכל מודול topbar עם קישור «עמוד הבית» וכפתורי לשוניות (state, לא URL).

---

## 3. מודול מישור הפאזה

**קובץ מרכזי:** `app/phase-plane-module.tsx` — קובץ מונוליטי אחד (~5,400 שורות) המכיל את כל הלוגיקה, הציור וה-UI.

### לשוניות

| לשונית | תפקיד |
|---|---|
| מבוא (`phase-intro`) | placeholder לסרטון + הרחבות תיאורטיות מתקפלות: מערכות אוטונומיות, נקודות קריטיות ולינאריזציה, סיווג לפי ויאטה, ותת־מקרים (אוכף, קשרים, כוכב, קשר מנוון, מרכז, ספירלות, ישרי שיווי משקל, נילפוטנטית, שדה אפס) עם קנבסים מוקטנים |
| מישור פאזה (`phase-lab`) | מעבדה בפריסת 3 עמודות: בקרה (מטריצה, presets, צפיפות, זום, עריכת דגימות) · קנבס · ניתוח (סיווג, ערכים עצמיים, tr/det/D, פאנלי «איך מציירים») |
| הרכבת המטריצה (`matrix-assembler`) | בחירת סוג תמונה (10 סוגים) → הזנת ערכים/וקטורים עצמיים → ולידציה → הרכבת `A` והצגתה (SVG) → «פתח במעבדה» |
| תרגול עצמי (`self-practice`) | שתי פעילויות: מטריצה→תמונה ותמונה→סיווג; רמות קושי, מסיחים, סטטיסטיקות ודו״ח טעויות (בזיכרון) |

### לוגיקה מתמטית

- `classify(matrix)` — סיווג לפי עקבה, דטרמיננטה ודיסקרימיננטה `D = tr² − 4·det`; 14 סוגי `PhaseKind`.
- `eigenSummary`, `eigenDirections`, `realEigenPairs` — חישובי ערכים/וקטורים עצמיים.
- בניית מטריצות ממודלים: `diagonal` / `star` / `defective` / `complex`.
- יצירת שאלות זרועה: `generatePhaseCase`, `buildPracticeQuestion` + `distractorMap`.

### ציור (`PhaseCanvas`)

Canvas 2D מותאם DPR; אינטגרציית RK4 למסלולים; פונקציות ציור ייעודיות לכל סוג תמונה (שדה כיוונים, אוכף, קשרים, כוכב, מרכז, ספירלות, ערך עצמי אפס); ציור ישרים עצמיים, חצים וראשית.

---

## 4. מודול מקדמים קבועים ומשוואות אוילר

**תיקייה:** `app/constant-coefficients-euler/` — מודול שכבתי (~30 קומפוננטות + שכבות `math/` ו-`practice/`).

### לשוניות

| לשונית | קומפוננטה | תפקיד |
|---|---|---|
| מבוא | `ConstantCoefficientsEulerIntro` | תוכן תיאורטי + placeholder לסרטון |
| הרכבת המשוואה | `EquationAssemblerActivity` | שורשים → פולינום אופייני → משוואה → בסיס |
| תרגול | `PracticeHub` | מיתוג בין שלושה מצבי תרגול |

### מצבי תרגול

1. **מקדמים קבועים** — `ConstantCoefficientFullPractice`: תרגיל רב־שלבי (פולינום → שורשים → בסיס → תנאי התחלה → יציבות), עם נעילת שלבים, חשיפת פתרון וסטטיסטיקות.
2. **משוואות אוילר** — `EulerTransformationPractice`: מקדמי אוילר → פולינום/משוואה מתמרת → שורשים → בסיס ב-u → בסיס ב-y → יציבות.
3. **שחזור משוואה** — `EquationReconstructionPractice`: בהינתן פתרונות (ואולי התנהגות) → ישימות → שורשים מאולצים / משפחה חד־פרמטרית / משפחה דו־פרמטרית / בלתי אפשרי.

### קומפוננטות (`components/`)

| קובץ | תפקיד |
|---|---|
| `MathText.tsx`, `DisplayMath.tsx` | רינדור KaTeX inline/block (ראו §7) |
| `StepCard.tsx`, `PracticeStats.tsx` | כרטיס שלב נעול/פתוח; תצוגת רצף ודיוק |
| `RootGroupEditor.tsx`, `PracticeRootGroupEditor.tsx` | עריכת קבוצות שורשים (הרכבה / תרגול) |
| `PolynomialCoefficientEditor.tsx`, `DifferentialEquationCoefficientEditor.tsx`, `EulerCoefficientEditor.tsx`, `InitialCoefficientEditor.tsx` | עורכי מקדמים לסוגי הצגה שונים |
| `InitialConditionsStage.tsx`, `StabilityStage.tsx` | שלבי תנאי התחלה ויציבות |
| `ConstantBasisComposer.tsx`, `BasisElementComposer.tsx`, `EulerBasisElementComposer.tsx`, `BasisEditor.tsx` | הרכבת איברי בסיס (CC ואוילר) |
| `MathParameterInput.tsx` | שדה קלט נומרי בתוך נוסחה |
| `ReconstructionGivenData.tsx`, `ReconstructionInputs.tsx`, `ReconstructionFamilyConclusion.tsx`, `ReconstructionTwoParameterConclusion.tsx` | רכיבי פעילות השחזור, כולל מסקנה דו־פרמטרית (סדר 3) |

### שכבת המתמטיקה (`math/`)

| קובץ | תפקיד |
|---|---|
| `polynomial.ts`, `roots.ts` | פולינומים, פריסה משורשים, פרסור וולידציה |
| `basis.ts`, `basisDerivatives.ts` | אסימוני בסיס ↔ LaTeX (CC: `e^{rx}`, `x^k`; אוילר: `x^r`, `ln`); נגזרות ב-0 |
| `eulerConversion.ts` | המרת מקדמים חזקות ↔ falling factorial |
| `stability.ts` | סיווג יציבות לפי שורשים + נימוק |
| `initialConditions.ts` | מטריצת תנאי התחלה (Wronskian) ופתרונה |
| `reconstruction.ts`, `reconstructionBehavior.ts` | שורשים מאולצים, ישימות, ניתוח (יחיד / חד־פרמטרי / דו־פרמטרי / בלתי אפשרי); התנהגות ב-±∞ |
| `givenSolutionExpression.ts`, `rootCanonicalization.ts` | ביטויי פתרונות נתונים; קנוניזציה ומיזוג ריבויים |
| `parameterDomains.ts`, `affinePolynomial.ts`, `twoParameterFormatting.ts` | תחומי פרמטרים חופשיים; LaTeX לפולינומים אפיניים ומשפחות דו־פרמטריות |
| `algebraicFormatting.ts` | פורמט LaTeX משותף (ללא `1r`, סימנים כפולים וכו׳) |
| `mathTypography.ts` | helpers למחלקות CSS של גדלי נוסחאות |

### שכבת התרגול (`practice/`)

| קובץ | תפקיד |
|---|---|
| `random.ts` | `SeededRandom`, `mixSeed` — **משותף גם למודול ההומוגניות** |
| `questionGeneration.ts`, `eulerQuestionGeneration.ts`, `initialConditionGeneration.ts` | יצירת שאלות לכל מצב |
| `answerEvaluation.ts`, `polynomialEvaluation.ts`, `rootEvaluation.ts`, `initialConditionEvaluation.ts`, `stabilityEvaluation.ts` | בדיקת תשובות לכל שלב |
| `basisComposer.ts`, `rootDisplay.ts`, `stats.ts` | עזרי הרכבה, תצוגה וסטטיסטיקות |
| `reconstructionQuestionGeneration.ts`, `reconstructionEvaluation.ts` | תזמור יצירה והערכה לשחזור |
| `reconstruction/order2Generation.ts`, `order3Generation.ts` | אינסטנציאציה משוקללת של תבניות |
| `reconstruction/templates/shared.ts`, `order2.ts` (34 תבניות), `order3.ts` (36 תבניות) | מאגרי תבניות שאלה מבוקרות עם מסננים לפי קושי וסוג |

**זרימת יצירת שאלת שחזור:** בחירת תבנית לפי סדר/קושי/סוג → דגימת פרמטרים → ניתוח עם `analyzeReconstruction` → fallback לגנרטור legacy אם אין תבנית מתאימה.

### קבצי תשתית

- `types.ts` — לשוניות, מצבי תרגול, אסימוני בסיס, סטטוסי שלבים, סוגי שחזור ויציבות.
- `constants.ts` — גבולות (`MAX_DEGREE=6`), מאגרי שורשים, תוויות עבריות, מכסות ניסיונות יצירה.
- `utils/` — `formatting.ts`, `parsing.ts`, `id.ts`.

---

## 5. מודול משוואות ליניאריות הומוגניות

**תיקייה:** `app/linear-homogeneous/` — מודול שכבתי (components / math / practice), במבנה דומה למודול אוילר. מסומן בעמוד הבית כ«מודול בבנייה».

המודול עוסק במשוואה המנורמלת
`y^{(n)}+a_{n-1}(x)y^{(n-1)}+⋯+a_0(x)y=0`
עם מקדמים רציפים בקטע/קרן.

### לשוניות

| לשונית | קומפוננטה | מצב |
|---|---|---|
| מבוא | `LinearHomogeneousIntro` | **פעיל** — תוכן תיאורטי + placeholder לסרטון |
| הרכבת משוואה | `EquationAssemblerActivity` | **פעיל** — סדר 2 בלבד ב-UI |
| וורונסקיאן | `WronskianPlaceholder` | **placeholder** — «בבנייה» |
| תרגול | `PracticePlaceholder` → `FundamentalCompletionActivity` | **פעיל** — השלמה למערכת יסודית (סדר 2) |

### מבוא

הרחבות מתקפלות (`.intro-expansion` / `.intro-sub-expansion`):

- קיום ויחידות למשוואות ליניאריות
- מרחב הפתרונות: מבנה אלגברי, תלות/אי־תלות, וורונסקיאן, משפט וורונסקיאן לפתרונות, קיום בסיס
- נוסחת אבל + שחזור משוואה מבסיס (משפט Abel–Liouville / uniqueness של המשוואה המנורמלת)
- הורדת סדר: נוסחת אבל (סדר 2) ווריאציית פרמטרים (כללי)
- יציבות: פסקה קצרה בלבד, בלי פעילות

### פעילות הרכבת משוואה

הזנת שתי פונקציות `y₁(x)`, `y₂(x)` בתחביר נוסחה חופשי → פרסור → בניית המשוואה המנורמלת הייחודית שמערכת זו היא בסיס שלה (כאשר `W ≠ 0`).

פריסת 3 עמודות (`.fundamental-activity-grid`): בקרה · כרטיס קלט עם תצוגה מקדימה חיה · פאנל תוצאה (`p(x)`, `q(x)`, וורונסקיאן, פתרון כללי). כשלונות: שגיאת פרסור, וורונסקיאן מנוון, חישוב סימבולי לא חד־משמעי.

ה-UI מוגבל לשתי פונקציות (סדר 2). שכבת המתמטיקה תומכת גם בסדר 3 ו-4.

### תרגול: השלמה למערכת יסודית

נתונה משוואה מסדר 2 ופתרון אחד `y₁`. הסטודנט מזין מועמד ל-`y₂`. האימות הסימבולי מבחין בין: שגיאת פרסור, בעיית תחום, אינו פתרון, פתרון תלוי ליניארית, נכון, ולא חד־משמעי.

- רמות: קל / בינוני / קשה / מעורב (40% / 40% / 20%).
- רמזים מדורגים בשתי דרכים: נוסחת אבל / הצבה `y=vy₁`.
- סטטיסטיקות בזיכרון: שאלות, נפתרו, דיוק, רצף.
- תשובה נכונה כוללת גם כפולה של הפתרון הקנוני וגם צירוף ליניארי עם `y₁`.

### שכבת המתמטיקה (`math/`)

המודול הראשון שמשתמש באלגברה סימבולית כללית (nerdamer), בניגוד למודול אוילר שעובד עם שורשים/פולינומים מובְנים.

| קובץ | תפקיד |
|---|---|
| `formulaParser.ts` | פרסר נוסחאות: `+ − * / ^`, `exp/ln/log/sin/cos/tan/cot/sqrt`, קבועים `e`/`pi`; פלט AST + מחרוזת nerdamer + LaTeX. דורש כפל מפורש (`3*x`) |
| `differentiate.ts` | גזירה סימבולית על ה-AST (לא דרך nerdamer) |
| `nerdamerConfig.ts` | שומר על `e`/`π` סימבוליים; `safeEvaluate` עם restore של `PARSE2NUMBER` אחרי זריקה |
| `equationFromBasis.ts` | בניית המשוואה המנורמלת מבסיס (`n=2,3,4`); מסלול מהיר לסדר 2 (`p=−W′/W`, `q=(y₁′y₂″−y₁″y₂′)/W`); מסלול כללי דרך מינורים |
| `symbolicDeterminant.ts` | דטרמיננטה סימבולית עד 4×4 (פיתוח לפי שורה) |
| `symbolicSimplify.ts` | פישוט קריא לתצוגה: `readableSimplify`, `readableQuotient`, `compactViaLinearShift`; **לא** לאימות |
| `displayQuotient.ts` | שכתוב קוסמטי `(1+x)^(-1)*(2x+3)` → מנה; לתצוגה בלבד |
| `equationFormatting.ts` | LaTeX למשוואה, וורונסקיאן, פתרון כללי ומקדמים |
| `fundamentalCompletionVerifier.ts` | אימות תשובה: שיור המשוואה + וורונסקיאן מול `y₁` בנקודות דגימה ובדיקה סימבולית של אפס |
| `mathTypography.ts` | עותק של ה-helpers ממודול אוילר |

### שכבת התרגול (`practice/`)

| קובץ | תפקיד |
|---|---|
| `fundamentalCompletionGenerator.ts` | 10 משפחות תבניות עם פרמטרים זרועים; שער קריאות; ולידציה שהקנוני עובר את ה-verifier |
| `fundamentalCompletionQuestions.ts` | טיפוס השאלה + fixtures ישנים לרגרסיה (הריצה בפועל מהגנרטור) |

**משפחות השאלות:**

| משפחה | קושי | דוגמה טיפוסית |
|---|---|---|
| `polynomial-pair` | קל | זוג פולינומים |
| `quadratic-quartic` | קל | `x²+1` ו-`x⁴` |
| `shifted-linear-log` | קל | `(ax+b) ln(ax+b)` |
| `sqrt-reciprocal` | קל | `√(x−h)` ו-`1/√(x−h)` |
| `quadratic-linear-exponential` | בינוני | `e^{ax²}` ו-`e^{bx}` |
| `reciprocal-exponential` | בינוני | `e^{c/x}` |
| `log-power` | בינוני | `ln x` ו-`x^m` |
| `sqrt-exponential` | בינוני | `√(x−h) e^{±cx}` |
| `sine` | קשה | `sin(kx)`, `sin(kx)cos(kx)` |
| `cosine` | קשה | `cos(kx)`, `x cos(kx)` |

### קומפוננטות (`components/`)

| קובץ | תפקיד |
|---|---|
| `MathText.tsx`, `DisplayMath.tsx` | עותק של רינדור KaTeX ממולול אוילר |
| `LinearHomogeneousIntro.tsx` | מבוא תיאורטי |
| `EquationAssemblerActivity.tsx` | מעבדת הרכבה מסדר 2 |
| `FundamentalCompletionActivity.tsx` | תרגול השלמה למערכת יסודית |
| `PracticePlaceholder.tsx` | מעטפת דקה שטוענת את פעילות ההשלמה |
| `WronskianPlaceholder.tsx` | מסך «בקרוב» ללשונית הוורונסקיאן |

### בדיקות (`*.test.ts`)

Vitest (`npm test`, `app/**/*.test.ts`):

| קובץ | מכסה |
|---|---|
| `equationFromBasis.test.ts` | דטרמיננטות; הרכבה מסדר 2/3/4; וורונסקיאן מנוון; שגיאות פרסור |
| `fundamentalCompletion.test.ts` | פרסר; אימות תשובות קנוניות ולא־קנוניות; יצירת משפחות |
| `symbolicSimplify.test.ts` | פישוט קריא ומנות |
| `displayQuotient.test.ts` | שכתוב חזקות שליליות למנות |
| `exactConstants.test.ts` | `e`/`π` נשארים סימבוליים ואינם מתרציונלים |

### מה עדיין חסר במודול

- פעילות וורונסקיאן אינטראקטיבית (הלשונית קיימת כ-placeholder).
- UI להרכבה מסדר 3–4 (המתמטיקה כבר תומכת).
- תרגול הורדת סדר כללית (וריאציית פרמטרים ל-`n>2`) ויציבות — מופיעים במבוא בלבד.
- מצבי תרגול נוספים מעבר להשלמה למערכת יסודית.

---

## 6. מודול סדרות וטורי פונקציות

**תיקייה:** `app/function-sequences-series/` — מודול שכבתי במבנה דומה למודולי אוילר וההומוגניות. מסומן בעמוד הבית כ«מודול בבנייה».

המודול עוסק בחלק המתמטי הפותח של הקורס: סדרות פונקציות, טורי פונקציות, טורי חזקות וטורי טיילור.

`page.tsx` הוא מעטפת דקה שטוענת את `FunctionSequencesSeriesModule.tsx`. המעטפת אחראית ל-layout, ל-topbar ולמצב הלשוניות בלבד (`useState` מקומי; רענון מחזיר ללשונית הראשונה). אין Context, localStorage או פרמטרים ב-URL.

### לשוניות

| לשונית | קומפוננטה | מצב |
|---|---|---|
| מבוא (`intro`) | `FunctionSequencesSeriesIntro` | **פעיל** — מפת דרך של ארבעה פרקים, לא ספר לימוד |
| סדרות פונקציות (`function-sequences`) | `FunctionSequencesSection` | **placeholder מתוכנן** |
| טורי פונקציות (`function-series`) | `FunctionSeriesSection` | **placeholder מתוכנן** |
| טורי חזקות (`power-series`) | `PowerSeriesSection` | **placeholder מתוכנן** |
| טורי טיילור (`taylor-series`) | `TaylorSeriesSection` | **placeholder מתוכנן** |

ארבע לשוניות התוכן משתמשות ב-`SectionPlaceholder` משותף: כותרת, תיאור קצר עם נוסחאות, רשימת «פעילויות מתוכננות», ומסגרת «פעילות אינטראקטיבית / בבנייה». **אין** עדיין מעבדת גרפים, Canvas, מנועי תרגול או לוגיקה סימבולית.

### מבוא

ארבעה כרטיסים ברשת `.module-intro-grid`:

- סדרות פונקציות — התכנסות נקודתית מול במידה שווה, והעברת רציפות/אינטגרציה/גזירה דרך הגבול.
- טורי פונקציות — נקודת המבט `S_N`, מבחן `M` של ויירשטראס, לייבניץ, ומשפטי העברה לסכום.
- טורי חזקות — מרכז, רדיוס, קטעים פנימיים, נקודות קצה, גזירה ואינטגרציה איבר־איבר.
- טורי טיילור — הקשר `a_n=f^{(n)}(x_0)/n!` ובניית טורים מתוך טורים מוכרים.

### קומפוננטות (`components/`)

| קובץ | תפקיד |
|---|---|
| `MathText.tsx`, `DisplayMath.tsx` | עותק של רינדור KaTeX ממודול אוילר (ראו §7) |
| `FunctionSequencesSeriesIntro.tsx` | מפת דרך של המודול |
| `SectionPlaceholder.tsx` | מעטפת משותפת ללשוניות התוכן שטרם מומשו |
| `FunctionSequencesSection.tsx`, `FunctionSeriesSection.tsx`, `PowerSeriesSection.tsx`, `TaylorSeriesSection.tsx` | תוכן מתוכנן לכל פרק |

`math/mathTypography.ts` הוא עותק של עזרי מחלקות CSS, שנדרש ל-`MathText`/`DisplayMath`. אין עדיין שכבת `math/` אלגוריתמית ואין תיקיית `practice/`.

### הכנה למעבדת גרפים

המחלקה `.function-series-lab-grid` כבר מוגדרת ב-`globals.css` באותם breakpoints של שאר רשתות שלוש העמודות (בקרה · גרף · ניתוח). היא **אינה בשימוש ב-UI** בשלב זה.

### מה עדיין חסר במודול

- מעבדת גרפים לסדרות (`f_n`, `f`, פונקציית שגיאה, supremum).
- פעילויות על טורי פונקציות, טורי חזקות וטורי טיילור.
- שכבות `math/` ו-`practice/` (משפחות פונקציות, רדיוס התכנסות, גנרטורים, `SeededRandom`).

---

## 7. מערכת רינדור מתמטי

**Stack:** `katex` + `react-katex`; ה-CSS נטען ב-layout הראשי.

| שכבה | מיקום | התנהגות |
|---|---|---|
| `DisplayMath` | `constant-coefficients-euler/components/`, `linear-homogeneous/components/`, `function-sequences-series/components/` ועותק מקומי ב-`phase-plane-module.tsx` | `katex.renderToString` עם `displayMode: true`; מחלקה `math-display`; `dir="ltr"` |
| `MathText` | אותן שלוש תיקיות | inline דרך `InlineMath` עם וריאנטים `inline` / `compact` / `standard`; מצב `block` מפנה ל-`DisplayMath` |
| `MathText` מקומי | `phase-plane-module.tsx` | `InlineMath` + `.math-render` עם `data-variant` (ברירת מחדל `inline`); מצב `block` מפנה ל-`DisplayMath` המקומי |
| אסימוני גודל | `math/mathTypography.ts` (עותק בכל מודול שכבתי) + `globals.css` | `--math-size-inline` (1em), `--math-size-compact`, `--math-size-standard` (clamp רספונסיבי) |

הערה: מודול מישור הפאזה **אינו** מייבא את צמד `MathText`/`DisplayMath` של המודולים השכבתיים — שני הרכיבים מוגדרים מקומית ב-`phase-plane-module.tsx`. מודולי ההומוגניות וסדרות הפונקציות מעתיקים את הצמד של מודול אוילר (אין חבילה משותפת עדיין).

---

## 8. מערכת העיצוב

**קובץ יחיד:** `app/globals.css` (~3,560 שורות) — כל העיצוב מבוסס מחלקות CSS מותאמות (Tailwind מיובא אך כמעט לא בשימוש utility). **Theme בהיר בלבד** — אין dark mode.

### שפה עיצובית: «מחברת נייר»

רקע קרם עם רשת משבצות עדינה (32×32px) ומשטח זהב רדיאלי קלוש; פאנלים «זכוכיתיים» עם blur; מתמטיקה בגופן KaTeX על רקע נייר.

### אסימוני עיצוב (`:root`)

| משתנה | ערך | תפקיד |
|---|---|---|
| `--paper` | `#fbf7ed` | רקע העמוד והקנבס (קרם) |
| `--paper-deep` | `#efe4cf` | נייר עמוק יותר (שמור; אין שימוש עדיין) |
| `--ink` | `#252b33` | טקסט ראשי |
| `--muted` | `#6f736f` | תוויות משניות |
| `--line` | `rgba(37,43,51,0.16)` | מסגרות |
| `--blue` | `#235789` | Accent ראשי: קישורים, focus, מצבים נבחרים, מתמטיקה |
| `--blue-soft` | `#dce9f5` | מילוי כחול רך (לשוניות פעילות, בחירות) |
| `--green` | `#2f7f72` | הצלחה / פעולות משניות |
| `--green-soft` | `#dcece7` | מילוי ירוק רך |
| `--rust` | `#b85735` | שגיאה / אזהרה / הערות |
| `--danger` | `#b42318` | טקסט הרסני / שגיאה (נפרד מ-`--rust`) |
| `--gold` | `#c38c2c` | מבטא זהב (שטיפת העמוד, placeholders) |
| `--panel` | `rgba(255,252,244,0.82)` | רקע פאנלים |
| `--raised` | `#fffdf8` | משטח מוגבה / מילוי שדות ו-chips |
| `--shadow` | `0 24px 80px rgba(37,43,51,0.12)` | הצללת פאנלים |
| `--math-size-*` | ראו §7 | גדלי KaTeX |

צבעים סמנטיים נוספים (לא כמשתנים): ירוק תשובה נכונה `rgba(34,120,70,…)`, אדום קלט שגוי `rgba(180,50,50,0.55)`, ענבר «נחשף» `rgba(120,95,20,0.45)`. `#fff` על `.polynomial-coefficient-tooltip` הוא טקסט הפוך מאושר; דוגמיות המקרא `#2c456b` / `#83aff0` / `#ff9d00` נשארות ליטרלים.

### טיפוגרפיה

- **UI:** Assistant (400/600/700/800), נטען ב-`app/layout.tsx`.
- **מתמטיקה וקלט נומרי:** `KaTeX_Main, "Times New Roman", serif`.
- כותרות גדולות עם `clamp()` רספונסיבי (למשל `h1`: `clamp(2rem, 4vw, 4.25rem)`, משקל 800); תוויות מקטע קטנות (`0.78rem`, משקל 800, muted).

### RTL / LTR

- שורש: `<html lang="he" dir="rtl">`; כל מעטפת מודול מוסיפה `dir="rtl"`.
- **דפוס בידוד מתמטיקה:** כל עטיפת נוסחה מקבלת `dir="ltr"` ב-HTML + `direction: ltr; unicode-bidi: isolate` ב-CSS (`.math-display`, `.math-render`, שורות מקדמים, מטריצות SVG וכו׳).
- כלל אצבע: טקסט הדרכה עברי — RTL; נוסחאות, מטריצות, שורות מקדמים ו**שדות נוסחה חופשית** — איי LTR מבודדים.

### דפוסי פריסה

- **Shell:** `.app-shell` — רוחב מרבי ~1540px, ריפוד 22px (14px במובייל).
- **Topbar:** `.topbar` עם כותרת + ניווט `.module-pill` (פעיל → מילוי כחול רך).
- **רשתות 3 עמודות** (ה-DNA המשותף של כל המודולים; במסך רחב כל השש חולקות `minmax(270px, 330px) minmax(520px, 1fr) minmax(260px, 340px)`):

| מחלקה | שימוש |
|---|---|
| `.lab-grid` | מעבדת מישור פאזה: בקרה · קנבס · ניתוח |
| `.assembler-grid` / `.equation-assembler-grid` | פעילויות הרכבה (פאזה / אוילר) |
| `.fundamental-activity-grid` | הרכבה ותרגול במודול ההומוגניות |
| `.function-series-lab-grid` | שמורה למעבדת סדרות פונקציות עתידית: בקרה · גרף · ניתוח (לא בשימוש ב-UI עדיין) |
| `.practice-grid` | מסכי תרגול במודול אוילר |

- **פאנלים:** `.control-panel` / `.canvas-panel` / `.analysis-panel` — רקע `--panel`, רדיוס 8px, `backdrop-filter: blur(14px)`, הצללת `--shadow`. כרטיסים מקוננים: `.panel-section`, `.result-card` (ו-`.result-card.primary` עם גרדיאנט כחול להדגשת הסיווג).
- **לשוניות משנה:** `.segmented-control`, `.practice-mode-nav`.
- **עמוד הבית:** `.course-module-card.active` מול `.course-module-card.construction`.

### דפוסי רכיבים

- **כפתורים:** `.panel-action` (ראשי, כחול-דיו על `#fffdf8`; `.secondary` ירוק), כפתורי preset/chips, `.icon-button`.
- **קלטים:** מיושרים למרכז, גופן KaTeX_Main לשדות נומריים, focus עם טבעת כחולה `0 0 0 3px rgba(35,87,137,0.14)`; מטריצות עם סוגריים מצוירים ב-pseudo-elements.
- **קלט נוסחה חופשית** (מודול הומוגניות): `.formula-input-label` + `.formula-preview` — שדה LTR עם תצוגת KaTeX חיה מתחתיו.
- **משוב תרגול:** `.quiz-option.correct` / `.wrong` (ירוק/rust), `.coefficient-correct` / `.coefficient-incorrect`, `.practice-step-card.status-*`, השלמה עצמאית (ירוק) מול נעזרת (ענבר).
- **מקרא קנבס:** `.legend-item` עם דוגמיות צבע — ישרים עצמיים `#2c456b`, וקטורים עצמיים `#83aff0`, מסלולים `#ff9d00`, שדה `rgba(35,87,137,0.32)`.
- **מודלים:** `.modal-backdrop` (דיו 22% + blur) + `.sample-modal`.

### רספונסיביות

| Breakpoint | אפקט |
|---|---|
| ≤1180px | רשתות 3 עמודות → 2; פאנל הניתוח נפרס לרוחב |
| ≤960px | `.stability-classification-grid` → שתי עמודות |
| ≤820px | הכול לעמודה אחת; topbar נערם; קנבס בגובה מוקטן |
| ≤680px / ≤640px | רשתות בסיס ויציבות → עמודה אחת |
| ≥760px | `.lambda-option-list` → שלוש עמודות (שאילתת `min-width` היחידה בקובץ) |

גלילה אופקית מכוונת לנוסחאות רחבות (`.math-display-centered`, שורות נוסחה).

### זהות ויזואלית של המודולים

אין פלטת צבעים נפרדת לכל מודול — כולם חולקים את אותם אסימונים. ההבחנה היא מבנית: מישור הפאזה מזוהה עם הקנבס והמקרא; מודול אוילר עם צינור כרטיסי השלבים (`.practice-step-card`) ורצועות המידע (`.euler-transform-strip`); מודול ההומוגניות עם קלט נוסחה חופשית (`.formula-answer-card`) ותצוגה מקדימה חיה; מודול סדרות הפונקציות עדיין במעטפת ובמפת דרך בלבד.

---

## 9. תשתית ופריסה

- **פיתוח:** `npm run dev` (vinext), `npm run build` (next build).
- **בדיקות:** `npm test` (vitest) — כרגע רק `app/linear-homogeneous/math/*.test.ts`.
- **Worker:** `worker/index.ts` — handler ל-Cloudflare Workers + אופטימיזציית תמונות.
- **DB:** `db/schema.ts` ריק בכוונה; `db/index.ts` מצפה ל-binding בשם `DB` (D1). לא בשימוש כרגע.
- **סקריפטי אימות** (`scripts/`, לא מחוברים ל-package.json — מריצים ידנית; שייכים למודול אוילר):

| סקריפט | בודק |
|---|---|
| `verify-algebraic-formatting-cases.ts` | פורמט LaTeX של פולינומים |
| `verify-euler-cases.ts` | המרות אוילר ויצירת שאלות |
| `verify-initial-conditions-cases.ts` | נגזרות בסיס ומטריצת תנאי התחלה |
| `verify-stability-cases.ts` | ניתוח יציבות והערכת תשובות |
| `verify-root-canonicalization-cases.ts` | קנוניזציה ומיזוג שורשים |
| `verify-reconstruction-cases.ts` | ניתוח שחזור ושורשים מאולצים |
| `verify-order2-reconstruction-templates.ts` | כל 34 תבניות סדר 2 |
| `verify-order3-reconstruction-templates.ts` | כל 36 תבניות סדר 3 |
| `verify-math-size-tokens.mjs` | עקביות אסימוני גודל CSS |

---

## 10. הערות ארכיטקטוניות

- **שני סגנונות מבניים:** מישור הפאזה הוא קובץ מונוליטי אחד; מודולי אוילר, ההומוגניות וסדרות הפונקציות בנויים בשכבות (components / math / practice לפי הצורך). מודול סדרות הפונקציות מפריד במפורש בין `page.tsx` הדק לבין `FunctionSequencesSeriesModule.tsx`. כל פיצול עתידי של מישור הפאזה כדאי שילך בכיוון הזה.
- **כפילות מכוונת:** ל-`MathText`/`DisplayMath`/`mathTypography` יש ארבע גרסאות (פאזה מקומית; עותק זהה באוילר, בהומוגניות ובסדרות הפונקציות). אין עדיין חבילת UI מתמטי משותפת.
- **שתי פרדיגמות מתמטיות:** מודולי הפאזה ואוילר עובדים עם מבנים סגורים (מטריצות 2×2, שורשים, פולינומים). מודול ההומוגניות מפרסר נוסחאות חופשיות ומפעיל nerdamer — עם מדיניות זהירות סביב `e`/`π` ופישוט לתצוגה מול אימות. מודול סדרות הפונקציות עדיין בלי שכבת מתמטיקה אלגוריתמית.
- **שיתוף נקודתי:** הגנרטור של ההשלמה למערכת יסודית מייבא `SeededRandom` ממודול אוילר. זה הקשר היחיד בין המודולים בקוד. מודול סדרות הפונקציות מתוכנן למחזר את אותו `SeededRandom` כשתיבנה שכבת `practice/`.
- **ללא persistence:** סטטיסטיקות תרגול חיות בזיכרון בלבד ומתאפסות ברענון — בחירה מודעת בשלב זה.
