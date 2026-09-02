import type { CoefficientFieldStatus } from "../types";
import { MathText } from "./MathText";

type InitialCoefficientEditorProps = {
  count: number;
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

export function InitialCoefficientEditor({
  count,
  coefficients,
  fieldStatuses,
  disabled = false,
  onChange,
}: InitialCoefficientEditorProps) {
  return (
    <div className="initial-coefficient-grid" role="group" aria-label="מקדמי הפתרון">
      {Array.from({ length: count }, (_, index) => (
        <label key={`initial-coefficient-${index}`} className="initial-coefficient-item">
          <span className="initial-coefficient-label">
            <MathText variant="standard" math={`c_{${index + 1}}=`} />
          </span>
          <input
            type="text"
            inputMode="decimal"
            className={`initial-coefficient-input ${fieldClassName(fieldStatuses[index] ?? "neutral")}`}
            value={coefficients[index] ?? ""}
            disabled={disabled}
            aria-label={`המקדם c_${index + 1}`}
            aria-invalid={
              fieldStatuses[index] === "incorrect" ||
              fieldStatuses[index] === "empty" ||
              fieldStatuses[index] === "invalid"
            }
            onChange={(event) => onChange(index, event.target.value)}
          />
        </label>
      ))}
    </div>
  );
}
