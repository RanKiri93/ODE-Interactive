import { InlineMath } from "react-katex";

export function MathText({ math }: { math: string }) {
  return (
    <span className="math-render" dir="ltr">
      <InlineMath math={math} />
    </span>
  );
}
