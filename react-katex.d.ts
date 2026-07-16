declare module "react-katex" {
  import type { ComponentType, ReactNode } from "react";

  type KatexProps = {
    math?: string;
    children?: ReactNode;
  };

  export const InlineMath: ComponentType<KatexProps>;
  export const BlockMath: ComponentType<KatexProps>;
}
