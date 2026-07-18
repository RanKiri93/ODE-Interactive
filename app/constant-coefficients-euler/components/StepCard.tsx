import type { ReactNode } from "react";
import type { StageStatus } from "../types";

type StepCardProps = {
  stepNumber: number;
  title: ReactNode;
  status: StageStatus;
  locked: boolean;
  children: ReactNode;
  variant?: "default" | "stability";
};

function statusLabel(status: StageStatus): string {
  switch (status) {
    case "locked":
      return "נעול";
    case "unanswered":
      return "ממתין לתשובה";
    case "incorrect":
      return "לא נכון";
    case "correct":
      return "נכון";
    case "revealed":
      return "הוצגה תשובה";
    default:
      return "";
  }
}

export function StepCard({
  stepNumber,
  title,
  status,
  locked,
  children,
  variant = "default",
}: StepCardProps) {
  const isStability = variant === "stability";

  return (
    <section
      className={`practice-step-card ${locked ? "locked" : ""} status-${status}${isStability ? " practice-step-card-stability" : ""}`}
    >
      <header className={`practice-step-header${isStability ? " stability-stage-header" : ""}`}>
        <span className="practice-step-number">{stepNumber}</span>
        <div className="practice-step-header-text">
          <h3 className={isStability ? "stability-stage-title" : undefined}>{title}</h3>
          <span
            className={isStability ? "stability-stage-status" : "practice-step-status"}
            aria-live="polite"
          >
            {statusLabel(status)}
          </span>
        </div>
      </header>
      {locked ? (
        <p className="practice-step-locked-message">יש להשלים תחילה את השלב הקודם.</p>
      ) : (
        <div className="practice-step-body">{children}</div>
      )}
    </section>
  );
}
