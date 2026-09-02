import { EPS } from "../constants";
import { formatAffinePolynomialLatex, formatLambdaConstraintLatex } from "../math/affinePolynomial";
import { behaviorInfinityLatex } from "../math/reconstructionBehavior";
import { formatPolynomialLatex } from "../math/polynomial";
import {
  formatAffineConstantCoefficientEquation,
  formatAffineEulerEquation,
} from "../practice/reconstructionEvaluation";
import type {
  LambdaConstraint,
  ReconstructionBehaviorCondition,
  ReconstructionQuestion,
} from "../types";
import { LambdaConstraintInput } from "./ReconstructionInputs";
import { MathText } from "./MathText";

type ReconstructionFamilyConclusionProps = {
  question: ReconstructionQuestion;
  lambdaConstraint: LambdaConstraint | null;
  disabled: boolean;
  showSummary: boolean;
  onChange: (value: LambdaConstraint) => void;
};

function hasSimpleZeroRoot(forcedRoots: ReconstructionQuestion["expectedForcedRoots"]): boolean {
  return forcedRoots.some(
    (group) => group.kind === "real" && Math.abs(group.real) < EPS && group.multiplicity === 1,
  );
}

function BehaviorConditionBanner({ behavior }: { behavior: ReconstructionBehaviorCondition }) {
  const infinityLatex = behaviorInfinityLatex(behavior);

  if (behavior === "none" || !infinityLatex) {
    return (
      <div className="reconstruction-behavior-banner" dir="rtl">
        <span>לא נתון תנאי נוסף על התנהגות הפתרונות.</span>
      </div>
    );
  }

  const prefix =
    behavior === "bounded-plus-infinity" || behavior === "bounded-minus-infinity"
      ? "נתון שכל פתרונות המשוואה חסומים כאשר"
      : "נתון שכל פתרונות המשוואה שואפים לאפס כאשר";

  return (
    <div className="reconstruction-behavior-banner" dir="rtl">
      <span>
        {prefix}{" "}
        <span className="stability-inline-math">
          <MathText math={infinityLatex} />
        </span>
        .
      </span>
    </div>
  );
}

export function ReconstructionFamilyConclusion({
  question,
  lambdaConstraint,
  disabled,
  showSummary,
  onChange,
}: ReconstructionFamilyConclusionProps) {
  if (question.analysis.kind !== "one-real-parameter") {
    return null;
  }

  const analysis = question.analysis;
  const forcedPolyLatex = formatPolynomialLatex(analysis.forcedPolynomialCoefficients, "r");
  const expandedPolyLatex = formatAffinePolynomialLatex(analysis.polynomialFamily);
  const factoredFamilyLatex = `p_\\lambda(r)=\\left(${forcedPolyLatex}\\right)(r-\\lambda)`;
  const expandedFamilyLatex = `p_\\lambda(r)=${expandedPolyLatex}`;
  const isZeroCollisionPlus =
    question.behaviorCondition === "bounded-plus-infinity" && hasSimpleZeroRoot(analysis.forcedRoots);
  const isZeroCollisionMinus =
    question.behaviorCondition === "bounded-minus-infinity" && hasSimpleZeroRoot(analysis.forcedRoots);

  return (
    <div className="reconstruction-family-stage">
      <p className="reconstruction-family-text">
        מן הפתרונות הנתונים נקבע כבר הגורם הבא של הפולינום האופייני המנורמל:
      </p>
      <div className="reconstruction-family-formula">
        <MathText block math={`q(r)=${forcedPolyLatex}`} />
      </div>
      <p className="reconstruction-family-text">
        מאחר שנותרה מעלה אחת בלבד, נותר שורש ממשי חופשי אחד. נסמן אותו ב-
        <MathText math={"\\lambda"} />. לכן:
      </p>
      <div className="reconstruction-family-formula reconstruction-family-formula-scroll">
        <MathText block math={factoredFamilyLatex} />
      </div>
      <div className="reconstruction-family-formula">
        <MathText block math={expandedFamilyLatex} />
      </div>
      <div className="reconstruction-family-formula">
        <MathText
          variant="standard"
          block
          math={
            question.equationKind === "constant-coefficients"
              ? formatAffineConstantCoefficientEquation(analysis.equationFamily)
              : formatAffineEulerEquation(analysis.equationFamily)
          }
        />
      </div>
      <BehaviorConditionBanner behavior={question.behaviorCondition} />
      <p className="reconstruction-family-question" id="lambda-constraint-question">
        מהו התחום האפשרי של השורש החסר <MathText math={"\\lambda"} />?
      </p>
      <LambdaConstraintInput
        value={lambdaConstraint}
        disabled={disabled}
        labelledBy="lambda-constraint-question"
        onChange={onChange}
      />
      <details className="intro-expansion">
        <summary>רמז</summary>
        <p>נותרה מעלה אחת בלבד בפולינום האופייני. מדוע השורש החסר אינו יכול להיות מרוכב לא־ממשי?</p>
        <p>
          שורשים מרוכבים לא־ממשיים של פולינום בעל מקדמים ממשיים מופיעים בזוגות צמודים. לכן השורש החסר
          הוא ממשי.
        </p>
        <p>
          השתמשו בנתון על התנהגות הפתרונות כדי לקבוע את תחום הערכים האפשרי של{" "}
          <MathText math={"\\lambda"} />.
        </p>
        {isZeroCollisionPlus || isZeroCollisionMinus ? (
          <p>
            בדקו מה יקרה לריבוי של השורש <MathText math={"0"} /> אם תבחרו{" "}
            <MathText math={"\\lambda=0"} />.
          </p>
        ) : null}
      </details>
      {showSummary ? (
        <div className="reconstruction-summary reconstruction-family-summary">
          <p className="intro-equation">
            <MathText block math={formatLambdaConstraintLatex(analysis.lambdaConstraint)} />
          </p>
          <p className="intro-equation">
            <MathText
              variant="standard"
              block
              math={
                question.equationKind === "constant-coefficients"
                  ? formatAffineConstantCoefficientEquation(analysis.equationFamily)
                  : formatAffineEulerEquation(analysis.equationFamily)
              }
            />
          </p>
        </div>
      ) : null}
    </div>
  );
}
