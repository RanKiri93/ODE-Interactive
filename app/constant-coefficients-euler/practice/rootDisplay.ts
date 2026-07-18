import type { RootGroupDraft } from "../types";

export type RootDisplayIndex = {
  rowId: string;
  start: number;
  end: number;
  isComplex: boolean;
};

export function computeRootDisplayIndices(rows: readonly RootGroupDraft[]): RootDisplayIndex[] {
  let nextIndex = 1;

  return rows.map((row) => {
    if (row.kind === "real") {
      const display = {
        rowId: row.id,
        start: nextIndex,
        end: nextIndex,
        isComplex: false,
      };
      nextIndex += 1;
      return display;
    }

    const display = {
      rowId: row.id,
      start: nextIndex,
      end: nextIndex + 1,
      isComplex: true,
    };
    nextIndex += 2;
    return display;
  });
}
