import { computeRootDisplayIndices } from "../practice/rootDisplay";
import type { RootGroupDraft } from "../types";
import { formulaRowClassName } from "../math/mathTypography";
import { MathText } from "./MathText";

type PracticeRootGroupEditorProps = {
  rootRows: RootGroupDraft[];
  expectedDegree?: number;
  disabled?: boolean;
  onUpdateRow: (id: string, field: keyof Omit<RootGroupDraft, "id">, value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
};

export function PracticeRootGroupEditor({
  rootRows,
  disabled = false,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
}: PracticeRootGroupEditorProps) {
  const displayIndices = computeRootDisplayIndices(rootRows);

  return (
    <>
      <div className="root-input-list">
        {rootRows.map((row) => {
          const numbering = displayIndices.find((item) => item.rowId === row.id);
          if (!numbering) {
            return null;
          }

          return (
            <article className="root-input-row" key={row.id} aria-label={`שורש ${numbering.start}`}>
              <div className="root-input-row-heading">
                <span>שורש {numbering.isComplex ? `${numbering.start}, ${numbering.end}` : numbering.start}</span>
                <button
                  type="button"
                  onClick={() => onRemoveRow(row.id)}
                  disabled={disabled || rootRows.length <= 1}
                  aria-label={`הסר שורש ${numbering.start}`}
                >
                  הסר
                </button>
              </div>

              <div className="root-type-selector segmented-control" role="radiogroup" aria-label="סוג שורש">
                <button
                  type="button"
                  className={row.kind === "real" ? "selected" : ""}
                  aria-pressed={row.kind === "real"}
                  disabled={disabled}
                  onClick={() => onUpdateRow(row.id, "kind", "real")}
                >
                  ממשי
                </button>
                <button
                  type="button"
                  className={row.kind === "complex-pair" ? "selected" : ""}
                  aria-pressed={row.kind === "complex-pair"}
                  disabled={disabled}
                  onClick={() => onUpdateRow(row.id, "kind", "complex-pair")}
                >
                  מרוכב
                </button>
              </div>

              <div className={formulaRowClassName("root-expression-row")} data-variant="standard" dir="ltr">
                {row.kind === "real" ? (
                  <>
                    <span className="root-expression-label">
                      <MathText math={`r_{${numbering.start}}=`} />
                    </span>
                    <input
                      inputMode="decimal"
                      type="text"
                      className="root-inline-input"
                      value={row.real}
                      disabled={disabled}
                      aria-label={`ערך r ${numbering.start}`}
                      onChange={(event) => onUpdateRow(row.id, "real", event.target.value)}
                    />
                    <span className="root-expression-separator">,</span>
                    <span className="root-expression-label">
                      <MathText math={`k_{${numbering.start}}=`} />
                    </span>
                    <input
                      inputMode="numeric"
                      type="text"
                      className="root-inline-input root-multiplicity-input"
                      value={row.multiplicity}
                      disabled={disabled}
                      aria-label={`ריבוי k ${numbering.start}`}
                      onChange={(event) => onUpdateRow(row.id, "multiplicity", event.target.value)}
                    />
                  </>
                ) : (
                  <>
                    <span className="root-expression-label">
                      <MathText math={`r_{${numbering.start}},r_{${numbering.end}}=`} />
                    </span>
                    <input
                      inputMode="decimal"
                      type="text"
                      className="root-inline-input"
                      value={row.real}
                      disabled={disabled}
                      aria-label={`חלק ממשי α עבור r ${numbering.start}, r ${numbering.end}`}
                      onChange={(event) => onUpdateRow(row.id, "real", event.target.value)}
                    />
                    <span className="root-expression-label">
                      <MathText math={"\\pm i"} />
                    </span>
                    <input
                      inputMode="decimal"
                      type="text"
                      className="root-inline-input"
                      value={row.imagAbs}
                      disabled={disabled}
                      aria-label={`גודל חלק מדומה β עבור r ${numbering.start}, r ${numbering.end}`}
                      onChange={(event) => onUpdateRow(row.id, "imagAbs", event.target.value)}
                    />
                    <span className="root-expression-separator">,</span>
                    <span className="root-expression-label">
                      <MathText math={`k_{${numbering.start}}=k_{${numbering.end}}=`} />
                    </span>
                    <input
                      inputMode="numeric"
                      type="text"
                      className="root-inline-input root-multiplicity-input"
                      value={row.multiplicity}
                      disabled={disabled}
                      aria-label={`ריבוי משותף k ${numbering.start}, k ${numbering.end}`}
                      onChange={(event) => onUpdateRow(row.id, "multiplicity", event.target.value)}
                    />
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <button type="button" className="panel-action" disabled={disabled} onClick={onAddRow}>
        הוסף שורש
      </button>

      <p className="activity-hint root-editor-note">
        <MathText math="k_m" /> הוא הריבוי של השורש <MathText math="r_m" />. שורשים מרוכבים צמודים מוזנים יחד ובאותו ריבוי.
      </p>
    </>
  );
}

export function RootStageHints() {
  return (
    <>
      <p>לפולינום ממשי ממעלה אי־זוגית יש לפחות שורש ממשי אחד.</p>
      <p>
        אם <MathText math={"r=\\frac{p}{q}"} /> הוא שורש רציונלי של פולינום בעל מקדמים שלמים, כאשר{" "}
        <MathText math="p,q" /> זרים ו-<MathText math="q>0" />, אז <MathText math="p" /> מחלק את המקדם החופשי ו-
        <MathText math="q" /> מחלק את המקדם המוביל.
      </p>
      <p>בפרט, אם הפולינום מוני, כל שורש רציונלי שלו הוא מספר שלם המחלק את המקדם החופשי.</p>
    </>
  );
}
