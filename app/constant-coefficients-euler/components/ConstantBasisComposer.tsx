import { useMemo, useRef, useState } from "react";
import { formatBasisTokenPreview } from "../math/basis";
import {
  draftFromToken,
  emptyBasisElementDraft,
  isDuplicateBasisToken,
  tokenFromDraft,
  validateBasisElementDraft,
} from "../practice/basisComposer";
import type { BasisDisplayContext, BasisEntry } from "../types";
import { createId } from "../utils/id";
import { BasisElementComposer } from "./BasisElementComposer";
import { EulerBasisElementComposer } from "./EulerBasisElementComposer";
import { MathText } from "./MathText";

type ConstantBasisComposerProps = {
  entries: BasisEntry[];
  displayContext?: BasisDisplayContext;
  independentVariable?: "x" | "t";
  expectedCount?: number;
  disabled?: boolean;
  onChange: (entries: BasisEntry[]) => void;
};

type ComposerMode =
  | { kind: "closed" }
  | { kind: "add" }
  | { kind: "edit"; entryId: string };

function resolveDisplayContext(
  displayContext: BasisDisplayContext | undefined,
  independentVariable: "x" | "t" | undefined,
): BasisDisplayContext {
  if (displayContext) {
    return displayContext;
  }
  return independentVariable === "t" ? "constant-t" : "constant-x";
}

export function ConstantBasisComposer({
  entries,
  displayContext,
  independentVariable = "x",
  expectedCount,
  disabled = false,
  onChange,
}: ConstantBasisComposerProps) {
  const resolvedContext = resolveDisplayContext(displayContext, independentVariable);
  const isEulerBasis = resolvedContext === "euler-x";
  const [composerMode, setComposerMode] = useState<ComposerMode>({ kind: "closed" });
  const [draft, setDraft] = useState(emptyBasisElementDraft());
  const [feedback, setFeedback] = useState<string | null>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const basisLatex = useMemo(() => {
    if (entries.length === 0) {
      return "\\left\\{\\ \\right\\}";
    }
    const parts = entries.map((entry) => formatBasisTokenPreview(entry.token, resolvedContext));
    return `\\left\\{${parts.join(",\\ ")}\\right\\}`;
  }, [entries, resolvedContext]);

  const countComplete =
    expectedCount !== undefined && entries.length === expectedCount && expectedCount > 0;

  const closeComposer = () => {
    setComposerMode({ kind: "closed" });
    setDraft(emptyBasisElementDraft());
    setFeedback(null);
  };

  const openAddComposer = () => {
    setComposerMode({ kind: "add" });
    setDraft(emptyBasisElementDraft());
    setFeedback(null);
  };

  const openEditComposer = (entry: BasisEntry) => {
    setComposerMode({ kind: "edit", entryId: entry.id });
    setDraft(draftFromToken(entry.token));
    setFeedback(null);
  };

  const confirmComposer = () => {
    const validationError = validateBasisElementDraft(draft);
    if (validationError) {
      setFeedback(validationError);
      return;
    }

    const token = tokenFromDraft(draft);
    if (!token) {
      setFeedback("יש להשלים את כל הפרמטרים.");
      return;
    }

    const excludeId = composerMode.kind === "edit" ? composerMode.entryId : undefined;
    if (isDuplicateBasisToken(entries, token, excludeId)) {
      setFeedback("איבר זה כבר מופיע בבסיס.");
      return;
    }

    if (composerMode.kind === "edit") {
      onChange(
        entries.map((entry) =>
          entry.id === composerMode.entryId ? { ...entry, token } : entry,
        ),
      );
    } else {
      onChange([...entries, { id: createId(), token }]);
    }

    closeComposer();
  };

  const deleteEntry = (entryId: string) => {
    const deletedIndex = entries.findIndex((entry) => entry.id === entryId);
    onChange(entries.filter((entry) => entry.id !== entryId));

    requestAnimationFrame(() => {
      const editButtons = gridRef.current?.querySelectorAll<HTMLButtonElement>(
        ".basis-element-action:not(.basis-element-delete)",
      );
      if (editButtons && editButtons.length > 0) {
        const focusIndex = Math.min(Math.max(deletedIndex, 0), editButtons.length - 1);
        editButtons[focusIndex]?.focus();
        return;
      }
      addButtonRef.current?.focus();
    });
  };

  const composerElement = isEulerBasis ? (
    <EulerBasisElementComposer
      mode={composerMode.kind === "edit" ? "edit" : "add"}
      draft={draft}
      validationMessage={feedback}
      disabled={disabled}
      onSelectTemplate={(template) => {
        setDraft({
          ...emptyBasisElementDraft(),
          template,
        });
        setFeedback(null);
      }}
      onChangeField={(field, value) => {
        setDraft((current) => ({ ...current, [field]: value }));
        setFeedback(null);
      }}
      onConfirm={confirmComposer}
      onCancel={closeComposer}
    />
  ) : (
    <BasisElementComposer
      independentVariable={resolvedContext === "constant-t" ? "t" : "x"}
      mode={composerMode.kind === "edit" ? "edit" : "add"}
      draft={draft}
      validationMessage={feedback}
      disabled={disabled}
      onSelectTemplate={(template) => {
        setDraft({
          ...emptyBasisElementDraft(),
          template,
        });
        setFeedback(null);
      }}
      onChangeField={(field, value) => {
        setDraft((current) => ({ ...current, [field]: value }));
        setFeedback(null);
      }}
      onConfirm={confirmComposer}
      onCancel={closeComposer}
    />
  );

  return (
    <section className="constant-basis-composer">
      <div className="basis-composer-summary">
        {expectedCount !== undefined ? (
          <span
            className={`basis-count-badge${countComplete ? " basis-count-badge--complete" : ""}`}
          >
            איברי בסיס: {entries.length} מתוך {expectedCount}
          </span>
        ) : null}

        <div className="basis-brace-display-scroll">
          <p className="intro-equation basis-brace-display" dir="ltr">
            <MathText block math={basisLatex} />
          </p>
        </div>
      </div>

      {entries.length > 0 ? (
        <ul className="basis-element-grid" ref={gridRef}>
          {entries.map((entry, index) => (
            <li key={entry.id} className="basis-element-grid-item">
              <div className="basis-element-card">
                <div className="basis-element-formula">
                  <MathText size="compact" math={formatBasisTokenPreview(entry.token, resolvedContext)} />
                </div>

                <div className="basis-element-actions">
                  <button
                    type="button"
                    className="basis-element-action"
                    disabled={disabled || composerMode.kind !== "closed"}
                    aria-label={`עריכת איבר הבסיס ${index + 1}`}
                    title="עריכה"
                    onClick={() => openEditComposer(entry)}
                  >
                    <span aria-hidden="true">✎</span>
                  </button>
                  <button
                    type="button"
                    className="basis-element-action basis-element-delete"
                    disabled={disabled}
                    aria-label={`מחיקת איבר הבסיס ${index + 1}`}
                    title="מחיקה"
                    onClick={() => deleteEntry(entry.id)}
                  >
                    <span aria-hidden="true">🗑</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {composerMode.kind === "closed" ? (
        <button
          ref={addButtonRef}
          type="button"
          className="panel-action constant-basis-add-button"
          disabled={disabled}
          onClick={openAddComposer}
        >
          הוסף איבר בסיס
        </button>
      ) : (
        composerElement
      )}
    </section>
  );
}
