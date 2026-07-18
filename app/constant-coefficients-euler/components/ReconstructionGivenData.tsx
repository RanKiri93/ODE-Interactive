import { reconstructionBehaviorLabels } from "../constants";
import type { ReconstructionQuestion } from "../types";
import { MathText } from "./MathText";

type ReconstructionGivenDataProps = {
  question: ReconstructionQuestion;
};

export function ReconstructionGivenData({ question }: ReconstructionGivenDataProps) {
  const behaviorLabel = reconstructionBehaviorLabels[question.behaviorCondition];

  return (
    <section className="reconstruction-given-data" aria-label="נתוני השאלה">
      <p className="activity-hint">
        סדר המשוואה: <strong>{question.order}</strong>. המשוואה היא{" "}
        {question.equationKind === "euler" ? "משוואת אוילר ב-" : "משוואה במקדמים קבועים ב-"}
        <MathText math="x>0" />.
      </p>
      <p className="activity-hint normalization-note">
        במקרה של קביעה יחידה, יש למצוא את המשוואה המנורמלת שעבורה הפולינום האופייני הוא מוני.
      </p>
      <div className="section-heading">פתרונות ידועים</div>
      <ul className="reconstruction-solution-list">
        {question.givenSolutionsLatex.map((solution, index) => (
          <li key={`given-solution-${index}`}>
            <MathText math={`y_{${index + 1}}(x)=${solution}`} />
          </li>
        ))}
      </ul>
      {behaviorLabel ? (
        <p className="activity-hint reconstruction-behavior" dir="rtl">
          {behaviorLabel}{" "}
          <span className="stability-inline-math">
            <MathText math={"x\\to\\infty"} />
          </span>
          .
        </p>
      ) : null}
    </section>
  );
}
