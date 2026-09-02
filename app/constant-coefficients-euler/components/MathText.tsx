"use client";

import { InlineMath } from "react-katex";
import { inlineMathClassName, type MathDisplayVariant } from "../math/mathTypography";
import { DisplayMath } from "./DisplayMath";

export type { MathDisplayVariant };

type MathTextProps = {
  math: string;
  /** Semantic size variant. */
  variant?: MathDisplayVariant;
  /** When true, renders through the shared DisplayMath path. */
  block?: boolean;
  className?: string;
};

export function MathText({
  math,
  variant,
  block = false,
  className,
}: MathTextProps) {
  const resolvedVariant = variant ?? "inline";

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
