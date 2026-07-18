import { expectedBasisTokensFromGroups } from "../app/constant-coefficients-euler/math/basis";
import {
  canonicalizeRootGroups,
  mergeForcedRootRequirementsByMaximumMultiplicity,
  mergeRootFactorsBySummingMultiplicity,
  rootGroupsDegree,
} from "../app/constant-coefficients-euler/math/rootCanonicalization";
import { inferForcedRootGroups } from "../app/constant-coefficients-euler/math/reconstruction";
import {
  compareRootGroups,
  rootGroupDraftsFromGroups,
} from "../app/constant-coefficients-euler/practice/rootEvaluation";
import type { RootGroupDraft, SolutionRootGroup } from "../app/constant-coefficients-euler/types";
import { numbersEqual } from "../app/constant-coefficients-euler/utils/formatting";

function groupsToDrafts(groups: SolutionRootGroup[]): RootGroupDraft[] {
  return groups.map((group, index) => ({
    id: `draft-${index}`,
    kind: group.kind === "real" ? "real" : "complex-pair",
    real: String(group.real),
    imagAbs: group.kind === "complex" ? String(group.imagAbs) : "",
    multiplicity: String(group.multiplicity),
  }));
}

function groupsEqual(a: SolutionRootGroup[], b: SolutionRootGroup[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((group, index) => {
    const other = b[index];
    if (!other || group.kind !== other.kind || group.multiplicity !== other.multiplicity) {
      return false;
    }
    if (group.kind === "real" && other.kind === "real") {
      return numbersEqual(group.real, other.real);
    }
    if (group.kind === "complex" && other.kind === "complex") {
      return numbersEqual(group.real, other.real) && numbersEqual(group.imagAbs, other.imagAbs);
    }
    return false;
  });
}

function assertCase(name: string, condition: boolean, detail?: string): void {
  if (!condition) {
    throw new Error(`${name} failed${detail ? `: ${detail}` : ""}`);
  }
  console.log(`PASS ${name}`);
}

assertCase(
  "Case1-reported-real-root-bug",
  (() => {
    const expectedInternal: SolutionRootGroup[] = [
      { kind: "real", real: -1, multiplicity: 1 },
      { kind: "real", real: 2, multiplicity: 1 },
      { kind: "real", real: 2, multiplicity: 1 },
    ];
    const canonicalExpected = canonicalizeRootGroups(expectedInternal);
    const student: SolutionRootGroup[] = [
      { kind: "real", real: -1, multiplicity: 1 },
      { kind: "real", real: 2, multiplicity: 2 },
    ];
    const result = compareRootGroups(groupsToDrafts(student), expectedInternal, 3);
    const reveal = rootGroupDraftsFromGroups(expectedInternal);
    return (
      result.isCorrect &&
      groupsEqual(canonicalExpected, [
        { kind: "real", real: -1, multiplicity: 1 },
        { kind: "real", real: 2, multiplicity: 2 },
      ]) &&
      reveal.length === 2 &&
      reveal[1]?.real === "2" &&
      reveal[1]?.multiplicity === "2"
    );
  })(),
);

assertCase(
  "Case2-student-splits-repeated-root",
  compareRootGroups(
    groupsToDrafts([
      { kind: "real", real: 3, multiplicity: 1 },
      { kind: "real", real: 3, multiplicity: 2 },
    ]),
    [{ kind: "real", real: 3, multiplicity: 3 }],
    3,
  ).isCorrect,
);

assertCase(
  "Case3-repeated-complex-pair",
  (() => {
    const expectedInternal: SolutionRootGroup[] = [
      { kind: "complex", real: 0, imagAbs: 1, multiplicity: 1 },
      { kind: "complex", real: 0, imagAbs: 1, multiplicity: 1 },
    ];
    const canonical = canonicalizeRootGroups(expectedInternal);
    const student: SolutionRootGroup[] = [
      { kind: "complex", real: 0, imagAbs: 1, multiplicity: 2 },
    ];
    const result = compareRootGroups(groupsToDrafts(student), expectedInternal, 4);
    const basis = expectedBasisTokensFromGroups(canonical);
    return (
      result.isCorrect &&
      canonical.length === 1 &&
      canonical[0]?.kind === "complex" &&
      canonical[0]?.multiplicity === 2 &&
      basis.length === 4 &&
      basis.filter((token) => token.kind === "complex-cos").length === 2 &&
      basis.filter((token) => token.kind === "complex-sin").length === 2
    );
  })(),
);

assertCase(
  "Case4-incorrect-total-multiplicity",
  (() => {
    const result = compareRootGroups(
      groupsToDrafts([{ kind: "real", real: 2, multiplicity: 1 }]),
      [{ kind: "real", real: 2, multiplicity: 2 }],
      2,
    );
    return !result.isCorrect && result.multiplicityMismatches.length === 1;
  })(),
);

assertCase(
  "Case5-distinct-roots-not-merged",
  (() => {
    const merged = canonicalizeRootGroups([
      { kind: "real", real: 2, multiplicity: 1 },
      { kind: "real", real: 2.1, multiplicity: 1 },
    ]);
    return merged.length === 2;
  })(),
);

assertCase(
  "Case6-negative-zero",
  (() => {
    const merged = canonicalizeRootGroups([
      { kind: "real", real: -0, multiplicity: 1 },
      { kind: "real", real: 0, multiplicity: 1 },
    ]);
    const reveal = rootGroupDraftsFromGroups([
      { kind: "real", real: -0, multiplicity: 1 },
      { kind: "real", real: 0, multiplicity: 1 },
    ]);
    return (
      merged.length === 1 &&
      merged[0]?.kind === "real" &&
      merged[0]?.multiplicity === 2 &&
      merged[0]?.real === 0 &&
      reveal.length === 1 &&
      reveal[0]?.real === "0"
    );
  })(),
);

assertCase(
  "degree-preservation-invariant",
  (() => {
    const groups: SolutionRootGroup[] = [
      { kind: "real", real: -1, multiplicity: 1 },
      { kind: "real", real: 2, multiplicity: 1 },
      { kind: "real", real: 2, multiplicity: 1 },
      { kind: "complex", real: 0, imagAbs: 1, multiplicity: 1 },
      { kind: "complex", real: 0, imagAbs: 1, multiplicity: 1 },
    ];
    const canonical = canonicalizeRootGroups(groups);
    return rootGroupsDegree(groups) === rootGroupsDegree(canonical);
  })(),
);

assertCase(
  "reconstruction-max-multiplicity-unchanged",
  (() => {
    const merged = mergeForcedRootRequirementsByMaximumMultiplicity(
      { kind: "real", real: 2, multiplicity: 2 },
      { kind: "real", real: 2, multiplicity: 1 },
    );
    const summed = mergeRootFactorsBySummingMultiplicity(
      { kind: "real", real: 2, multiplicity: 2 },
      { kind: "real", real: 2, multiplicity: 1 },
    );
    const forced = inferForcedRootGroups([
      { kind: "real", real: 2, power: 0 },
      { kind: "real", real: 2, power: 1 },
    ]);
    return merged.multiplicity === 2 && summed.multiplicity === 3 && forced[0]?.multiplicity === 2;
  })(),
);

console.log("All root canonicalization cases passed.");
