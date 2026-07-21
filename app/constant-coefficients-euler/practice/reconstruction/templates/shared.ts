import type {
  ComplexPairDomain,
  Difficulty,
  GivenSolutionExpression,
  LambdaConstraint,
  RandomSource,
  RealPairDomain,
  ReconstructionBehaviorCondition,
  ReconstructionCaseFilter,
  ReconstructionImpossibleReason,
  ReconstructionOutcome,
  SolutionRootGroup,
} from "../../../types";

export const SMALL_REAL_ROOTS = [-3, -2, -1, 0, 1, 2, 3] as const;
export const NEGATIVE_ROOTS = [-3, -2, -1] as const;
export const POSITIVE_ROOTS = [1, 2, 3] as const;
export const NON_NEGATIVE_ROOTS = [0, 1, 2, 3] as const;
export const NON_POSITIVE_ROOTS = [-3, -2, -1, 0] as const;
export const COMPLEX_REAL_PARTS = [-2, -1, 0, 1, 2] as const;
export const POSITIVE_FREQUENCIES = [1, 2, 3] as const;
export const NONZERO_SHIFTS = [-2, -1, 1, 2] as const;
export const SHIFTS = [-2, -1, 0, 1, 2] as const;
export const NONZERO_COMBINATION_COEFFICIENTS = [-2, -1, 1, 2] as const;

export type Order2TemplateOutcome =
  | "feasible-unique"
  | "feasible-one-real-root"
  | "infeasible";

export type Order2PedagogicalTag =
  | "repeated-root"
  | "complex-pair"
  | "linear-combination"
  | "behavior-essential"
  | "behavior-redundant"
  | "zero-collision"
  | "degree-contradiction"
  | "behavior-contradiction";

export type Order2TemplateParameters = {
  realRootA?: number;
  realRootB?: number;
  complexRealPart?: number;
  frequency?: number;
  secondFrequency?: number;
  shift?: number;
  coefficientA?: number;
  coefficientB?: number;
  useCosine?: boolean;
  useSine?: boolean;
};

export type Order2ReconstructionTemplate = {
  id: string;
  difficulty: Difficulty;
  outcome: Order2TemplateOutcome;
  weight: number;
  pedagogicalTags: Order2PedagogicalTag[];
  sampleParameters: (rng: RandomSource) => Order2TemplateParameters;
  validateParameters: (params: Order2TemplateParameters) => boolean;
  givenSolutions: (params: Order2TemplateParameters) => GivenSolutionExpression[];
  behaviorCondition: (params: Order2TemplateParameters) => ReconstructionBehaviorCondition;
  declaredForcedRoots: (params: Order2TemplateParameters) => SolutionRootGroup[];
  expectedInfeasibilityReason?: (
    params: Order2TemplateParameters,
  ) => ReconstructionImpossibleReason;
  expectedDetermination?: "unique" | "one-real-parameter";
  expectedLambdaConstraint?: (params: Order2TemplateParameters) => LambdaConstraint;
};

export function pickDistinct<T>(rng: RandomSource, pool: readonly T[], count: number): T[] {
  const copy = [...pool];
  const result: T[] = [];
  while (result.length < count && copy.length > 0) {
    const index = rng.integer(0, copy.length - 1);
    const picked = copy.splice(index, 1)[0];
    if (picked !== undefined) {
      result.push(picked);
    }
  }
  return result;
}

export function pickFrom<T>(rng: RandomSource, pool: readonly T[]): T {
  return rng.pick(pool);
}

export function realToken(real: number, power: number): GivenSolutionExpression {
  return { kind: "basis-token", token: { kind: "real", real, power } };
}

export function trigToken(
  real: number,
  frequency: number,
  power: number,
  useCosine: boolean,
): GivenSolutionExpression {
  return {
    kind: "basis-token",
    token: {
      kind: useCosine ? "complex-cos" : "complex-sin",
      real,
      imagAbs: frequency,
      power,
    },
  };
}

export function realRoot(real: number, multiplicity: number): SolutionRootGroup {
  return { kind: "real", real, multiplicity };
}

export function complexRoot(real: number, imagAbs: number, multiplicity: number): SolutionRootGroup {
  return { kind: "complex", real, imagAbs, multiplicity };
}

export function outcomeToCaseFilterOutcome(outcome: Order2TemplateOutcome): ReconstructionOutcome {
  if (outcome === "feasible-unique") {
    return "unique";
  }
  if (outcome === "feasible-one-real-root") {
    return "one-real-parameter";
  }
  return "impossible";
}

const UNIQUE_TEMPLATE_IDS = new Set([
  "O2-F02-easy",
  "O2-F02-shifted",
  "O2-F03-pure",
  "O2-F03-combination",
  "O2-F04-separate",
  "O2-F04-combination",
  "O2-F11-easy",
  "O2-F11-shifted",
  "O2-F12-easy",
  "O2-F12-shifted",
  "O2-F13",
  "O2-F14",
]);

const ONE_PARAM_TEMPLATE_IDS = new Set([
  "O2-F01",
  "O2-F05",
  "O2-F06",
  "O2-F07",
  "O2-F08",
  "O2-F09",
  "O2-F10",
]);

const IMPOSSIBLE_TEMPLATE_IDS = new Set([
  "O2-I01",
  "O2-I02",
  "O2-I03",
  "O2-I04",
  "O2-I05",
  "O2-I06",
  "O2-I07",
  "O2-I08",
  "O2-I09",
  "O2-I10",
  "O2-I11",
  "O2-I12",
  "O2-I13",
  "O2-I14",
  "O2-I15",
]);

export function templateMatchesCaseFilter(
  template: Order2ReconstructionTemplate,
  caseFilter: ReconstructionCaseFilter,
): boolean {
  if (caseFilter === "mixed") {
    return true;
  }
  if (caseFilter === "unique") {
    return UNIQUE_TEMPLATE_IDS.has(template.id);
  }
  if (caseFilter === "one-real-parameter") {
    return ONE_PARAM_TEMPLATE_IDS.has(template.id);
  }
  return IMPOSSIBLE_TEMPLATE_IDS.has(template.id);
}

export function templateMatchesDifficulty(
  template: Order2ReconstructionTemplate,
  difficulty: Difficulty,
): boolean {
  const rank: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
  return rank[template.difficulty] <= rank[difficulty];
}

export function pickWeightedTemplate<T extends { weight: number }>(
  rng: RandomSource,
  templates: readonly T[],
): T {
  const totalWeight = templates.reduce((sum, template) => sum + template.weight, 0);
  let roll = rng.next() * totalWeight;
  for (const template of templates) {
    roll -= template.weight;
    if (roll <= 0) {
      return template;
    }
  }
  return templates[templates.length - 1] ?? templates[0]!;
}

export function pickMixedOutcomeCategory(rng: RandomSource): ReconstructionOutcome {
  const roll = rng.integer(0, 2);
  return roll === 0 ? "unique" : roll === 1 ? "one-real-parameter" : "impossible";
}

export type Order3TemplateOutcome =
  | "feasible-unique"
  | "feasible-one-real-root"
  | "feasible-two-parameter"
  | "infeasible";

export type Order3PedagogicalTag =
  | "repeated-root"
  | "complex-pair"
  | "linear-combination"
  | "behavior-essential"
  | "behavior-redundant"
  | "zero-collision"
  | "degree-contradiction"
  | "behavior-contradiction";

export type Order3TemplateParameters = {
  realRootA?: number;
  realRootB?: number;
  realRootC?: number;
  realRootD?: number;
  complexRealPart?: number;
  secondComplexRealPart?: number;
  frequency?: number;
  secondFrequency?: number;
  shift?: number;
  constantTerm?: number;
  coefficientA?: number;
  coefficientB?: number;
  coefficientC?: number;
  coefficientD?: number;
  useCosine?: boolean;
  useSine?: boolean;
  secondUseCosine?: boolean;
};

export type Order3ReconstructionTemplate = {
  id: string;
  difficulty: Difficulty;
  outcome: Order3TemplateOutcome;
  weight: number;
  pedagogicalTags: Order3PedagogicalTag[];
  sampleParameters: (rng: RandomSource) => Order3TemplateParameters;
  validateParameters: (params: Order3TemplateParameters) => boolean;
  givenSolutions: (params: Order3TemplateParameters) => GivenSolutionExpression[];
  behaviorCondition: (params: Order3TemplateParameters) => ReconstructionBehaviorCondition;
  declaredForcedRoots: (params: Order3TemplateParameters) => SolutionRootGroup[];
  expectedInfeasibilityReason?: (
    params: Order3TemplateParameters,
  ) => ReconstructionImpossibleReason;
  expectedDetermination?: "unique" | "one-real-parameter" | "two-parameter";
  expectedLambdaConstraint?: (params: Order3TemplateParameters) => LambdaConstraint;
  expectedRealPairDomain?: (params: Order3TemplateParameters) => RealPairDomain;
  expectedComplexPairDomain?: (params: Order3TemplateParameters) => ComplexPairDomain;
};

export function order3OutcomeToCaseFilterOutcome(outcome: Order3TemplateOutcome): ReconstructionOutcome {
  if (outcome === "feasible-unique") {
    return "unique";
  }
  if (outcome === "feasible-one-real-root") {
    return "one-real-parameter";
  }
  if (outcome === "feasible-two-parameter") {
    return "two-parameter";
  }
  return "impossible";
}

const ORDER3_UNIQUE_TEMPLATE_IDS = new Set([
  "O3-U01-easy",
  "O3-U01-hard",
  "O3-U02-easy",
  "O3-U02-hard",
  "O3-U03",
  "O3-U04-easy",
  "O3-U04-hard",
]);

const ORDER3_ONE_PARAM_TEMPLATE_IDS = new Set(["O3-P01-easy", "O3-P01-hard", "O3-P02", "O3-P03"]);

const ORDER3_TWO_PARAM_TEMPLATE_IDS = new Set([
  "O3-T01-easy",
  "O3-T01-bounded-plus",
  "O3-T01-bounded-minus",
  "O3-T01-decay-plus",
  "O3-T01-decay-minus",
  "O3-T01-zero-plus",
  "O3-T01-zero-minus",
]);

const ORDER3_IMPOSSIBLE_TEMPLATE_IDS = new Set([
  "O3-I01-easy",
  "O3-I01-hard",
  "O3-I02",
  "O3-I03",
  "O3-I04",
  "O3-I05",
  "O3-I06",
  "O3-I07",
  "O3-I08",
  "O3-I09",
  "O3-I10",
  "O3-I11",
  "O3-I12",
  "O3-I13",
  "O3-I14",
  "O3-I15",
  "O3-I16-plus",
  "O3-I16-minus",
]);

export function order3TemplateMatchesCaseFilter(
  template: Order3ReconstructionTemplate,
  caseFilter: ReconstructionCaseFilter,
): boolean {
  if (caseFilter === "mixed") {
    return true;
  }
  if (caseFilter === "unique") {
    return ORDER3_UNIQUE_TEMPLATE_IDS.has(template.id);
  }
  if (caseFilter === "one-real-parameter") {
    return ORDER3_ONE_PARAM_TEMPLATE_IDS.has(template.id);
  }
  if (caseFilter === "two-parameter") {
    return ORDER3_TWO_PARAM_TEMPLATE_IDS.has(template.id);
  }
  return ORDER3_IMPOSSIBLE_TEMPLATE_IDS.has(template.id);
}

export function order3TemplateMatchesDifficulty(
  template: Order3ReconstructionTemplate,
  difficulty: Difficulty,
): boolean {
  const rank: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
  return rank[template.difficulty] <= rank[difficulty];
}

export function pickMixedOutcomeCategoryOrder3(rng: RandomSource): ReconstructionOutcome {
  const roll = rng.integer(0, 3);
  if (roll === 0) {
    return "unique";
  }
  if (roll === 1) {
    return "one-real-parameter";
  }
  if (roll === 2) {
    return "two-parameter";
  }
  return "impossible";
}

export const ORDER3_FALLBACK_TEMPLATE_ID = "O3-P01-easy";

export const ORDER2_FALLBACK_TEMPLATE_ID = "O2-F01";
