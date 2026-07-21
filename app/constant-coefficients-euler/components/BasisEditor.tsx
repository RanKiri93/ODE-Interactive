import { formatBasisTokenPreview } from "../math/basis";
import type { BasisDisplayContext, BasisDraftRow, EquationKind } from "../types";
import {
  parseNonNegativeIntegerDraft,
  parseNumericDraft,
} from "../utils/parsing";
import { MathText } from "./MathText";

type EulerBasisEditorProps = {
  basisRows: BasisDraftRow[];
  displayContext?: BasisDisplayContext | EquationKind;
  equationKind?: EquationKind;
  powerLabel: string;
  disabled?: boolean;
  expectedCount?: number;
  onUpdateRow: (id: string, field: keyof Omit<BasisDraftRow, "id">, value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
};

function previewTokenFromRow(row: BasisDraftRow) {
  if (row.kind === "real") {
    if (parseNumericDraft(row.real) !== null && parseNonNegativeIntegerDraft(row.power) !== null) {
      return {
        kind: "real" as const,
        real: parseNumericDraft(row.real)!,
        power: parseNonNegativeIntegerDraft(row.power)!,
      };
    }
    return null;
  }

  if (
    parseNumericDraft(row.real) !== null &&
    parseNumericDraft(row.imagAbs) !== null &&
    parseNonNegativeIntegerDraft(row.power) !== null &&
    (parseNumericDraft(row.imagAbs) ?? 0) > 0
  ) {
    return {
      kind: row.kind === "cos" ? ("complex-cos" as const) : ("complex-sin" as const),
      real: parseNumericDraft(row.real)!,
      imagAbs: parseNumericDraft(row.imagAbs)!,
      power: parseNonNegativeIntegerDraft(row.power)!,
    };
  }

  return null;
}

export function EulerBasisEditor({
  basisRows,
  equationKind,
  displayContext,
  powerLabel,
  disabled = false,
  expectedCount,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
}: EulerBasisEditorProps) {
  const previewContext = displayContext ?? equationKind ?? "euler-x";

  return (
    <section className="basis-answer-editor">
      <div className="section-heading">עורך בסיס</div>
      {expectedCount !== undefined ? (
        <p className="activity-hint">
          מספר איברי הבסיס: {basisRows.length} מתוך {expectedCount}
        </p>
      ) : null}
      <div className="basis-draft-list">
        {basisRows.map((row, index) => {
          const previewToken = previewTokenFromRow(row);

          return (
            <div className="basis-draft-row" key={row.id}>
              <span className="basis-row-index">{index + 1}</span>
              <label>
                סוג
                <select
                  value={row.kind}
                  disabled={disabled}
                  onChange={(event) => onUpdateRow(row.id, "kind", event.target.value)}
                >
                  <option value="real">ממשי</option>
                  <option value="cos">cos</option>
                  <option value="sin">sin</option>
                </select>
              </label>
              <label>
                Re
                <input
                  inputMode="decimal"
                  type="text"
                  value={row.real}
                  disabled={disabled}
                  onChange={(event) => onUpdateRow(row.id, "real", event.target.value)}
                />
              </label>
              <label>
                Im
                <input
                  inputMode="decimal"
                  type="text"
                  value={row.imagAbs}
                  disabled={disabled || row.kind === "real"}
                  onChange={(event) => onUpdateRow(row.id, "imagAbs", event.target.value)}
                />
              </label>
              <label>
                {powerLabel}
                <input
                  inputMode="numeric"
                  type="text"
                  value={row.power}
                  disabled={disabled}
                  onChange={(event) => onUpdateRow(row.id, "power", event.target.value)}
                />
              </label>
              <div className="basis-preview">
                {previewToken ? (
                  <MathText size="compact" math={formatBasisTokenPreview(previewToken, previewContext)} />
                ) : (
                  <span>תצוגה מקדימה</span>
                )}
              </div>
              <button
                type="button"
                className="panel-action secondary basis-row-remove"
                disabled={disabled || basisRows.length <= 1}
                onClick={() => onRemoveRow(row.id)}
              >
                הסר
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" className="panel-action" disabled={disabled} onClick={onAddRow}>
        הוסף איבר
      </button>
    </section>
  );
}
