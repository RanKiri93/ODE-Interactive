import Link from "next/link";

export default function Home() {
  return (
    <main className="app-shell course-home" dir="rtl">
      <header className="course-hero">
        <p className="course-kicker">104136 · משוואות דיפרנציאליות רגילות</p>
        <h1>סביבת לימוד אינטראקטיבית במד״ר</h1>
        <p>
          אתר הקורס נבנה כקבוצת מודולים קטנים: הסבר תיאורטי קצר, חקירה אינטראקטיבית, ודוגמאות שאפשר לשנות בזמן אמת.
        </p>
      </header>

      <section className="course-module-grid" aria-label="מודולי לימוד">
        <Link className="course-module-card active" href="/phase-plane">
          <span>מודול פעיל</span>
          <h2>מישור פאזה</h2>
          <p>מעבדה אינטראקטיבית למערכות ליניאריות דו־ממדיות, כולל סיווג תמונות והרכבת מטריצות.</p>
        </Link>

        <Link className="course-module-card" href="/constant-coefficients-euler">
          <span>בבנייה</span>
          <h2>משוואות במקדמים קבועים ומשוואות אוילר</h2>
          <p>שלד למודול הבא: פולינומים אופייניים, הצבות, מעבר בין צורות, ודיון ביציבות.</p>
        </Link>
      </section>
    </main>
  );
}
