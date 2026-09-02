import {

  stabilityClassificationExplanation,

  stabilityClassificationOptions,

  stabilityReasonExplanation,

  stabilityReasonOptions,

} from "../constants";

import { formatRootGroupHintParts } from "../math/basis";

import type {

  EquationKind,

  SolutionRootGroup,

  StabilityAnswerInput,

  StabilityEvaluationResult,

} from "../types";

import { MathText } from "./MathText";



type StabilityStageProps = {

  equationKind: EquationKind;

  roots: SolutionRootGroup[];

  value: StabilityAnswerInput;

  evaluationResult: StabilityEvaluationResult | null;

  disabled: boolean;

  revealed: boolean;

  onChange: (value: StabilityAnswerInput) => void;

  onCheck: () => void;

  onReveal: () => void;

};



export function formatStabilityExplanation(analysis: {

  classification: StabilityEvaluationResult["expected"]["classification"];

  reason: StabilityEvaluationResult["expected"]["reason"];

}): string {

  return `המשוואה ${stabilityClassificationExplanation[analysis.classification]}, משום ש${stabilityReasonExplanation[analysis.reason]}.`;

}



export function StabilityStage({

  equationKind,

  roots,

  value,

  evaluationResult,

  disabled,

  revealed,

  onChange,

  onCheck,

  onReveal,

}: StabilityStageProps) {

  const limitLabel = equationKind === "euler" ? "x\\to\\infty" : "x\\to\\infty";



  return (

    <div className="stability-stage-body">

      <p className="activity-hint stability-stage-instruction" dir="rtl">
        סווגו את התנהגות כל הפתרונות כאשר{" "}
        <span className="stability-inline-math">
          <MathText math={limitLabel} />
        </span>
        .
      </p>

      {equationKind === "euler" ? (
        <p className="activity-hint stability-stage-euler-note" dir="rtl">
          בהצבה{" "}
          <span className="stability-inline-math">
            <MathText math={"t=\\ln x"} />
          </span>
          , זה שקול ל-
          <span className="stability-inline-math">
            <MathText math={"t\\to\\infty"} />
          </span>
          .
        </p>
      ) : null}



      <section className="stability-root-summary" aria-label="סיכום שורשים">

        <div className="section-heading">השורשים שמצאתם:</div>

        <div className="stability-roots-summary">

          {roots.map((group, index) => {
            const parts = formatRootGroupHintParts(group);
            return (
              <span className="stability-root-item" key={`stability-root-${index}`}>
            <MathText variant="compact" math={parts.math} />
                {parts.suffix ? <span className="stability-root-suffix">{parts.suffix}</span> : null}
              </span>
            );
          })}

        </div>

      </section>



      <section className="stability-choice-section" aria-labelledby="stability-classification-heading">

        <h4 className="stability-section-title" id="stability-classification-heading">

          1. סיווג ההתנהגות

        </h4>

        <div

          className="stability-classification-grid"

          role="radiogroup"

          aria-label="סיווג יציבות"

        >

          {stabilityClassificationOptions.map((option) => {

            const selected = value.classification === option.value;

            return (

              <label

                key={option.value}

                className={`stability-option-card${selected ? " is-selected" : ""}`}

              >

                <input

                  type="radio"

                  name="stability-classification"

                  value={option.value}

                  checked={selected}

                  disabled={disabled || revealed}

                  onChange={() => onChange({ ...value, classification: option.value })}

                />

                <div className="stability-option-content">

                  <div className="stability-option-title">{option.label}</div>

                  <div className="stability-option-description">{option.description}</div>

                </div>

              </label>

            );

          })}

        </div>

      </section>



      <section className="stability-choice-section" aria-labelledby="stability-reason-heading">

        <h4 className="stability-section-title" id="stability-reason-heading">

          2. הנימוק הספקטרלי

        </h4>

        <div className="stability-reason-grid" role="radiogroup" aria-label="נימוק יציבות">

          {stabilityReasonOptions.map((option) => {

            const selected = value.reason === option.value;

            return (

              <label

                key={option.value}

                className={`stability-option-card stability-option-card-reason${selected ? " is-selected" : ""}`}

              >

                <input

                  type="radio"

                  name="stability-reason"

                  value={option.value}

                  checked={selected}

                  disabled={disabled || revealed}

                  onChange={() => onChange({ ...value, reason: option.value })}

                />

                <div className="stability-option-content">

                  <div className="stability-option-description">{option.label}</div>

                </div>

              </label>

            );

          })}

        </div>

      </section>



      <details className="intro-expansion">

        <summary>רמז: חלקים ממשיים של שורשים</summary>

        <div className="stability-hint-conditions">
          <p className="stability-hint-line" dir="rtl">
            דעיכה כאשר <MathText math={"\\operatorname{Re}(r)<0"} />.
          </p>
          <p className="stability-hint-line" dir="rtl">
            גדילה כאשר <MathText math={"\\operatorname{Re}(r)>0"} />.
          </p>
        </div>

        <p>שורשים על הציר המדומה דורשים בדיקת ריבוי.</p>

      </details>



      <details className="intro-expansion">

        <summary>רמז: ריבוי על הציר המדומה</summary>

        {equationKind === "constant-coefficients" ? (

          <p>

            <MathText math={"x^ke^{i\\beta x}"} /> אינו חסום כאשר <MathText math={"k\\ge 1"} />.

          </p>

        ) : (

          <p>

            <MathText math={"(\\ln x)^kx^{i\\beta}"} /> אינו חסום כאשר <MathText math={"x\\to\\infty"} /> ו-<MathText math={"k\\ge 1"} />.

          </p>

        )}

      </details>



      {revealed && evaluationResult ? (

        <p className="stage-success">{formatStabilityExplanation(evaluationResult.expected)}</p>

      ) : null}



      {evaluationResult && !evaluationResult.isCorrect && !revealed ? (

        <p className="stage-feedback">{evaluationResult.message}</p>

      ) : null}



      {evaluationResult?.isCorrect ? <p className="stage-success">{evaluationResult.message}</p> : null}



      <div className="practice-actions">

        <button type="button" className="panel-action" disabled={disabled || revealed} onClick={onCheck}>

          בדיקת היציבות

        </button>

        <button type="button" className="panel-action secondary" disabled={disabled || revealed} onClick={onReveal}>

          הצג תשובה לשלב

        </button>

      </div>

    </div>

  );

}


