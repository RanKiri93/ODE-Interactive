import {
  lambdaConstraintOptions,
  reconstructionDeterminationOptions,
  reconstructionFeasibilityOptions,
  reconstructionImpossibleReasonOptions,
} from "../constants";
import type {
  LambdaConstraint,
  ReconstructionDetermination,
  ReconstructionFeasibilityAnswer,
  ReconstructionImpossibleReason,
} from "../types";
import { MathText } from "./MathText";

type RadioCardProps = {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  title: string;
  description?: string;
  latex?: string;
};

function RadioCard({
  name,
  value,
  checked,
  disabled = false,
  onChange,
  title,
  description,
  latex,
}: RadioCardProps) {
  return (
    <label className={`stability-option-card${checked ? " is-selected" : ""}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <div className="stability-option-content">
        <div className="stability-option-title">{title}</div>
        {description ? <div className="stability-option-description">{description}</div> : null}
        {latex ? (
          <span className="reconstruction-radio-latex">
            <MathText math={latex} />
          </span>
        ) : null}
      </div>
    </label>
  );
}

export function ReconstructionFeasibilityInput({
  value,
  disabled,
  onChange,
}: {
  value: ReconstructionFeasibilityAnswer | null;
  disabled?: boolean;
  onChange: (value: ReconstructionFeasibilityAnswer) => void;
}) {
  return (
    <fieldset className="stability-fieldset">
      <legend>האם קיימת לפחות משוואה אחת המתאימה לכל הנתונים?</legend>
      <div className="stability-option-list" role="radiogroup" aria-label="היתכנות הנתונים">
        {reconstructionFeasibilityOptions.map((option) => (
          <RadioCard
            key={option.value}
            name="reconstruction-feasibility"
            value={option.value}
            checked={value === option.value}
            disabled={disabled}
            onChange={() => onChange(option.value)}
            title={option.label}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function ReconstructionDeterminationInput({
  value,
  disabled,
  onChange,
}: {
  value: ReconstructionDetermination | null;
  disabled?: boolean;
  onChange: (value: ReconstructionDetermination) => void;
}) {
  return (
    <fieldset className="stability-fieldset">
      <legend>יחידות המשוואה</legend>
      <div className="stability-option-list" role="radiogroup" aria-label="יחידות המשוואה">
        {reconstructionDeterminationOptions.map((option) => (
          <RadioCard
            key={option.value}
            name="reconstruction-determination"
            value={option.value}
            checked={value === option.value}
            disabled={disabled}
            onChange={() => onChange(option.value)}
            title={option.label}
            description={option.description}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function LambdaConstraintInput({
  value,
  disabled,
  labelledBy,
  onChange,
}: {
  value: LambdaConstraint | null;
  disabled?: boolean;
  labelledBy?: string;
  onChange: (value: LambdaConstraint) => void;
}) {
  return (
    <div
      className="lambda-option-list"
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : "תחום הערכים של השורש החסר"}
    >
      {lambdaConstraintOptions.map((option) => (
        <label
          key={option.value}
          className={`lambda-option-card ${value === option.value ? "is-selected" : ""}`}
        >
          <input
            type="radio"
            name="lambda-constraint"
            value={option.value}
            checked={value === option.value}
            disabled={disabled}
            onChange={() => onChange(option.value)}
          />
          <div className="lambda-option-content">
            <div className="lambda-option-title">{option.label}</div>
            <span className="lambda-option-math">
              <MathText math={option.latex} />
            </span>
          </div>
        </label>
      ))}
    </div>
  );
}

export function ReconstructionImpossibleReasonInput({
  value,
  disabled,
  onChange,
}: {
  value: ReconstructionImpossibleReason | null;
  disabled?: boolean;
  onChange: (value: ReconstructionImpossibleReason) => void;
}) {
  return (
    <fieldset className="stability-fieldset">
      <legend>מהי הסיבה לכך שלא קיימת משוואה המתאימה לכל הנתונים?</legend>
      <div className="stability-option-list" role="radiogroup" aria-label="סיבת הסתירה">
        {reconstructionImpossibleReasonOptions.map((option) => (
          <label
            key={option.value}
            className={`stability-option-card${value === option.value ? " is-selected" : ""}`}
          >
            <input
              type="radio"
              name="reconstruction-impossible-reason"
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
            />
            <div className="stability-option-content">
              <div className="stability-option-title" dir="rtl">
                {option.label}
                {option.latex ? (
                  <>
                    {" "}
                    <span className="stability-inline-math">
                      <MathText math={option.latex} />
                    </span>
                  </>
                ) : null}
                {option.suffix ?? null}
              </div>
            </div>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
