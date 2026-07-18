import { MathText } from "./MathText";

export function ConstantCoefficientsEulerIntro() {
  return (
    <div className="module-intro-page" aria-label="מבוא למשוואות במקדמים קבועים ומשוואות אוילר">
      <article className="module-intro-card video-placeholder module-intro-video">
        <div className="section-heading">מקום לסרטון</div>
        <div className="embedded-placeholder">
          <span>Embedded video</span>
          <strong>יתווסף בהמשך</strong>
        </div>
      </article>

      <article className="module-intro-card module-intro-content" aria-label="מודול לימודי">
        <p className="course-kicker">מודול לימודי</p>
        <h2>משוואות במקדמים קבועים ומשוואות אוילר</h2>
        <p>
          במודול זה נדון במשוואות ליניאריות הומוגניות במקדמים קבועים, ובמשוואות אוילר שניתן להמיר אליהן. נציג
          את השיטות המרכזיות לבניית בסיס למרחב הפתרונות, ואת קריטריונים ליציבות וליציבות אסימפטוטית. בלשוניות
          המצורפות מוצגים פירוטים תיאורטיים לכל אחד מסוגי המשוואות.
        </p>

        <div className="intro-expansion-list">
          <details className="intro-expansion">
            <summary>משוואה במקדמים קבועים</summary>
            <div className="intro-expansion-body">
              <p>
                <strong>הגדרה.</strong> משוואה ליניארית מסדר <MathText math="n" /> במקדמים קבועים היא משוואה מהצורה
              </p>
              <p className="intro-equation">
                <MathText math="a_ny^{(n)}+a_{n-1}y^{(n-1)}+\dots+a_1y'+a_0y=f(x)" />
              </p>
              <p>
                כאשר <MathText math="a_0,\dots,a_n\in\mathbb{R}" /> וכאשר <MathText math="a_n\neq 0" />. במידה
                ו-<MathText math="f(x)=0" /> המשוואה הומוגנית ואחרת אי-הומוגנית.
              </p>
              <p>
                אנחנו נדון במשוואה ההומוגנית בלבד, אך בפרק נפרד תטופל גם המשוואה האי-הומוגנית. מתברר, שלמשוואה
                ההומוגנית קיימת שיטת פתרון שממירה את הבעיה הדיפרנציאלית לבעיה אלגברית של מציאת שורשי פולינומים.
              </p>
              <p>
                ראשית, נדגיש כי המשוואה מקיימת את כל תנאי משפט הקיום והיחידות למשוואות ליניאריות בכל{" "}
                <MathText math="\mathbb{R}" />. כלומר, לכל תנאי התחלה קיים פתרון של המשוואה שמוגדר בכל{" "}
                <MathText math="\mathbb{R}" />. יתרה מכך, אוסף כל הפתרונות של המשוואה הוא מרחב וקטורי מממד{" "}
                <MathText math="n" />, כך שקיימת קבוצה <MathText math="\{y_1,\dots,y_n\}" /> של פתרונות בת{'"'}ל
                הפורשים את מרחב הפתרונות של המשוואה.
              </p>
              <p>ההמרה לבעיה האלגברית מתחילה עם הפולינום היחודי הבא:</p>
              <p>
                <strong>הגדרה (פולינום אופייני).</strong> תהא{" "}
                <MathText math="a_ny^{(n)}+\dots+a_0y=0" /> משוואה ליניארית הומוגנית במקדמים קבועים. הפולינום
              </p>
              <p className="intro-equation">
                <MathText math="p(r)=a_nr^n+a_{n-1}r^{n-1}+\dots+a_1r+a_0" />
              </p>
              <p>
                כאשר המקדמים הם המקדמים שמופיעים במד״ר, מכונה הפולינום האופייני של המשוואה.
              </p>
              <p>
                על פי המשפט היסודי של האלגברה, לכל פולינום ממעלה <MathText math="n" /> קיימים בדיוק{" "}
                <MathText math="n" /> שורשים, חלקם אולי מרוכבים, וחלקם אולי בעלי ריבוי. מתברר כי כל שורש כזה
                (כולל הריבוי שלו), מספק פתרון מתאים למד״ר, כך שבסה״כ יתקבלו <MathText math="n" /> פתרונות בלתי
                תלויים ונוכל לכתוב את הפתרון הכללי של המשוואה.
              </p>
              <p>
                נניח אם כן שמצאנו את כל השורשים <MathText math="r_1,\dots,r_k" /> של המשוואה עם ריבויים{" "}
                <MathText math="m_1,\dots,m_k" />. נוכל לבנות בסיס למרחב הפתרונות על פי האלגוריתם הבא:
              </p>

              <div className="intro-sub-expansion-list">
                <details className="intro-sub-expansion">
                  <summary>המקרה הממשי</summary>
                  <div className="intro-sub-expansion-body">
                    <div className="intro-claim">
                      <p>
                        <strong>טענה (שורש ממשי).</strong> נניח כי <MathText math="r\in\mathbb{R}" /> הוא שורש
                        ממשי של הפולינום האופייני מריבוי <MathText math="k" />. אזי, הקבוצה
                      </p>
                      <p className="intro-equation">
                        <MathText math="\{e^{rx},xe^{rx},\dots,x^{k-1}e^{rx}\}" />
                      </p>
                      <p>היא קבוצה של <MathText math="k" /> פתרונות בלתי תלויים למד״ר.</p>
                    </div>
                  </div>
                </details>

                <details className="intro-sub-expansion">
                  <summary>המקרה המרוכב</summary>
                  <div className="intro-sub-expansion-body">
                    <div className="intro-claim">
                      <p>
                        <strong>טענה (שורש מרוכב).</strong> נניח כי <MathText math="r=\alpha+i\beta\in\mathbb{C}" />{" "}
                        שורש מרוכב של הפולינום האופייני מריבוי <MathText math="k" /> שאינו ממשי (
                        <MathText math="\beta\neq 0" />
                        ). אזי, גם <MathText math="\bar{r}=\alpha-i\beta" /> יהיה שורש של הפולינום האופייני
                        מריבוי <MathText math="k" />. בנוסף, הקבוצה
                      </p>
                      <p className="intro-equation">
                        <MathText math="\{e^{rx},xe^{rx},\dots,x^{k-1}e^{rx},e^{\bar{r}x},xe^{\bar{r}x},\dots,x^{k-1}e^{\bar{r}x}\}" />
                      </p>
                      <p>
                        היא קבוצה של <MathText math="2k" /> פתרונות בלתי תלויים למד״ר.
                      </p>
                    </div>
                    <p>
                      שימו לב שהפתרונות שמקבלים בטענה הם פונקציות מרוכבות. כדי להמנע משימוש בפונקציות מרוכבות,
                      ניעזר בכך שהמשוואה ליניארית ולכן קומבינציה ליניארית של פתרונות גם היא פתרון. נבצע החלפת
                      בסיס
                    </p>
                    <p className="intro-equation">
                      <MathText math="\{x^me^{rx},x^me^{\bar{r}x}\}\mapsto\left\{\frac{x^me^{rx}+x^me^{\bar{r}x}}{2},\frac{x^me^{rx}-x^me^{\bar{r}x}}{2i}\right\}=\left\{x^me^{\alpha x}\cos(\beta x),x^me^{\alpha x}\sin(\beta x)\right\}" />
                    </p>
                    <p>
                      ונקבל בסיס חדש שמורכב מפונקציות ממשיות (לאחר שנבצע את ההחלפה לכל{" "}
                      <MathText math="m=0,1,\dots,k-1" />
                      ). כלומר, נקבל את הבסיס
                    </p>
                    <p className="intro-equation">
                      <MathText math="\begin{cases} e^{\alpha x}\cos(\beta x),\,xe^{\alpha x}\cos(\beta x),\,\dots,\,x^{k-1}e^{\alpha x}\cos(\beta x) \\ e^{\alpha x}\sin(\beta x),\,xe^{\alpha x}\sin(\beta x),\,\dots,\,x^{k-1}e^{\alpha x}\sin(\beta x)\end{cases}" />
                    </p>
                  </div>
                </details>
              </div>
            </div>
          </details>

          <details className="intro-expansion">
            <summary>משוואות אוילר</summary>
            <div className="intro-expansion-body">
              <p>
                משוואת אוילר מסדר <MathText math="n" /> היא משוואה מהצורה
              </p>
              <p className="intro-equation">
                <MathText math="a_nx^ny^{(n)}+a_{n-1}x^{n-1}y^{(n-1)}+\dots+a_1xy'+a_0y=f(x)" />
              </p>
              <p>
                כאשר <MathText math="a_0,\dots,a_n\in\mathbb{R}" /> וכאשר <MathText math="a_n\neq 0" />. במידה
                ו-<MathText math="f(x)=0" /> המשוואה הומוגנית ואחרת אי-הומוגנית.
              </p>
              <p>
                גם כאן נדון תחילה במשוואה ההומוגנית בלבד, אך בפרק נפרד תטופל גם המשוואה האי-הומוגנית. שימו לב
                שכאשר <MathText math="x=0" />, לא מתקיימים תנאי משפט הקיום והיחידות, ולכן השיטה הכללית לפתרון
                המשוואה תהיה עבור הקרן <MathText math="(0,\infty)" /> או <MathText math="(-\infty,0)" />.
                בתחומים אלה מתקיימים תנאי משפט הקיום והיחידות, ולכן לכל תנאי התחלה בתחום זה קיים פתרון יחיד
                המוגדר בכל התחום. בנוסף, מרחב הפתרונות של המשוואה בכל אחד מהתחומים הוא מרחב וקטורי מממד{" "}
                <MathText math="n" />, כך שקיימת קבוצה <MathText math="\{y_1,\dots,y_n\}" /> של פתרונות בת{'"'}ל
                הפורשים את מרחב הפתרונות של המשוואה.
              </p>
              <p>
                כדי למצוא את הפתרונות נתחיל בתחום <MathText math="x>0" />, וניעזר במשפט הבא:
              </p>

              <div className="intro-claim">
                <p>
                  <strong>משפט (המרת משוואת אוילר למשוואה במקדמים קבועים).</strong>{" "}
                  <MathText math="y(x)" /> פתרון למשוואת אוילר
                </p>
                <p className="intro-equation">
                  <MathText math="a_nx^ny^{(n)}+a_{n-1}x^{n-1}y^{(n-1)}+\dots+a_1xy'+a_0y=f(x)" />
                </p>
                <p>
                  בקרן <MathText math="(0,\infty)" />. אם ורק אם הפונקציה <MathText math="u(t):=y(e^t)" /> היא
                  פתרון למשוואה במקדמים קבועים
                </p>
                <p className="intro-equation">
                  <MathText math="b_nu^{(n)}+b_{n-1}u^{(n-1)}+\dots+b_1u'+b_0u=f(e^t)" />
                </p>
                <p>
                  כאשר <MathText math="b_0,\dots,b_n\in\mathbb{R}" /> הם המקדמים של הפולינום:
                </p>
                <p className="intro-equation">
                  <MathText math="p(r)=a_nr(r-1)\dots(r-n+1)+a_{n-1}r(r-1)\dots(r-n+2)+\dots+a_1r+a_0=b_nr^n+\dots+b_0" />
                </p>
              </div>

              <p>
                כלומר, במקום לפתור את משוואת אוילר, נכתוב את הפולינום האופייני היחודי שמופיע במשפט, נפתור את
                המשוואה המתאימה במקדמים קבועים (על פי השיטה לעיל), ולאחר מכן נוכל לחזור לפתרון המקורי על ידי
                ההצבה
              </p>
              <p className="intro-equation">
                <MathText math="y(x)=u\left(\ln(x)\right)" />
              </p>
              <p>
                <strong>שימו לב!</strong> שיטה זו תקפה גם למשוואה האי-הומוגנית, אך בפרט, למשוואה ההומוגנית.
              </p>
              <p>
                היות ולפולינום <MathText math="p(r)" /> היחודי של משוואת אוילר יש גם כן <MathText math="n" />{" "}
                שורשים עד כדי ריבוי מעל המרוכבים, ניתן להרכיב בצורה זאת בסיס למרחב הפתרונות של המשוואה
                ההומוגנית לפי האלגוריתם הבא:
              </p>

              <div className="intro-sub-expansion-list">
                <details className="intro-sub-expansion">
                  <summary>המקרה הממשי</summary>
                  <div className="intro-sub-expansion-body">
                    <div className="intro-claim">
                      <p>
                        <strong>טענה (שורש ממשי).</strong> נניח כי <MathText math="r\in\mathbb{R}" /> הוא שורש
                        ממשי של הפולינום האופייני מריבוי <MathText math="k" />. אזי, הקבוצה
                      </p>
                      <p className="intro-equation">
                        <MathText math="\{e^{rt},te^{rt},\dots,t^{k-1}e^{rt}\}" />
                      </p>
                      <p>
                        היא קבוצה של <MathText math="k" /> פתרונות בת{'"'}ל למשוואה המתאימה ל-<MathText math="u(t)" />.
                        בזכות ההצבה <MathText math="y(x)=u(\ln(x))" />, מקבלים כי הקבוצה
                      </p>
                      <p className="intro-equation">
                        <MathText math="\{x^r,\ln(x)x^r,\dots,\ln^{k-1}(x)x^r\}" />
                      </p>
                      <p>
                        היא קבוצה של <MathText math="k" /> פתרונות בת{'"'}ל למשוואה המתאימה ל-<MathText math="y(x)" />.
                      </p>
                    </div>
                  </div>
                </details>

                <details className="intro-sub-expansion">
                  <summary>המקרה המרוכב</summary>
                  <div className="intro-sub-expansion-body">
                    <div className="intro-claim">
                      <p>
                        <strong>טענה (שורש מרוכב).</strong> נניח כי <MathText math="r=\alpha+i\beta\in\mathbb{C}" />{" "}
                        שורש מרוכב ולא ממשי של הפולינום האופייני מריבוי <MathText math="k" />. אזי, גם{" "}
                        <MathText math="\bar{r}=\alpha-i\beta" /> יהיה שורש של הפולינום האופייני מריבוי{" "}
                        <MathText math="k" />. בנוסף, הקבוצה
                      </p>
                      <p className="intro-equation">
                        <MathText math="\begin{cases} e^{\alpha t}\cos(\beta t),te^{\alpha t}\cos(\beta t),\dots,t^{k-1}e^{\alpha t}\cos(\beta t) \\ e^{\alpha t}\sin(\beta t),te^{\alpha t}\sin(\beta t),\dots,t^{k-1}e^{\alpha t}\sin(\beta t) \end{cases}" />
                      </p>
                      <p>
                        היא קבוצה של <MathText math="2k" /> פתרונות בת{'"'}ל למשוואה המתאימה ל-<MathText math="u(t)" />.
                        ובזכות ההצבה <MathText math="y(x)=u(\ln(x))" /> מקבלים כי הקבוצה
                      </p>
                      <p className="intro-equation">
                        <MathText math="\begin{cases} x^{\alpha}\cos(\beta\ln(x)),\,\ln(x)x^{\alpha}\cos(\beta\ln(x)),\dots,\,\ln^{k-1}(x)x^{\alpha}\cos(\beta\ln(x)) \\ x^{\alpha}\sin(\beta\ln(x)),\,\ln(x)x^{\alpha}\sin(\beta\ln(x)),\dots,\,\ln^{k-1}(x)x^{\alpha}\sin(\beta\ln(x)) \end{cases}" />
                      </p>
                      <p>
                        היא קבוצה של <MathText math="2k" /> פתרונות בת{'"'}ל למשוואה המתאימה ל-<MathText math="y(x)" />.
                      </p>
                    </div>
                  </div>
                </details>
              </div>
              <p>
                <strong>שימו לב!</strong> כדי למצוא את הפתרונות למשוואה בקרן <MathText math="(-\infty,0)" />,
                נשתמש במשפחת הפתרונות של הקרן החיובית ונחליף <MathText math="x\mapsto -x" />. במילים אחרות,{" "}
                <MathText math="y(x)" /> הוא פתרון של משוואת אוילר בקרן <MathText math="(0,\infty)" /> אם ורק אם{" "}
                <MathText math="y(-x)" /> פתרון של משוואת אוילר בקרן <MathText math="(-\infty,0)" />.
              </p>
            </div>
          </details>

          <details className="intro-expansion">
            <summary>יציבות הפתרונות</summary>
            <div className="intro-expansion-body">
              <p>
                משוואות במקדמים קבועים ומשוואות אוילר הן משוואת ליניארית שבתחום הגדרתן מקיימות את כל תנאי משפט
                הקיום והיחידות. אי לכך, כאשר מנסים לדון בשאלת יציבות הפתרונות, נשתמש בכך שכדי לאפיין את יציבות
                הפתרונות מספיק לבחון את הבסיס של מרחב הפתרונות (חסום, שואף לאפס וכו&apos;). מקבלים את התוצאה
                הבאה שמאפיינת את יציבות הפתרונות כתלות בשורשי הפולינום האופייני:
              </p>

              <div className="intro-claim">
                <p>
                  <strong>טענה (יציבות פתרונות).</strong> יהא <MathText math="p(r)" /> פולינום אופייני של משוואה
                  במקדמים קבועים/אוילר. אזי:
                </p>
                <ol className="intro-numbered-list">
                  <li>
                    פתרונות המשוואה כולם יציבים אסימפטוטית כאשר <MathText math="x\to\infty" />, אם לכל שורש{" "}
                    <MathText math="r" /> של הפולינום האופייני מתקיים <MathText math="\mathfrak{Re}(r)<0" />.
                  </li>
                  <li>
                    פתרונות המשוואה כולם יציבים כאשר <MathText math="x\to\infty" />, אם לכל שורש{" "}
                    <MathText math="r" /> של הפולינום האופייני מתקיים <MathText math="\mathfrak{Re}(r)<0" /> או{" "}
                    <MathText math="\mathfrak{Re}(r)=0" />, אך במקרה זה הריבוי הוא <MathText math="1" /> לכל
                    היותר.
                  </li>
                </ol>
              </div>

              <p>
                כדי לחקור יציבות של פתרונות כאשר <MathText math="x\to-\infty" />, נהפוך את אי-השוויון שמופיע
                בטענה.
              </p>
            </div>
          </details>
        </div>
      </article>
    </div>
  );
}
