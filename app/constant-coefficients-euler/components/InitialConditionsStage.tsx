import { formatInitialConditionSystemLatex } from "../math/initialConditions";
import {
  formatCombinedSolutionLatex,
  formatGeneralSolutionLatex,
  formatInitialValueLatex,
  formatOrderedBasisBraceLatex,
} from "../practice/initialConditionEvaluation";
import type { InitialCoefficientEvaluationResult, InitialConditionData } from "../types";
import { InitialCoefficientEditor } from "./InitialCoefficientEditor";
import { MathText } from "./MathText";

type InitialConditionsStageProps = {
  data: InitialConditionData;
  coefficients: string[];
  fieldStatuses: Array<"neutral" | "empty" | "invalid" | "correct" | "incorrect">;
  evaluationResult: InitialCoefficientEvaluationResult | null;
  disabled: boolean;
  revealed: boolean;
  onChange: (index: number, value: string) => void;
  onCheck: () => void;
  onReveal: () => void;
};

function InitialStageMathRow({ math }: { math: string }) {
  return (
    <div className="initial-math-scroll">
      <div className="initial-math-row initial-stage-math">
        <MathText math={math} />
      </div>
    </div>
  );
}

export function InitialConditionsStage({
  data,
  coefficients,
  fieldStatuses,
  evaluationResult,
  disabled,
  revealed,
  onChange,
  onCheck,
  onReveal,
}: InitialConditionsStageProps) {
  const systemEquations = formatInitialConditionSystemLatex(data.derivativeMatrix, data.initialValues);
  const showSolution = revealed || evaluationResult?.isCorrect || false;

  return (
    <>
      <p className="activity-hint">
        מצאו את המקדמים <MathText math="c_1,\ldots,c_n" /> של הפתרון המקיים את תנאי ההתחלה.
      </p>

      <section className="initial-condition-block" aria-label="בסיס מסודר">
        <div className="section-heading">הבסיס המסודר</div>
        <InitialStageMathRow math={formatOrderedBasisBraceLatex(data.orderedBasis)} />
      </section>

      <section className="initial-condition-block" aria-label="פתרון כללי">
        <div className="section-heading">הפתרון הכללי</div>
        <InitialStageMathRow math={`y(x)=${formatGeneralSolutionLatex(data.orderedBasis)}`} />
      </section>

      <section className="initial-condition-block" aria-label="תנאי התחלה">
        <div className="section-heading">תנאי ההתחלה</div>
        <div className="initial-condition-list">
          {data.initialValues.map((value, index) => (
            <span className="initial-condition-item" key={`initial-value-${index}`}>
              <MathText math={formatInitialValueLatex(index, value)} />
            </span>
          ))}
        </div>
      </section>

      <InitialCoefficientEditor
        count={data.orderedBasis.length}
        coefficients={coefficients}
        fieldStatuses={fieldStatuses}
        disabled={disabled}
        onChange={onChange}
      />

      <details className="intro-expansion">
        <summary>רמז</summary>
        <p>
          הציבו את <MathText math="x=0" /> בפתרון הכללי ובנגזרותיו.
        </p>
        <p className="intro-equation">
          <MathText math={"y^{(k)}(0)=\\sum_{j=1}^n c_jy_j^{(k)}(0)"} />
        </p>
      </details>

      <details className="intro-expansion">
        <summary>רמז חזק: מערכת ליניארית</summary>
        <p className="intro-equation">
          <MathText math="Mc=d" />
        </p>
        {systemEquations.map((equation, index) => (
          <p className="intro-equation" key={`system-equation-${index}`}>
            <MathText math={equation} />
          </p>
        ))}
      </details>

      {evaluationResult && !evaluationResult.isCorrect ? (
        <p className="stage-feedback">{evaluationResult.message}</p>
      ) : null}
      {evaluationResult?.isCorrect ? <p className="stage-success">{evaluationResult.message}</p> : null}

      {showSolution ? (
        <div className="initial-condition-summary">
          <p className="activity-hint">הפתרון היחיד של בעיית ההתחלה:</p>
          <InitialStageMathRow
            math={`y(x)=${formatCombinedSolutionLatex(data.orderedBasis, data.expectedCoefficients)}`}
          />
        </div>
      ) : null}

      <div className="practice-actions">
        <button type="button" className="panel-action" disabled={disabled} onClick={onCheck}>
          בדיקת מקדמים
        </button>
        <button type="button" className="panel-action secondary" disabled={disabled} onClick={onReveal}>
          הצג תשובה לשלב
        </button>
      </div>
    </>
  );
}
