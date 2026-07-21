import type { CoefficientFieldStatus } from "../types";
import { MathText } from "./MathText";

type EulerCoefficientEditorProps = {
  degree: number;
  coefficients: string[];
  fieldStatuses: CoefficientFieldStatus[];
  disabled?: boolean;
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

function eulerTermLabel(order: number): string {
  if (order === 0) {
    return "y";
  }
  if (order === 1) {
    return "xy'";
  }
  if (order === 2) {
    return "x^2y''";
  }
  return `x^{${order}}y^{(${order})}`;
}

export function EulerCoefficientEditor({
  degree,
  coefficients,
  fieldStatuses,
  disabled = false,
  onChange,
}: EulerCoefficientEditorProps) {
  return (
    <div className="polynomial-coefficient-editor" dir="ltr" aria-label="עורך משוואת אוילר">
      <div className="polynomial-coefficient-row">
        {Array.from({ length: degree + 1 }, (_, index) => {
          const order = degree - index;
          const coeffIndex = order;
          const status = fieldStatuses[coeffIndex] ?? "neutral";

          return (
            <div className={`polynomial-coefficient-term ${fieldClassName(status)}`} key={order}>
              <label htmlFor={`euler-coeff-${order}`}>
                <MathText size="standard" math={eulerTermLabel(order)} />
              </label>
              <input
                id={`euler-coeff-${order}`}
                inputMode="decimal"
                type="text"
                value={coefficients[coeffIndex] ?? ""}
                disabled={disabled}
                aria-invalid={status === "incorrect" || status === "invalid" || status === "empty"}
                onChange={(event) => onChange(coeffIndex, event.target.value)}
              />
              {index < degree ? <span className="polynomial-plus">+</span> : null}
            </div>
          );
        })}
        <span className="polynomial-power-label">
          <MathText size="standard" math="=0" />
        </span>
      </div>
    </div>
  );
}
