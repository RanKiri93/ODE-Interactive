import type { RootRowDraft } from "../types";

type RootGroupEditorProps = {
  rootRows: RootRowDraft[];
  onUpdateRow: (id: string, field: keyof Omit<RootRowDraft, "id">, value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
};

export function RootGroupEditor({ rootRows, onUpdateRow, onAddRow, onRemoveRow }: RootGroupEditorProps) {
  return (
    <>
      <div className="root-input-list">
        {rootRows.map((row, index) => (
          <div className="root-input-row" key={row.id}>
            <div className="root-input-row-heading">
              <span>שורש {index + 1}</span>
              <button type="button" onClick={() => onRemoveRow(row.id)} disabled={rootRows.length <= 1}>
                הסר
              </button>
            </div>
            <div className="compact-root-input" dir="ltr" aria-label={`שורש ${index + 1}`}>
              <input
                aria-label={`החלק הממשי של שורש ${index + 1}`}
                inputMode="decimal"
                type="text"
                value={row.real}
                onChange={(event) => onUpdateRow(row.id, "real", event.target.value)}
              />
              <span>+</span>
              <input
                aria-label={`החלק המדומה של שורש ${index + 1}`}
                inputMode="decimal"
                type="text"
                value={row.imag}
                onChange={(event) => onUpdateRow(row.id, "imag", event.target.value)}
              />
              <span>i</span>
              <span className="compact-root-multiplicity-label">ריבוי</span>
              <input
                aria-label={`הריבוי של שורש ${index + 1}`}
                inputMode="numeric"
                type="text"
                value={row.multiplicity}
                onChange={(event) => onUpdateRow(row.id, "multiplicity", event.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="panel-action" onClick={onAddRow}>
        הוסף שורש
      </button>
      <p className="activity-hint">
        שורש מרוכב חייב להופיע עם הצמוד שלו ועם אותו ריבוי. סכום הריבויים חייב להיות שווה למעלה.
      </p>
    </>
  );
}
