"use client";

import { useState } from "react";
import { ConstantCoefficientFullPractice } from "./ConstantCoefficientFullPractice";
import { EquationReconstructionPractice } from "./EquationReconstructionPractice";
import { EulerTransformationPractice } from "./EulerTransformationPractice";
import type { PracticeMode } from "../types";

export function PracticeHub() {
  const [mode, setMode] = useState<PracticeMode>("constant-coefficients");

  return (
    <div className="practice-hub">
      <nav className="practice-mode-nav" aria-label="סוג תרגול">
        <div className="segmented-control practice-mode-control">
          <button
            type="button"
            className={mode === "constant-coefficients" ? "selected" : ""}
            aria-pressed={mode === "constant-coefficients"}
            onClick={() => setMode("constant-coefficients")}
          >
            מקדמים קבועים
          </button>
          <button
            type="button"
            className={mode === "euler-transformation" ? "selected" : ""}
            aria-pressed={mode === "euler-transformation"}
            onClick={() => setMode("euler-transformation")}
          >
            משוואות אוילר
          </button>
          <button
            type="button"
            className={mode === "equation-reconstruction" ? "selected" : ""}
            aria-pressed={mode === "equation-reconstruction"}
            onClick={() => setMode("equation-reconstruction")}
          >
            שחזור משוואה
          </button>
        </div>
      </nav>

      <div hidden={mode !== "constant-coefficients"} aria-hidden={mode !== "constant-coefficients"}>
        <ConstantCoefficientFullPractice />
      </div>
      <div hidden={mode !== "euler-transformation"} aria-hidden={mode !== "euler-transformation"}>
        <EulerTransformationPractice />
      </div>
      <div hidden={mode !== "equation-reconstruction"} aria-hidden={mode !== "equation-reconstruction"}>
        <EquationReconstructionPractice />
      </div>
    </div>
  );
}
