import { useMemo, useState } from "react";
import { MAX_DEGREE } from "../constants";
import { formatConstantCoefficientBasis, formatEulerBasis } from "../math/basis";
import { convertPowerToFalling } from "../math/eulerConversion";
import {
  formatConstantCoefficientEquation,
  formatEulerEquation,
  formatPolynomialLatex,
} from "../math/polynomial";
import {
  collectSolutionRootGroups,
  defaultRowsForDegree,
  expandPolynomialFromRows,
  validateRootRows,
} from "../math/roots";
import type { EquationKind, RootRowDraft } from "../types";
import { createId } from "../utils/id";
import { formatNumber } from "../utils/formatting";
import { DisplayMath } from "./DisplayMath";
import { MathText } from "./MathText";
import { RootGroupEditor } from "./RootGroupEditor";

export function EquationAssemblerActivity() {
  const [degree, setDegree] = useState(2);
  const [equationKind, setEquationKind] = useState<EquationKind>("constant-coefficients");
  const [rootRows, setRootRows] = useState<RootRowDraft[]>(() => defaultRowsForDegree(2));

  const validationErrors = useMemo(() => validateRootRows(rootRows, degree), [rootRows, degree]);

  const assembled = useMemo(() => {
    if (validationErrors.length > 0) {
      return null;
    }

    const characteristicPolynomial = expandPolynomialFromRows(rootRows);
    if (!characteristicPolynomial) {
      return null;
    }

    const solutionGroups = collectSolutionRootGroups(rootRows);
    if (!solutionGroups) {
      return null;
    }

    const eulerCoefficients = convertPowerToFalling(characteristicPolynomial);
    const polynomialLatex = formatPolynomialLatex(characteristicPolynomial, "r");
    const constantCoefficientEquation = formatConstantCoefficientEquation(characteristicPolynomial);
    const eulerEquation = formatEulerEquation(eulerCoefficients);
    const constantCoefficientBasis = formatConstantCoefficientBasis(solutionGroups);
    const eulerBasis = formatEulerBasis(solutionGroups);
    const hasComplexRoots = solutionGroups.some((group) => group.kind === "complex");

    return {
      characteristicPolynomial,
      eulerCoefficients,
      polynomialLatex,
      constantCoefficientEquation,
      eulerEquation,
      constantCoefficientBasis,
      eulerBasis,
      hasComplexRoots,
    };
  }, [rootRows, validationErrors]);

  const updateDegree = (nextDegree: number) => {
    setDegree(nextDegree);
    setRootRows(defaultRowsForDegree(nextDegree));
  };

  const updateRow = (id: string, field: keyof Omit<RootRowDraft, "id">, value: string) => {
    setRootRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const addRow = () => {
    setRootRows((current) => [
      ...current,
      {
        id: createId(),
        real: "0",
        imag: "0",
        multiplicity: "1",
      },
    ]);
  };

  const removeRow = (id: string) => {
    setRootRows((current) => (current.length <= 1 ? current : current.filter((row) => row.id !== id)));
  };

  return (
    <section className="equation-assembler-grid">
      <aside className="control-panel equation-assembler-panel">
        <section className="panel-section">
          <div className="section-heading">מעלה המשוואה</div>
          <label className="assembler-field">
            <span>בחרו מעלה</span>
            <select value={degree} onChange={(event) => updateDegree(Number(event.target.value))}>
              {Array.from({ length: MAX_DEGREE }, (_, index) => index + 1).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <p className="activity-hint">בשלב זה ניתן לבחור מעלה בין 1 ל-{MAX_DEGREE}.</p>
        </section>

        <section className="panel-section">
          <div className="section-heading">סוג המשוואה</div>
          <div className="segmented-control stacked">
            <button
              className={equationKind === "constant-coefficients" ? "selected" : ""}
              type="button"
              onClick={() => setEquationKind("constant-coefficients")}
            >
              מקדמים קבועים
            </button>
            <button
              className={equationKind === "euler" ? "selected" : ""}
              type="button"
              onClick={() => setEquationKind("euler")}
            >
              משוואת אוילר
            </button>
          </div>
          <p className="activity-hint">
            בשני המקרים נבנה את אותו פולינום אופייני, ובגרסת אוילר נתרגם אותו לבסיס המתאים.
          </p>
        </section>

        <section className="panel-section">
          <div className="section-heading">שורשי הפולינום האופייני</div>
          <RootGroupEditor
            rootRows={rootRows}
            onUpdateRow={updateRow}
            onAddRow={addRow}
            onRemoveRow={removeRow}
          />
        </section>
      </aside>

      <section className="canvas-panel">
        <div className="canvas-header">
          <div>
            <span className="canvas-label">המשוואה המורכבת</span>
            <strong>{assembled ? "הקלט תקין" : "ממתין לקלט תקין"}</strong>
          </div>
        </div>
        <div className="equation-result-panel">
          {assembled ? (
            <div className="equation-result-list">
              <section className="result-card primary">
                <span>הפולינום האופייני</span>
                <p className="intro-equation">
                  <DisplayMath latex={`p(r)=${assembled.polynomialLatex}`} />
                </p>
              </section>
              <section className="result-card">
                <span>המשוואה המתקבלת</span>
                <p className="intro-equation">
                  <DisplayMath
                    latex={
                      equationKind === "constant-coefficients"
                        ? assembled.constantCoefficientEquation
                        : assembled.eulerEquation
                    }
                  />
                </p>
              </section>
              <section className="result-card solution-basis-card">
                <span>בסיס למרחב הפתרונות</span>
                <div className="solution-basis-list">
                  {(equationKind === "constant-coefficients"
                    ? assembled.constantCoefficientBasis
                    : assembled.eulerBasis
                  ).map((solution, index) => (
                    <p className="intro-equation" key={`${solution}-${index}`}>
                      <DisplayMath latex={`y_{${index + 1}}(x)=${solution}`} />
                    </p>
                  ))}
                </div>
                {assembled.hasComplexRoots ? (
                  <p className="activity-hint">
                    עבור שורשים מרוכבים הבסיס מוצג בגרסה ממשית בעזרת cos ו-sin.
                  </p>
                ) : null}
              </section>
            </div>
          ) : (
            <div className="canvas-placeholder">המשוואה תופיע כאן לאחר הזנת שורשים תקינים.</div>
          )}
        </div>
      </section>

      <aside className="analysis-panel">
        {validationErrors.length > 0 ? (
          <section className="panel-section validation-card">
            <div className="section-heading">בדיקות קלט</div>
            <ul>
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </section>
        ) : assembled ? (
          <>
            <section className="result-card primary">
              <span>סיכום</span>
              <strong>הקלט עומד בכל הדרישות</strong>
            </section>
            <section className="panel-section">
              <div className="section-heading">מקדמי הפולינום</div>
              <div className="equation-coefficient-list" dir="ltr">
                {assembled.characteristicPolynomial.map((coefficient, index) => (
                  <div key={`power-${index}`}>
                    <span>
                      <MathText size="compact" math={`a_{${index}}`} />
                    </span>
                    <strong>{formatNumber(coefficient)}</strong>
                  </div>
                ))}
              </div>
            </section>
            {equationKind === "euler" && (
              <section className="panel-section">
                <div className="section-heading">מקדמי משוואת אוילר</div>
                <div className="equation-coefficient-list" dir="ltr">
                  {assembled.eulerCoefficients.map((coefficient, index) => (
                    <div key={`euler-${index}`}>
                      <span>
                        <MathText size="compact" math={`b_{${index}}`} />
                      </span>
                      <strong>{formatNumber(coefficient)}</strong>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <section className="panel-section">
            <div className="section-heading">בדיקות קלט</div>
            <p className="activity-hint">הזינו שורשים וריבויים כדי לקבל משוואה מורכבת.</p>
          </section>
        )}
      </aside>
    </section>
  );
}
