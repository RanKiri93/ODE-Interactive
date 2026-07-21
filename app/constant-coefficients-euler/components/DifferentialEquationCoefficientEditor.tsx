import type { CoefficientFieldStatus } from "../types";
import { formulaRowClassName } from "../math/mathTypography";
import { MathText } from "./MathText";

type DifferentialEquationCoefficientEditorProps = {
  degree: number;
  coefficients: string[];
  fieldStatuses: CoefficientFieldStatus[];
  disabled?: boolean;
  dependentVariable?: "u" | "y";
  ariaLabel?: string;
  hideLeadingCoefficient?: boolean;
  onChange: (index: number, value: string) => void;
};

function fieldClassName(status: CoefficientFieldStatus): string {
  switch (status) {
    case "correct":
      return "coefficient-correct";
    case "incorrect":
      return "coefficient-incorrect";
    case "empty":
      return "coefficient-empty";
    case "invalid":
      return "coefficient-invalid";
    default:
      return "";
  }
}

function derivativeLabel(order: number, dependent: "u" | "y"): string {
  if (order === 0) {
    return dependent;
  }
  if (order === 1) {
    return `${dependent}'`;
  }
  if (order === 2) {
    return `${dependent}''`;
  }
  if (order === 3) {
    return `${dependent}'''`;
  }
  return `${dependent}^{(${order})}`;
}

function derivativeAriaLabel(order: number, dependent: "u" | "y"): string {
  if (order === 0) {
    return `המקדם של ${dependent}`;
  }
  return `המקדם של ${derivativeLabel(order, dependent)}`;
}

function coefficientTooltip(order: number): string {
  return `a_{${order}}`;
}

export function DifferentialEquationCoefficientEditor({
  degree,
  coefficients,
  fieldStatuses,
  disabled = false,
  dependentVariable = "u",
  ariaLabel,
  hideLeadingCoefficient = false,
  onChange,
}: DifferentialEquationCoefficientEditorProps) {
  const terms = Array.from({ length: hideLeadingCoefficient ? degree : degree + 1 }, (_, index) => {
    const order = hideLeadingCoefficient ? degree - 1 - index : degree - index;
    const coeffIndex = order;
    const status = fieldStatuses[coeffIndex] ?? "neutral";
    const isLast = index === (hideLeadingCoefficient ? degree - 1 : degree);

    return (
      <span className={`polynomial-coefficient-term ${fieldClassName(status)}`} key={order}>
        <span className="polynomial-coefficient-input-wrap">
          <input
            id={`${dependentVariable}-coeff-${order}`}
            inputMode="decimal"
            type="text"
            className="polynomial-coefficient-input"
            value={coefficients[coeffIndex] ?? ""}
            disabled={disabled}
            aria-label={derivativeAriaLabel(order, dependentVariable)}
            aria-invalid={status === "incorrect" || status === "invalid" || status === "empty"}
            onChange={(event) => onChange(coeffIndex, event.target.value)}
          />
          <span className="polynomial-coefficient-tooltip" aria-hidden="true">
            <MathText math={coefficientTooltip(order)} />
          </span>
        </span>
        <span className="polynomial-power-label">
          <MathText math={derivativeLabel(order, dependentVariable)} />
        </span>
        {!isLast ? <span className="polynomial-plus">+</span> : null}
      </span>
    );
  });

  return (
    <div
      className="polynomial-coefficient-editor differential-equation-coefficient-editor"
      aria-label={ariaLabel ?? `עורך משוואה עבור ${dependentVariable}(t)`}
    >
      <div className="polynomial-input-scroll">
        <div className={formulaRowClassName("polynomial-input-row")} data-variant="standard" dir="ltr">
          {hideLeadingCoefficient ? (
            <span className="polynomial-coefficient-term polynomial-leading-term">
              <span className="polynomial-power-label">
                <MathText math={derivativeLabel(degree, dependentVariable)} />
              </span>
              <span className="polynomial-plus">+</span>
            </span>
          ) : null}
          {terms}
          <span className="polynomial-power-label">
            <MathText math="=0" />
          </span>
        </div>
      </div>
    </div>
  );
}
