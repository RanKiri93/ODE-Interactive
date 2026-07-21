import { equationDomainLatex, reconstructionBehaviorLabels } from "../constants";
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
        סדר המשוואה: <strong>{question.order}</strong>.{" "}
        {question.equationKind === "euler" ? (
          <>
            המשוואה היא משוואת אוילר, המוגדרת ב-
            <MathText math={equationDomainLatex("euler")} />.
          </>
        ) : (
          <>
            המשוואה היא משוואה ליניארית הומוגנית במקדמים קבועים, המוגדרת על כל{" "}
            <MathText math={equationDomainLatex("constant-coefficients")} />.
          </>
        )}
      </p>
      <p className="activity-hint normalization-note">
        במקרה של משוואה יחידה, יש למצוא את המשוואה המנורמלת והפולינום האופייני המנורמל המתאימים
        לנתונים.
      </p>
      <div className="section-heading">פתרונות ידועים</div>
      <ul className="reconstruction-solution-list">
        {question.givenSolutionsLatex.map((solution, index) => (
          <li key={`given-solution-${index}`}>
            <MathText block math={`y_{${index + 1}}(x)=${solution}`} />
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
