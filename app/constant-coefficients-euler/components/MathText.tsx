"use client";

import { InlineMath } from "react-katex";
import { inlineMathClassName, type MathDisplayVariant } from "../math/mathTypography";
import { DisplayMath } from "./DisplayMath";

export type { MathDisplayVariant };
/** @deprecated Use MathDisplayVariant */
export type MathSize = MathDisplayVariant;

type MathTextProps = {
  math: string;
  /** Semantic size variant. Alias: `size` is kept for compatibility. */
  variant?: MathDisplayVariant;
  size?: MathDisplayVariant;
  /** When true, renders through the shared DisplayMath path. */
  block?: boolean;
  className?: string;
};

export function MathText({
  math,
  variant,
  size,
  block = false,
  className,
}: MathTextProps) {
  const resolvedVariant = variant ?? size ?? "inline";

  if (block) {
    return <DisplayMath latex={math} className={className} />;
  }

  return (
    <span
      className={inlineMathClassName({ variant: resolvedVariant, className })}
      data-variant={resolvedVariant}
      dir="ltr"
    >
      <InlineMath math={math} />
    </span>
  );
}

export { DisplayMath };
