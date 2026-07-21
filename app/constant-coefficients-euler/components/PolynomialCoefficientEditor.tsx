import type { CoefficientFieldStatus } from "../types";
import { formulaRowClassName } from "../math/mathTypography";
import { MathText } from "./MathText";

type PolynomialCoefficientEditorProps = {
  degree: number;
  coefficients: string[];
  fieldStatuses: CoefficientFieldStatus[];
  disabled?: boolean;
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

function coefficientAriaLabel(power: number): string {
  return `המקדם a_${power}`;
}

function coefficientTooltip(power: number): string {
  return `a_{${power}}`;
}

export function PolynomialCoefficientEditor({
  degree,
  coefficients,
  fieldStatuses,
  disabled = false,
  hideLeadingCoefficient = false,
  onChange,
}: PolynomialCoefficientEditorProps) {
  const terms = Array.from({ length: hideLeadingCoefficient ? degree : degree + 1 }, (_, index) => {
    const power = hideLeadingCoefficient ? degree - 1 - index : degree - index;
    const coeffIndex = power;
    const status = fieldStatuses[coeffIndex] ?? "neutral";
    const isLast = index === (hideLeadingCoefficient ? degree - 1 : degree);

    return (
      <span className={`polynomial-coefficient-term ${fieldClassName(status)}`} key={power}>
        <span className="polynomial-coefficient-input-wrap">
          <input
            id={`poly-coeff-${power}`}
            inputMode="decimal"
            type="text"
            className="polynomial-coefficient-input"
            value={coefficients[coeffIndex] ?? ""}
            disabled={disabled}
            aria-label={coefficientAriaLabel(power)}
            aria-invalid={status === "incorrect" || status === "invalid" || status === "empty"}
            onChange={(event) => onChange(coeffIndex, event.target.value)}
          />
          <span className="polynomial-coefficient-tooltip" aria-hidden="true">
            <MathText math={coefficientTooltip(power)} />
          </span>
        </span>
        {power > 0 ? (
          <span className="polynomial-power-label">
            <MathText math={power === 1 ? "r" : `r^{${power}}`} />
          </span>
        ) : null}
        {!isLast ? <span className="polynomial-plus">+</span> : null}
      </span>
    );
  });

  return (
    <div className="polynomial-coefficient-editor" aria-label="עורך פולינום אופייני">
      <div className="polynomial-input-scroll">
        <div className={formulaRowClassName("polynomial-input-row")} data-variant="standard" dir="ltr">
          <span className="polynomial-editor-heading">
            <MathText math="p(r)=" />
          </span>
          {hideLeadingCoefficient ? (
            <>
              <span className="polynomial-coefficient-term polynomial-leading-term">
                <span className="polynomial-power-label">
                  <MathText math={degree === 1 ? "r" : `r^{${degree}}`} />
                </span>
                <span className="polynomial-plus">+</span>
              </span>
            </>
          ) : null}
          {terms}
        </div>
      </div>
    </div>
  );
}
