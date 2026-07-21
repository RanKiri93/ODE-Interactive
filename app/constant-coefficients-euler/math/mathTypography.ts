export type MathDisplayVariant = "inline" | "compact" | "standard";

/**
 * Font sizes are defined once in app/globals.css:
 *   --math-size-inline | compact | standard
 * DisplayMath and .math-formula-row always consume --math-size-standard.
 */

/** @deprecated Use MathDisplayVariant */
export type MathSize = MathDisplayVariant;

export function displayMathClassName({
  centered = true,
  className,
}: {
  centered?: boolean;
  className?: string;
}): string {
  return ["math-display", centered ? "math-display-centered" : "", className]
    .filter(Boolean)
    .join(" ");
}

export function inlineMathClassName({ className }: { variant?: MathDisplayVariant; className?: string }): string {
  return ["math-render", className].filter(Boolean).join(" ");
}

export function formulaRowClassName(className?: string): string {
  return ["math-formula-row", className].filter(Boolean).join(" ");
}
