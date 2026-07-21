"use client";

import katex from "katex";
import { useMemo } from "react";
import { displayMathClassName } from "../math/mathTypography";

type DisplayMathProps = {
  latex: string;
  className?: string;
  centered?: boolean;
};

export function DisplayMath({
  latex,
  className,
  centered = true,
}: DisplayMathProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
        strict: "ignore",
      });
    } catch {
      return katex.renderToString(String(latex), {
        displayMode: true,
        throwOnError: false,
        strict: "ignore",
      });
    }
  }, [latex]);

  return (
    <span
      className={displayMathClassName({ centered, className })}
      dir="ltr"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
