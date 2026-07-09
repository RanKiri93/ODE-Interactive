"use client";

import Link from "next/link";
import { InlineMath } from "react-katex";

function MathText({ math }: { math: string }) {
  return (
    <span className="math-render" dir="ltr">
      <InlineMath math={math} />
    </span>
  );
}

export default function ConstantCoefficientsEulerPage() {
  return (
    <main className="app-shell module-page" dir="rtl">
      <header className="topbar module-page-topbar">
        <div>
          <p className="course-kicker">104136 · משוואות דיפרנציאליות רגילות</p>
          <h1>מקדמים קבועים ומשוואות אוילר</h1>
        </div>
        <nav aria-label="ניווט באתר">
          <Link className="module-pill" href="/">
            עמוד הבית
          </Link>
          <Link className="module-pill" href="/phase-plane">
            מישור פאזה
          </Link>
        </nav>
      </header>

      <section className="module-intro-grid">
        <article className="module-intro-card hero">
          <p className="course-kicker">מודול בבנייה</p>
          <h2>מה נבנה כאן?</h2>
          <p>
            העמוד הזה ישמש כמעבדה אינטראקטיבית למשוואות ליניאריות במקדמים קבועים ולמשוואות אוילר. בשלב הבא נוסיף
            חישוב פולינום אופייני, ניתוח שורשים, והמרה של משוואת אוילר למשוואה במקדמים קבועים.
          </p>
        </article>

        <article className="module-intro-card">
          <div className="section-heading">מקדמים קבועים</div>
          <p>
            עבור משוואה ליניארית הומוגנית מקבלים פולינום אופייני, למשל
            {" "}
            <MathText math="ar^2+br+c=0" />.
          </p>
          <p>האינטראקציה העתידית תדגיש איך סוג השורשים משנה את צורת הפתרון ואת ההתנהגות האסימפטוטית.</p>
        </article>

        <article className="module-intro-card">
          <div className="section-heading">משוואות אוילר</div>
          <p>
            במשוואות מהצורה <MathText math="ax^2y''+bxy'+cy=0" /> אפשר להשתמש בהצבה מתאימה כדי לעבור למשוואה עם
            מקדמים קבועים.
          </p>
          <p>בהמשך נבנה כלי שמציג את ההצבה ואת המעבר בין שתי המשוואות שלב אחר שלב.</p>
        </article>
      </section>
    </main>
  );
}
