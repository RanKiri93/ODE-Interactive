import { reconstructionBehaviorLabels } from "../constants";
import { behaviorInfinityLatex } from "../math/reconstructionBehavior";
import type { ReconstructionQuestion } from "../types";
import { MathText } from "./MathText";

type ReconstructionGivenDataProps = {
  question: ReconstructionQuestion;
};

export function ReconstructionGivenData({ question }: ReconstructionGivenDataProps) {
  const behaviorLabel = reconstructionBehaviorLabels[question.behaviorCondition];
  const behaviorInfinity = behaviorInfinityLatex(question.behaviorCondition);

  return (
    <section className="reconstruction-given-data" aria-label="נתוני השאלה">
      <p className="activity-hint">
        סדר המשוואה: <strong>{question.order}</strong>. המשוואה היא{" "}
        {question.equationKind === "euler" ? "משוואת אוילר ב-" : "משוואה במקדמים קבועים ב-"}
        <MathText math="x>0" />.
      </p>
      <p className="activity-hint normalization-note">
        במקרה של משוואה יחידה, יש למצוא את המשוואה המנורמלת והפולינום האופייני המנורמל המתאימים
        לנתונים.
      </p>
      <div className="section-heading">פתרונות ידועים</div>
      <ul className="reconstruction-solution-list">
        {question.givenSolutionsLatex.map((solution, index) => (
          <li key={`given-solution-${index}`}>
            <MathText math={`y_{${index + 1}}(x)=${solution}`} />
          </li>
        ))}
      </ul>
      {behaviorLabel && behaviorInfinity ? (
        <p className="activity-hint reconstruction-behavior" dir="rtl">
          {behaviorLabel}{" "}
          <span className="stability-inline-math">
            <MathText math={behaviorInfinity} />
          </span>
          .
        </p>
      ) : null}
    </section>
  );
}
