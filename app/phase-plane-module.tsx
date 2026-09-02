"use client";

import Link from "next/link";
import katex from "katex";
import { useEffect, useMemo, useRef, useState } from "react";
import { InlineMath } from "react-katex";

type Matrix = [[number, number], [number, number]];
type Vec = [number, number];
type ScaleMode = "normalized" | "physical";
type ActivityTab = "phase-intro" | "phase-lab" | "matrix-assembler" | "self-practice";
type MatrixAssemblerKind =
  | "saddle"
  | "stable-node"
  | "unstable-node"
  | "stable-star"
  | "unstable-star"
  | "stable-defective-node"
  | "unstable-defective-node"
  | "center"
  | "stable-spiral"
  | "unstable-spiral";
type LambdaRequirement = "negative" | "positive" | "nonzero";
type PhaseKind =
  | MatrixAssemblerKind
  | "stable-equilibrium-line"
  | "unstable-equilibrium-line"
  | "nilpotent"
  | "zero-field";
type Difficulty = "easy" | "medium" | "hard";
type PracticeActivity = "matrix-to-portrait" | "portrait-to-class";
type QuizMode = "qualitative" | "exact";
type PracticeQuestion = {
  phaseCase: GeneratedPhaseCase;
  portraitOptions: PortraitQuizOption[];
  classificationOptions: ClassificationQuizOption[];
};

type RandomSource = {
  next: () => number;
  integer: (min: number, max: number) => number;
  pick: <T,>(items: readonly T[]) => T;
  shuffle: <T,>(items: readonly T[]) => T[];
};

type GeneratedPhaseCase = {
  id: string;
  seed: number;
  difficulty: Difficulty;
  kind: PhaseKind;
  matrix: Matrix;
  canonicalBlock: Matrix;
  basis: Matrix;
  trace: number;
  determinant: number;
  discriminant: number;
};

type PortraitQuizOption = {
  id: string;
  kind: PhaseKind;
  matrix: Matrix;
};

type ClassificationQuizOption = {
  id: string;
  kind: PhaseKind;
  label: string;
};

type QuizSessionStats = {
  answered: number;
  correct: number;
  currentStreak: number;
  bestStreak: number;
};

type MistakeRecord = {
  id: string;
  activity: PracticeActivity;
  difficulty: Difficulty;
  seed: number;
  matrix: Matrix;
  correctKind: PhaseKind;
  selectedKind: PhaseKind;
  selectedLabel: string;
  correctLabel: string;
  explanation: string;
  createdAt: number;
};

type MatrixAssemblerConfig = {
  kind: MatrixAssemblerKind;
  label: string;
  firstTitle: string;
  firstLambdaLabel: string;
  firstLambdaMath: string;
  firstLambdaSign: LambdaRequirement;
  firstVectorLabel?: string;
  firstVectorMath?: string;
  secondTitle: string;
  secondLambdaLabel: string;
  secondLambdaMath: string;
  secondLambdaSign: LambdaRequirement;
  secondVectorLabel: string;
  secondVectorMath?: string;
  requiresSecondLambda: boolean;
  requiresIndependentVectors: boolean;
  matrixModel: "diagonal" | "star" | "defective" | "complex";
};

type VectorReference = {
  vector: Vec;
  labelIndex: number;
};

type PrincipalAxis = {
  vector: Vec;
  label: string;
};

type EigenPair = {
  lambda: number;
  vector: Vec;
};

type SaddleData = {
  stable: EigenPair;
  unstable: EigenPair;
};

type NodeData = {
  slow: EigenPair;
  fast: EigenPair;
  stable: boolean;
};

type StarData = {
  lambda: number;
  stable: boolean;
};

type DefectiveNodeData = {
  lambda: number;
  eigenvector: Vec;
  generalizedVector: Vec;
  stable: boolean;
};

type CenterData = {
  beta: number;
};

type SpiralData = {
  alpha: number;
  beta: number;
  stable: boolean;
};

type ZeroEigenData =
  | {
      kind: "line";
      equilibrium: EigenPair;
      moving: EigenPair;
      stable: boolean;
    }
  | {
      kind: "nilpotent";
      equilibriumVector: Vec;
      generalizedVector: Vec;
    }
  | {
      kind: "zero";
    };

type SaddleSample = {
  stableCoefficient: number;
  unstableCoefficient: number;
};

type CenterSample = {
  x: number;
  y: number;
};

const SADDLE_AXIS_COLOR = "#2C456B";
const SADDLE_CURVE_COLOR = "#FF9D00";
const EIGEN_VECTOR_COLOR = "#83AFF0";

const defaultSaddleSamples: SaddleSample[] = [
  { stableCoefficient: 0.95, unstableCoefficient: 0.95 },
  { stableCoefficient: 0.95, unstableCoefficient: -0.95 },
  { stableCoefficient: -0.95, unstableCoefficient: 0.95 },
  { stableCoefficient: -0.95, unstableCoefficient: -0.95 },
  { stableCoefficient: 1.55, unstableCoefficient: 1.55 },
  { stableCoefficient: 1.55, unstableCoefficient: -1.55 },
  { stableCoefficient: -1.55, unstableCoefficient: 1.55 },
  { stableCoefficient: -1.55, unstableCoefficient: -1.55 },
];

const defaultStarSamples: SaddleSample[] = [
  0,
  Math.PI / 10,
  Math.PI / 5,
  (3 * Math.PI) / 10,
  Math.PI / 2,
  (7 * Math.PI) / 10,
  (4 * Math.PI) / 5,
  (9 * Math.PI) / 10,
].map((angle) => ({
  stableCoefficient: Number(Math.cos(angle).toFixed(3)),
  unstableCoefficient: Number(Math.sin(angle).toFixed(3)),
}));

const emptySaddleSample: SaddleSample = {
  stableCoefficient: 1,
  unstableCoefficient: 1,
};

const defaultCenterSamples: CenterSample[] = [
  { x: 0.55, y: 0 },
  { x: 0.95, y: 0 },
  { x: 1.35, y: 0 },
  { x: 1.75, y: 0 },
  { x: 2.15, y: 0 },
  { x: 2.55, y: 0 },
];

const emptyCenterSample: CenterSample = {
  x: 1,
  y: 0,
};

const matrixAssemblerConfigs: MatrixAssemblerConfig[] = [
  {
    kind: "saddle",
    label: "אוכף",
    firstTitle: "נתוני הערך השלילי",
    firstLambdaLabel: "ע״ע שלילי",
    firstLambdaMath: String.raw`\lambda_1<0`,
    firstLambdaSign: "negative",
    secondTitle: "נתוני הערך החיובי",
    secondLambdaLabel: "ע״ע חיובי",
    secondLambdaMath: String.raw`\lambda_2>0`,
    secondLambdaSign: "positive",
    secondVectorLabel: "וקטור עצמי",
    requiresSecondLambda: true,
    requiresIndependentVectors: true,
    matrixModel: "diagonal",
  },
  {
    kind: "stable-node",
    label: "צומת יציב",
    firstTitle: "נתוני הערך הראשון",
    firstLambdaLabel: "ע״ע שלילי",
    firstLambdaMath: String.raw`\lambda_1<0`,
    firstLambdaSign: "negative",
    secondTitle: "נתוני הערך השני",
    secondLambdaLabel: "ע״ע שלילי",
    secondLambdaMath: String.raw`\lambda_2<0`,
    secondLambdaSign: "negative",
    secondVectorLabel: "וקטור עצמי",
    requiresSecondLambda: true,
    requiresIndependentVectors: true,
    matrixModel: "diagonal",
  },
  {
    kind: "unstable-node",
    label: "צומת לא יציב",
    firstTitle: "נתוני הערך הראשון",
    firstLambdaLabel: "ע״ע חיובי",
    firstLambdaMath: String.raw`\lambda_1>0`,
    firstLambdaSign: "positive",
    secondTitle: "נתוני הערך השני",
    secondLambdaLabel: "ע״ע חיובי",
    secondLambdaMath: String.raw`\lambda_2>0`,
    secondLambdaSign: "positive",
    secondVectorLabel: "וקטור עצמי",
    requiresSecondLambda: true,
    requiresIndependentVectors: true,
    matrixModel: "diagonal",
  },
  {
    kind: "stable-star",
    label: "כוכב יציב",
    firstTitle: "נתוני הערך העצמי",
    firstLambdaLabel: "ע״ע שלילי",
    firstLambdaMath: String.raw`\lambda<0`,
    firstLambdaSign: "negative",
    secondTitle: "בסיס של וקטורים עצמיים",
    secondLambdaLabel: "",
    secondLambdaMath: "",
    secondLambdaSign: "negative",
    secondVectorLabel: "וקטור עצמי",
    requiresSecondLambda: false,
    requiresIndependentVectors: true,
    matrixModel: "star",
  },
  {
    kind: "unstable-star",
    label: "כוכב לא יציב",
    firstTitle: "נתוני הערך העצמי",
    firstLambdaLabel: "ע״ע חיובי",
    firstLambdaMath: String.raw`\lambda>0`,
    firstLambdaSign: "positive",
    secondTitle: "בסיס של וקטורים עצמיים",
    secondLambdaLabel: "",
    secondLambdaMath: "",
    secondLambdaSign: "positive",
    secondVectorLabel: "וקטור עצמי",
    requiresSecondLambda: false,
    requiresIndependentVectors: true,
    matrixModel: "star",
  },
  {
    kind: "stable-defective-node",
    label: "צומת מנוון יציב",
    firstTitle: "ערך עצמי ווקטור עצמי",
    firstLambdaLabel: "ע״ע שלילי",
    firstLambdaMath: String.raw`\lambda<0`,
    firstLambdaSign: "negative",
    secondTitle: "וקטור חבר",
    secondLambdaLabel: "",
    secondLambdaMath: "",
    secondLambdaSign: "negative",
    secondVectorLabel: "וקטור חבר",
    requiresSecondLambda: false,
    requiresIndependentVectors: true,
    matrixModel: "defective",
  },
  {
    kind: "unstable-defective-node",
    label: "צומת מנוון לא יציב",
    firstTitle: "ערך עצמי ווקטור עצמי",
    firstLambdaLabel: "ע״ע חיובי",
    firstLambdaMath: String.raw`\lambda>0`,
    firstLambdaSign: "positive",
    secondTitle: "וקטור חבר",
    secondLambdaLabel: "",
    secondLambdaMath: "",
    secondLambdaSign: "positive",
    secondVectorLabel: "וקטור חבר",
    requiresSecondLambda: false,
    requiresIndependentVectors: true,
    matrixModel: "defective",
  },
  {
    kind: "center",
    label: "מרכז",
    firstTitle: "ערך עצמי מדומה",
    firstLambdaLabel: "מקדם מדומה",
    firstLambdaMath: String.raw`\lambda=\beta i,\ \beta\ne0`,
    firstLambdaSign: "nonzero",
    firstVectorLabel: "חלק ממשי",
    firstVectorMath: String.raw`U`,
    secondTitle: "וקטור עצמי מרוכב",
    secondLambdaLabel: "",
    secondLambdaMath: "",
    secondLambdaSign: "nonzero",
    secondVectorLabel: "חלק מדומה",
    secondVectorMath: String.raw`W`,
    requiresSecondLambda: false,
    requiresIndependentVectors: true,
    matrixModel: "complex",
  },
  {
    kind: "stable-spiral",
    label: "ספירלה יציבה",
    firstTitle: "החלק הממשי של הערך העצמי",
    firstLambdaLabel: "חלק ממשי",
    firstLambdaMath: String.raw`\alpha<0`,
    firstLambdaSign: "negative",
    firstVectorLabel: "חלק ממשי",
    firstVectorMath: String.raw`U`,
    secondTitle: "הווקטור העצמי המרוכב",
    secondLambdaLabel: "מקדם מדומה",
    secondLambdaMath: String.raw`\beta\ne0`,
    secondLambdaSign: "nonzero",
    secondVectorLabel: "חלק מדומה",
    secondVectorMath: String.raw`W`,
    requiresSecondLambda: true,
    requiresIndependentVectors: true,
    matrixModel: "complex",
  },
  {
    kind: "unstable-spiral",
    label: "ספירלה לא יציבה",
    firstTitle: "החלק הממשי של הערך העצמי",
    firstLambdaLabel: "חלק ממשי",
    firstLambdaMath: String.raw`\alpha>0`,
    firstLambdaSign: "positive",
    firstVectorLabel: "חלק ממשי",
    firstVectorMath: String.raw`U`,
    secondTitle: "הווקטור העצמי המרוכב",
    secondLambdaLabel: "מקדם מדומה",
    secondLambdaMath: String.raw`\beta\ne0`,
    secondLambdaSign: "nonzero",
    secondVectorLabel: "חלק מדומה",
    secondVectorMath: String.raw`W`,
    requiresSecondLambda: true,
    requiresIndependentVectors: true,
    matrixModel: "complex",
  },
];

type Preset = {
  name: string;
  matrix: Matrix;
};

type PresetGroup = {
  title: string;
  presets: Preset[];
};

const presetGroups: PresetGroup[] = [
  {
    title: "ע״ע ממשיים",
    presets: [
      { name: "אוכף", matrix: [[4, 0], [0, -1]] },
      { name: "צומת יציב", matrix: [[-2.3, 0.6], [0.1, -0.8]] },
      { name: "צומת לא יציב", matrix: [[2.3, 0.6], [0.1, 0.8]] },
      { name: "צומת מנוון יציב", matrix: [[-1, 1], [0, -1]] },
      { name: "צומת מנוון לא יציב", matrix: [[1, 1], [0, 1]] },
      { name: "כוכב יציב", matrix: [[-1.2, 0], [0, -1.2]] },
      { name: "כוכב לא יציב", matrix: [[1.2, 0], [0, 1.2]] },
    ],
  },
  {
    title: "ע״ע מרוכבים",
    presets: [
      { name: "מרכז", matrix: [[0, -1.4], [1.4, 0]] },
      { name: "ספירלה יציבה", matrix: [[-0.35, -1.15], [1.15, -0.35]] },
      { name: "ספירלה לא יציבה", matrix: [[0.35, -1.15], [1.15, 0.35]] },
    ],
  },
  {
    title: "ע״ע אפס",
    presets: [
      { name: "ישר שיווי־משקל יציב", matrix: [[0, 0], [0, -1.2]] },
      { name: "ישר שיווי־משקל לא יציב", matrix: [[0, 0], [0, 1.2]] },
      { name: "נילפוטנטי", matrix: [[0, 1], [0, 0]] },
      { name: "שדה אפס", matrix: [[0, 0], [0, 0]] },
    ],
  },
];

const phaseKindLabels: Record<PhaseKind, string> = {
  saddle: "אוכף",
  "stable-node": "צומת יציב",
  "unstable-node": "צומת לא יציב",
  "stable-star": "כוכב יציב",
  "unstable-star": "כוכב לא יציב",
  "stable-defective-node": "צומת מנוונת יציבה",
  "unstable-defective-node": "צומת מנוונת לא יציבה",
  center: "מרכז",
  "stable-spiral": "ספירלה יציבה",
  "unstable-spiral": "ספירלה לא יציבה",
  "stable-equilibrium-line": "ישר שיווי־משקל יציב",
  "unstable-equilibrium-line": "ישר שיווי־משקל לא יציב",
  nilpotent: "מקרה נילפוטנטי",
  "zero-field": "שדה אפס",
};

const classificationToKind: Record<string, PhaseKind> = {
  אוכף: "saddle",
  "צומת יציב": "stable-node",
  "צומת לא יציב": "unstable-node",
  "כוכב יציב": "stable-star",
  "כוכב לא יציב": "unstable-star",
  "צומת מנוונת יציבה": "stable-defective-node",
  "צומת מנוונת לא יציבה": "unstable-defective-node",
  מרכז: "center",
  "ספירלה יציבה": "stable-spiral",
  "ספירלה לא יציבה": "unstable-spiral",
  "ישר שיווי־משקל יציב": "stable-equilibrium-line",
  "ישר שיווי־משקל לא יציב": "unstable-equilibrium-line",
  "מקרה נילפוטנטי": "nilpotent",
  "שדה אפס": "zero-field",
};

const distractorMap: Record<PhaseKind, PhaseKind[]> = {
  saddle: ["stable-node", "unstable-node", "stable-equilibrium-line"],
  "stable-node": ["unstable-node", "saddle", "stable-spiral"],
  "unstable-node": ["stable-node", "saddle", "unstable-spiral"],
  "stable-star": ["stable-node", "stable-defective-node", "center"],
  "unstable-star": ["unstable-node", "unstable-defective-node", "center"],
  "stable-defective-node": ["stable-node", "stable-star", "unstable-defective-node"],
  "unstable-defective-node": ["unstable-node", "unstable-star", "stable-defective-node"],
  center: ["stable-spiral", "unstable-spiral", "stable-star"],
  "stable-spiral": ["unstable-spiral", "center", "stable-node"],
  "unstable-spiral": ["stable-spiral", "center", "unstable-node"],
  "stable-equilibrium-line": ["unstable-equilibrium-line", "nilpotent", "zero-field"],
  "unstable-equilibrium-line": ["stable-equilibrium-line", "nilpotent", "zero-field"],
  nilpotent: ["zero-field", "stable-equilibrium-line", "unstable-equilibrium-line"],
  "zero-field": ["nilpotent", "stable-equilibrium-line", "unstable-equilibrium-line"],
};

const difficultyLabels: Record<Difficulty, string> = {
  easy: "קל",
  medium: "בינוני",
  hard: "קשה",
};

const practiceActivityLabels: Record<PracticeActivity, string> = {
  "matrix-to-portrait": "מטריצה לתמונה",
  "portrait-to-class": "תמונה לסיווג",
};

const difficultyKinds: Record<Difficulty, PhaseKind[]> = {
  easy: ["saddle", "stable-node", "unstable-node", "center", "stable-spiral", "unstable-spiral"],
  medium: [
    "saddle",
    "stable-node",
    "unstable-node",
    "stable-star",
    "unstable-star",
    "stable-defective-node",
    "unstable-defective-node",
    "center",
    "stable-spiral",
    "unstable-spiral",
  ],
  hard: [
    "saddle",
    "stable-node",
    "unstable-node",
    "stable-star",
    "unstable-star",
    "stable-defective-node",
    "unstable-defective-node",
    "center",
    "stable-spiral",
    "unstable-spiral",
    "stable-equilibrium-line",
    "unstable-equilibrium-line",
    "nilpotent",
    "zero-field",
  ],
};

const difficultyMaxEntry: Record<Difficulty, number> = {
  easy: 6,
  medium: 10,
  hard: 16,
};

const easyBases: Matrix[] = [
  [[1, 0], [0, 1]],
  [[0, 1], [1, 0]],
  [[1, 1], [0, 1]],
  [[1, 0], [1, 1]],
  [[1, 1], [-1, 1]],
  [[1, -1], [1, 1]],
];

const mediumBases: Matrix[] = [
  ...easyBases,
  [[1, 2], [0, 1]],
  [[2, 1], [1, 1]],
  [[1, -2], [1, -1]],
  [[2, -1], [1, 1]],
];

const hardBases: Matrix[] = [
  ...mediumBases,
  [[2, 1], [-1, 1]],
  [[1, 2], [-2, 1]],
  [[3, 1], [1, 1]],
  [[1, -2], [2, 1]],
];

class SeededRandom implements RandomSource {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }

  next() {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  integer(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(items: readonly T[]) {
    return items[this.integer(0, items.length - 1)];
  }

  shuffle<T>(items: readonly T[]) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = this.integer(0, index);
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }
}

function mixSeed(seed: number, salt: number) {
  let state = (seed ^ salt) >>> 0;
  state ^= state >>> 16;
  state = Math.imul(state, 0x7feb352d);
  state ^= state >>> 15;
  state = Math.imul(state, 0x846ca68b);
  state ^= state >>> 16;
  return state >>> 0 || 1;
}

const initialSeeds: Vec[] = [
  [-2.4, -1.8],
  [-2.4, -0.9],
  [-2.4, 0.9],
  [-2.4, 1.8],
  [-1.2, -2.3],
  [-0.6, -1.8],
  [0.6, 1.8],
  [1.2, 2.3],
  [2.4, -1.8],
  [2.4, -0.9],
  [2.4, 0.9],
  [2.4, 1.8],
  [-1.8, 0.35],
  [-0.35, 1.8],
  [0.35, -1.8],
  [1.8, -0.35],
];

function multiply(matrix: Matrix, vector: Vec): Vec {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1],
  ];
}

function add(a: Vec, b: Vec): Vec {
  return [a[0] + b[0], a[1] + b[1]];
}

function scale(v: Vec, factor: number): Vec {
  return [v[0] * factor, v[1] * factor];
}

function norm(v: Vec): number {
  return Math.hypot(v[0], v[1]);
}

function maxMatrixAbs(matrix: Matrix): number {
  return Math.max(
    Math.abs(matrix[0][0]),
    Math.abs(matrix[0][1]),
    Math.abs(matrix[1][0]),
    Math.abs(matrix[1][1]),
  );
}

function determinant(matrix: Matrix): number {
  return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
}

function trace(matrix: Matrix): number {
  return matrix[0][0] + matrix[1][1];
}

function discriminant(matrix: Matrix): number {
  const tr = trace(matrix);
  return tr * tr - 4 * determinant(matrix);
}

function vectorDeterminant(first: Vec, second: Vec): number {
  return first[0] * second[1] - first[1] * second[0];
}

function multiplyMatrices(left: Matrix, right: Matrix): Matrix {
  return [
    [
      left[0][0] * right[0][0] + left[0][1] * right[1][0],
      left[0][0] * right[0][1] + left[0][1] * right[1][1],
    ],
    [
      left[1][0] * right[0][0] + left[1][1] * right[1][0],
      left[1][0] * right[0][1] + left[1][1] * right[1][1],
    ],
  ];
}

function basisMatrix(first: Vec, second: Vec): Matrix {
  return [
    [first[0], second[0]],
    [first[1], second[1]],
  ];
}

function inverseBasisMatrix(first: Vec, second: Vec): Matrix {
  const det = vectorDeterminant(first, second);
  return [
    [second[1] / det, -second[0] / det],
    [-first[1] / det, first[0] / det],
  ];
}

function matrixFromBasisModel(first: Vec, second: Vec, model: Matrix): Matrix {
  return multiplyMatrices(multiplyMatrices(basisMatrix(first, second), model), inverseBasisMatrix(first, second));
}

function diagonalMatrixFromEigenData(firstLambda: number, firstVector: Vec, secondLambda: number, secondVector: Vec): Matrix {
  return matrixFromBasisModel(firstVector, secondVector, [
    [firstLambda, 0],
    [0, secondLambda],
  ]);
}

function defectiveMatrixFromJordanData(lambda: number, eigenvector: Vec, generalizedVector: Vec): Matrix {
  return matrixFromBasisModel(eigenvector, generalizedVector, [
    [lambda, 1],
    [0, lambda],
  ]);
}

function complexMatrixFromEigenData(alpha: number, beta: number, realPart: Vec, imaginaryPart: Vec): Matrix {
  return matrixFromBasisModel(realPart, imaginaryPart, [
    [alpha, beta],
    [-beta, alpha],
  ]);
}

function columnsFromBasis(basis: Matrix): [Vec, Vec] {
  return [
    [basis[0][0], basis[1][0]],
    [basis[0][1], basis[1][1]],
  ];
}

function classifyKind(matrix: Matrix): PhaseKind {
  const kind = classificationToKind[classify(matrix)];
  if (!kind) throw new Error(`Unsupported phase classification: ${classify(matrix)}`);
  return kind;
}

function sampleBasis(difficulty: Difficulty, rng: RandomSource): Matrix {
  const bases = difficulty === "easy" ? easyBases : difficulty === "medium" ? mediumBases : hardBases;
  return rng.pick(bases);
}

function canonicalModelForKind(kind: PhaseKind, difficulty: Difficulty, rng: RandomSource): Matrix {
  const integerPool = difficulty === "easy" ? [1, 2, 3, 4] : difficulty === "medium" ? [1, 1.5, 2, 2.5, 3] : [1, 2, 3, 4, 5];
  const signed = (sign: 1 | -1) => sign * rng.pick(integerPool);
  const unequalPair = (sign: 1 | -1): [number, number] => {
    const first = signed(sign);
    let second = signed(sign);
    if (Math.abs(first - second) < 1e-8) second += sign;
    return [first, second];
  };

  if (kind === "saddle") return [[-rng.pick(integerPool), 0], [0, rng.pick(integerPool)]];
  if (kind === "stable-node") {
    const [lambda1, lambda2] = unequalPair(-1);
    return [[lambda1, 0], [0, lambda2]];
  }
  if (kind === "unstable-node") {
    const [lambda1, lambda2] = unequalPair(1);
    return [[lambda1, 0], [0, lambda2]];
  }
  if (kind === "stable-star") {
    const lambda = -rng.pick(integerPool);
    return [[lambda, 0], [0, lambda]];
  }
  if (kind === "unstable-star") {
    const lambda = rng.pick(integerPool);
    return [[lambda, 0], [0, lambda]];
  }
  if (kind === "stable-defective-node") {
    const lambda = -rng.pick(integerPool);
    return [[lambda, 1], [0, lambda]];
  }
  if (kind === "unstable-defective-node") {
    const lambda = rng.pick(integerPool);
    return [[lambda, 1], [0, lambda]];
  }
  if (kind === "center") {
    const beta = -rng.pick(difficulty === "easy" ? [1, 1.4, 2] : [0.8, 1.2, 1.6, 2.2]);
    return [[0, beta], [-beta, 0]];
  }
  if (kind === "stable-spiral") {
    const alpha = difficulty === "easy" ? -0.45 : -rng.pick([0.3, 0.5, 0.75, 1]);
    const beta = -rng.pick([1, 1.25, 1.6, 2]);
    return [[alpha, beta], [-beta, alpha]];
  }
  if (kind === "unstable-spiral") {
    const alpha = difficulty === "easy" ? 0.45 : rng.pick([0.3, 0.5, 0.75, 1]);
    const beta = -rng.pick([1, 1.25, 1.6, 2]);
    return [[alpha, beta], [-beta, alpha]];
  }
  if (kind === "stable-equilibrium-line") return [[0, 0], [0, -rng.pick(integerPool)]];
  if (kind === "unstable-equilibrium-line") return [[0, 0], [0, rng.pick(integerPool)]];
  if (kind === "nilpotent") return [[0, 1], [0, 0]];
  return [[0, 0], [0, 0]];
}

function buildMatrixFromCanonical(kind: PhaseKind, canonicalBlock: Matrix, basis: Matrix): Matrix {
  if (kind === "stable-star" || kind === "unstable-star" || kind === "zero-field") return canonicalBlock;
  const [first, second] = columnsFromBasis(basis);
  return matrixFromBasisModel(first, second, canonicalBlock);
}

function passesPracticeQuality(matrix: Matrix, difficulty: Difficulty): boolean {
  if (maxMatrixAbs(matrix) > difficultyMaxEntry[difficulty] + 1e-8) return false;
  return matrix.every((row) => row.every((value) => Number.isFinite(value)));
}

function generatePhaseCase(
  requestedKind: PhaseKind,
  difficulty: Difficulty,
  rng: RandomSource,
  forcedBasis?: Matrix,
): GeneratedPhaseCase {
  for (let attempt = 0; attempt < 250; attempt += 1) {
    const basis = forcedBasis ?? sampleBasis(difficulty, rng);
    const canonicalBlock = canonicalModelForKind(requestedKind, difficulty, rng);
    const matrix = buildMatrixFromCanonical(requestedKind, canonicalBlock, basis);
    if (!passesPracticeQuality(matrix, difficulty)) continue;
    if (classifyKind(matrix) !== requestedKind) continue;

    return {
      id: `${requestedKind}-${difficulty}-${rng.integer(1000, 999999)}`,
      seed: rng.integer(1, 999999),
      difficulty,
      kind: requestedKind,
      matrix,
      canonicalBlock,
      basis,
      trace: trace(matrix),
      determinant: determinant(matrix),
      discriminant: discriminant(matrix),
    };
  }

  const fallback = presetGroups.flatMap((group) => group.presets).find((preset) => classifyKind(preset.matrix) === requestedKind);
  const matrix = fallback?.matrix ?? [[0, 0], [0, 0]];
  return {
    id: `${requestedKind}-${difficulty}-fallback`,
    seed: 0,
    difficulty,
    kind: classifyKind(matrix),
    matrix,
    canonicalBlock: matrix,
    basis: [[1, 0], [0, 1]],
    trace: trace(matrix),
    determinant: determinant(matrix),
    discriminant: discriminant(matrix),
  };
}

function generatePracticeCase(difficulty: Difficulty, seed: number): GeneratedPhaseCase {
  const allowedKinds = difficultyKinds[difficulty];
  const requestedKind = allowedKinds[Math.abs(seed) % allowedKinds.length];
  const rng = new SeededRandom(mixSeed(seed, 0x104136));
  return generatePhaseCase(requestedKind, difficulty, rng);
}

function buildPracticeQuestion(difficulty: Difficulty, quizMode: QuizMode, seed: number): PracticeQuestion {
  const phaseCase = generatePracticeCase(difficulty, seed);
  return {
    phaseCase,
    portraitOptions: buildPortraitOptions(phaseCase, quizMode, seed),
    classificationOptions: buildClassificationOptions(phaseCase, seed),
  };
}

function buildOptionKinds(kind: PhaseKind, difficulty: Difficulty): PhaseKind[] {
  const allowedKinds = difficultyKinds[difficulty];
  const allowed = new Set<PhaseKind>(allowedKinds);
  const optionKinds: PhaseKind[] = [kind];

  for (const distractor of distractorMap[kind]) {
    if (optionKinds.length >= 4) break;
    if (allowed.has(distractor) && !optionKinds.includes(distractor)) {
      optionKinds.push(distractor);
    }
  }

  for (const candidate of allowedKinds) {
    if (optionKinds.length >= 4) break;
    if (!optionKinds.includes(candidate)) {
      optionKinds.push(candidate);
    }
  }

  return optionKinds;
}

function buildPortraitOptions(phaseCase: GeneratedPhaseCase, mode: QuizMode, seed: number): PortraitQuizOption[] {
  const rng = new SeededRandom(seed + 1701);
  const optionKinds = buildOptionKinds(phaseCase.kind, phaseCase.difficulty);
  const options = optionKinds.map((kind, index) => {
    if (kind === phaseCase.kind) {
      return { id: `portrait-${index}-${kind}`, kind, matrix: phaseCase.matrix };
    }

    const basis = mode === "exact" ? phaseCase.basis : undefined;
    const optionCase = generatePhaseCase(kind, phaseCase.difficulty, rng, basis);
    return { id: `portrait-${index}-${kind}`, kind, matrix: optionCase.matrix };
  });
  return rng.shuffle(options);
}

function buildClassificationOptions(phaseCase: GeneratedPhaseCase, seed: number): ClassificationQuizOption[] {
  const rng = new SeededRandom(seed + 2609);
  const options = buildOptionKinds(phaseCase.kind, phaseCase.difficulty).map((kind, index) => ({
    id: `classification-${index}-${kind}`,
    kind,
    label: phaseKindLabels[kind],
  }));
  return rng.shuffle(options);
}

function matrixFeedbackText(phaseCase: GeneratedPhaseCase): string {
  const tr = phaseCase.trace;
  const det = phaseCase.determinant;
  const disc = phaseCase.discriminant;
  if (Math.abs(det) < 1e-8) {
    if (maxMatrixAbs(phaseCase.matrix) < 1e-8) return "כל איברי המטריצה אפס, ולכן כל נקודה היא נקודת שיווי־משקל.";
    if (Math.abs(tr) < 1e-8) return "הדטרמיננטה והעקבה אפס, אך המטריצה אינה אפס: זהו המקרה הנילפוטנטי.";
    return tr < 0
      ? "יש ערך עצמי אפס וערך עצמי שלילי, ולכן הפתרונות מתקרבים לישר שיווי־המשקל."
      : "יש ערך עצמי אפס וערך עצמי חיובי, ולכן הפתרונות מתרחקים מישר שיווי־המשקל.";
  }
  if (det < 0) return "הדטרמיננטה שלילית, ולכן לערכים העצמיים סימנים מנוגדים: מתקבל אוכף.";
  if (disc < 0) {
    if (Math.abs(tr) < 1e-8) return "הדיסקרימיננטה שלילית והעקבה אפס, ולכן מתקבל מרכז.";
    return tr < 0
      ? "הדיסקרימיננטה שלילית והעקבה שלילית, ולכן מתקבלת ספירלה יציבה."
      : "הדיסקרימיננטה שלילית והעקבה חיובית, ולכן מתקבלת ספירלה לא יציבה.";
  }
  if (disc > 0) {
    return tr < 0
      ? "הדיסקרימיננטה חיובית והעקבה שלילית, ולכן שני הערכים העצמיים ממשיים ושליליים."
      : "הדיסקרימיננטה חיובית והעקבה חיובית, ולכן שני הערכים העצמיים ממשיים וחיוביים.";
  }
  return "הדיסקרימיננטה אפס, ולכן צריך להבחין בין כוכב לבין צומת מנוונת לפי צורת המטריצה.";
}

function polynomialTerm(value: number, variable = "") {
  if (Math.abs(value) < 0.0005) return "";
  const sign = value < 0 ? "-" : "+";
  const absolute = Math.abs(value);
  const coefficient = variable && Math.abs(absolute - 1) < 0.0005 ? "" : formatNumber(absolute);
  return `${sign}${coefficient}${variable}`;
}

function characteristicPolynomialLatex(phaseCase: GeneratedPhaseCase) {
  const lambdaTerm = polynomialTerm(-phaseCase.trace, String.raw`\lambda`);
  const constantTerm = polynomialTerm(phaseCase.determinant);
  return String.raw`\lambda^2${lambdaTerm}${constantTerm}=0`;
}

function eigenvalueFormulaLatex(phaseCase: GeneratedPhaseCase) {
  const tr = formatNumber(phaseCase.trace);
  const disc = phaseCase.discriminant;
  if (disc >= -1e-8) {
    return String.raw`\lambda_{1,2}=\frac{${tr}\pm\sqrt{${formatNumber(Math.max(disc, 0))}}}{2}`;
  }
  return String.raw`\lambda_{1,2}=\frac{${tr}\pm i\sqrt{${formatNumber(-disc)}}}{2}`;
}

function diagonalizationNote(kind: PhaseKind) {
  if (kind === "stable-defective-node" || kind === "unstable-defective-node") {
    return "הערך העצמי חוזר ואין שני וקטורים עצמיים בלתי־תלויים, ולכן המטריצה אינה לכסינה. זו תמונת צומת מנוונת.";
  }
  if (kind === "nilpotent") {
    return "הערך העצמי היחיד הוא 0 והמטריצה אינה אפס, ולכן אין שני וקטורים עצמיים בלתי־תלויים. המטריצה אינה לכסינה.";
  }
  if (kind === "stable-star" || kind === "unstable-star" || kind === "zero-field") {
    return "המטריצה היא כפולה סקלרית של הזהות, ולכן היא לכסינה וכל כיוון הוא כיוון עצמי.";
  }
  if (kind === "center" || kind === "stable-spiral" || kind === "unstable-spiral") {
    return "הערכים העצמיים מרוכבים צמודים. מעל הממשיים לא מקבלים שני כיוונים עצמיים ממשיים, ולכן התמונה נקבעת לפי סיבוב והחלק הממשי.";
  }
  return "יש שני ערכים עצמיים ממשיים שונים, ולכן המטריצה לכסינה.";
}

function eigenvalueConclusion(kind: PhaseKind) {
  if (kind === "saddle") return "הערכים העצמיים ממשיים ובעלי סימנים מנוגדים, ולכן מתקבל אוכף.";
  if (kind === "stable-node") return "שני הערכים העצמיים ממשיים ושליליים, ולכן מתקבל צומת יציב.";
  if (kind === "unstable-node") return "שני הערכים העצמיים ממשיים וחיוביים, ולכן מתקבל צומת לא יציב.";
  if (kind === "stable-star") return "הערך העצמי השלילי חוזר והמטריצה סקלרית, ולכן מתקבל כוכב יציב.";
  if (kind === "unstable-star") return "הערך העצמי החיובי חוזר והמטריצה סקלרית, ולכן מתקבל כוכב לא יציב.";
  if (kind === "stable-defective-node") return "הערך העצמי השלילי חוזר והמטריצה אינה לכסינה, ולכן מתקבלת צומת מנוונת יציבה.";
  if (kind === "unstable-defective-node") return "הערך העצמי החיובי חוזר והמטריצה אינה לכסינה, ולכן מתקבלת צומת מנוונת לא יציבה.";
  if (kind === "center") return "הערכים העצמיים מדומים טהורים, ולכן מתקבל מרכז.";
  if (kind === "stable-spiral") return "לערכים העצמיים חלק ממשי שלילי וחלק מדומה שונה מאפס, ולכן מתקבלת ספירלה יציבה.";
  if (kind === "unstable-spiral") return "לערכים העצמיים חלק ממשי חיובי וחלק מדומה שונה מאפס, ולכן מתקבלת ספירלה לא יציבה.";
  if (kind === "stable-equilibrium-line") return "אחד הערכים העצמיים הוא 0 והשני שלילי, ולכן מתקבל ישר שיווי־משקל יציב.";
  if (kind === "unstable-equilibrium-line") return "אחד הערכים העצמיים הוא 0 והשני חיובי, ולכן מתקבל ישר שיווי־משקל לא יציב.";
  if (kind === "nilpotent") return "הערך העצמי היחיד הוא 0 והמטריצה אינה אפס, ולכן מתקבל המקרה הנילפוטנטי.";
  return "שני הערכים העצמיים הם 0 והמטריצה היא אפס, ולכן כל נקודה היא שיווי־משקל.";
}

function MatrixCalculationDetails({ phaseCase }: { phaseCase: GeneratedPhaseCase }) {
  const eigenvalues = eigenSummary(phaseCase.matrix);
  return (
    <div className="calculation-details">
      <section className="calculation-card">
        <div className="section-heading">דרך 1: ערכים עצמיים</div>
        <div className="calculation-equations" dir="ltr">
          <MathText block math={String.raw`p_A(\lambda)=${characteristicPolynomialLatex(phaseCase)}`} />
          <MathText block math={eigenvalueFormulaLatex(phaseCase)} />
          <MathText block math={String.raw`\lambda_1=${eigenvalues[0]},\quad \lambda_2=${eigenvalues[1]}`} />
        </div>
        <p>{diagonalizationNote(phaseCase.kind)}</p>
        <p>{eigenvalueConclusion(phaseCase.kind)}</p>
      </section>

      <section className="calculation-card">
        <div className="section-heading">דרך 2: עקבה ודטרמיננטה</div>
        <div className="calculation-equations" dir="ltr">
          <MathText block math={String.raw`\tau=\operatorname{tr}(A)=${formatNumber(phaseCase.trace)}`} />
          <MathText block math={String.raw`\delta=\det(A)=${formatNumber(phaseCase.determinant)}`} />
          <MathText block math={String.raw`D=\tau^2-4\delta=${formatNumber(phaseCase.discriminant)}`} />
        </div>
        <p>{matrixFeedbackText(phaseCase)}</p>
      </section>
    </div>
  );
}

function visualFeedbackText(kind: PhaseKind): string {
  if (kind === "saddle") return "יש מסלולים שנכנסים לראשית וכאלה שיוצאים ממנה, ולכן זו תמונת אוכף.";
  if (kind === "stable-node" || kind === "stable-star" || kind === "stable-defective-node") {
    return "כל המסלולים מתקרבים לראשית ללא סיבוב, ולכן מדובר בסוג יציב ממשי.";
  }
  if (kind === "unstable-node" || kind === "unstable-star" || kind === "unstable-defective-node") {
    return "כל המסלולים מתרחקים מן הראשית ללא סיבוב, ולכן מדובר בסוג לא יציב ממשי.";
  }
  if (kind === "center") return "המסלולים סגורים סביב הראשית ואינם מתקרבים או מתרחקים ממנה.";
  if (kind === "stable-spiral") return "המסלולים מסתובבים ומתקרבים לראשית, ולכן זו ספירלה יציבה.";
  if (kind === "unstable-spiral") return "המסלולים מסתובבים ומתרחקים מן הראשית, ולכן זו ספירלה לא יציבה.";
  if (kind === "stable-equilibrium-line") return "נראה ישר של נקודות שיווי־משקל והמסלולים מתקרבים אליו.";
  if (kind === "unstable-equilibrium-line") return "נראה ישר של נקודות שיווי־משקל והמסלולים מתרחקים ממנו.";
  if (kind === "nilpotent") return "יש ישר של נקודות שיווי־משקל ותנועה מקבילה לו, ללא יציבות אקספוננציאלית.";
  return "אין תנועה כלל: כל נקודה במישור היא נקודת שיווי־משקל.";
}

function updateStats(stats: QuizSessionStats, isCorrect: boolean): QuizSessionStats {
  const currentStreak = isCorrect ? stats.currentStreak + 1 : 0;
  return {
    answered: stats.answered + 1,
    correct: stats.correct + (isCorrect ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
  };
}

function optionLabel(option: PortraitQuizOption | ClassificationQuizOption): string {
  return "label" in option ? option.label : phaseKindLabels[option.kind];
}

function buildMistakeExplanation(activity: PracticeActivity, phaseCase: GeneratedPhaseCase): string {
  return activity === "matrix-to-portrait"
    ? matrixFeedbackText(phaseCase)
    : visualFeedbackText(phaseCase.kind);
}

function classify(matrix: Matrix): string {
  const tr = trace(matrix);
  const det = determinant(matrix);
  const disc = discriminant(matrix);
  const eps = 1e-8;

  if (Math.abs(det) < eps) {
    if (maxMatrixAbs(matrix) < eps) return "שדה אפס";
    if (Math.abs(tr) < eps) return "מקרה נילפוטנטי";
    return tr < 0 ? "ישר שיווי־משקל יציב" : "ישר שיווי־משקל לא יציב";
  }
  if (det < 0) return "אוכף";
  if (disc < -eps) {
    if (Math.abs(tr) < eps) return "מרכז";
    return tr < 0 ? "ספירלה יציבה" : "ספירלה לא יציבה";
  }
  if (disc > eps) {
    return tr < 0 ? "צומת יציב" : "צומת לא יציב";
  }

  const lambda = tr / 2;
  const shifted: Matrix = [
    [matrix[0][0] - lambda, matrix[0][1]],
    [matrix[1][0], matrix[1][1] - lambda],
  ];
  const looksScalar =
    Math.abs(shifted[0][0]) < 1e-7 &&
    Math.abs(shifted[0][1]) < 1e-7 &&
    Math.abs(shifted[1][0]) < 1e-7 &&
    Math.abs(shifted[1][1]) < 1e-7;

  if (Math.abs(lambda) < eps) return "מקרה מנוון";
  if (looksScalar) return lambda < 0 ? "כוכב יציב" : "כוכב לא יציב";
  return lambda < 0 ? "צומת מנוונת יציבה" : "צומת מנוונת לא יציבה";
}

function eigenSummary(matrix: Matrix) {
  const tr = trace(matrix);
  const disc = discriminant(matrix);
  if (disc >= 0) {
    const root = Math.sqrt(Math.max(disc, 0));
    return [`${formatNumber((tr + root) / 2)}`, `${formatNumber((tr - root) / 2)}`];
  }
  const real = tr / 2;
  const imag = Math.sqrt(-disc) / 2;
  return [`${formatNumber(real)} + ${formatNumber(imag)}i`, `${formatNumber(real)} - ${formatNumber(imag)}i`];
}

function eigenDirections(matrix: Matrix): Vec[] {
  return realEigenPairs(matrix)
    .map((pair) => pair.vector)
    .filter((v, index, all) => index === 0 || Math.abs(v[0] * all[0][1] - v[1] * all[0][0]) > 1e-5);
}

function eigenVectorReferences(matrix: Matrix): VectorReference[] {
  if (discriminant(matrix) < -1e-8) return [];

  const saddle = saddleData(matrix);
  if (saddle) {
    return [
      { vector: orientReferenceVector(saddle.stable.vector), labelIndex: 1 },
      { vector: orientReferenceVector(saddle.unstable.vector), labelIndex: 2 },
    ];
  }

  const zeroEigen = zeroEigenData(matrix);
  if (zeroEigen?.kind === "zero") return [];
  if (zeroEigen?.kind === "line") {
    return [
      { vector: orientReferenceVector(zeroEigen.equilibrium.vector), labelIndex: 1 },
      { vector: orientReferenceVector(zeroEigen.moving.vector), labelIndex: 2 },
    ];
  }
  if (zeroEigen?.kind === "nilpotent") {
    return [
      { vector: orientReferenceVector(zeroEigen.equilibriumVector), labelIndex: 1 },
      { vector: orientReferenceVector(zeroEigen.generalizedVector), labelIndex: 2 },
    ].filter((reference) => norm(reference.vector) > 1e-8);
  }

  const defectiveNode = defectiveNodeData(matrix);
  if (defectiveNode) {
    return [
      { vector: orientReferenceVector(defectiveNode.eigenvector), labelIndex: 1 },
      { vector: orientReferenceVector(defectiveNode.generalizedVector), labelIndex: 2 },
    ].filter((reference) => norm(reference.vector) > 1e-8);
  }

  const lambda = trace(matrix) / 2;
  const scalarLike =
    Math.abs(matrix[0][0] - lambda) < 1e-7 &&
    Math.abs(matrix[1][1] - lambda) < 1e-7 &&
    Math.abs(matrix[0][1]) < 1e-7 &&
    Math.abs(matrix[1][0]) < 1e-7;
  if (scalarLike && Math.abs(lambda) > 1e-8) {
    return [
      { vector: [1, 0], labelIndex: 1 },
      { vector: [0, 1], labelIndex: 2 },
    ];
  }

  return realEigenPairs(matrix)
    .map((pair, index) => ({
      vector: orientReferenceVector(pair.vector),
      labelIndex: index + 1,
    }))
    .filter((reference, index, all) => index === 0 || !sameDirection(reference.vector, all[0].vector));
}

function orientReferenceVector(vector: Vec): Vec {
  const length = norm(vector);
  if (length < 1e-8) return vector;
  const normalized = scale(vector, 1 / length);
  if (normalized[0] < -1e-8 || (Math.abs(normalized[0]) < 1e-8 && normalized[1] < 0)) {
    return scale(normalized, -1);
  }
  return normalized;
}

function sameDirection(a: Vec, b: Vec): boolean {
  return Math.abs(a[0] * b[1] - a[1] * b[0]) < 1e-5;
}

function eigenVectorFor(matrix: Matrix, lambda: number): Vec {
  const a = matrix[0][0] - lambda;
  const b = matrix[0][1];
  const c = matrix[1][0];
  const d = matrix[1][1] - lambda;
  const vector: Vec = Math.abs(b) + Math.abs(a) > Math.abs(d) + Math.abs(c)
    ? [b, -a]
    : [d, -c];
  const length = norm(vector);
  return length > 1e-8 ? scale(vector, 1 / length) : [1, 0];
}

function realEigenPairs(matrix: Matrix): EigenPair[] {
  const disc = discriminant(matrix);
  if (disc < 0) return [];
  const tr = trace(matrix);
  const root = Math.sqrt(Math.max(disc, 0));
  return [(tr + root) / 2, (tr - root) / 2].map((lambda) => ({
    lambda,
    vector: eigenVectorFor(matrix, lambda),
  }));
}

function saddleData(matrix: Matrix): SaddleData | null {
  const pairs = realEigenPairs(matrix);
  const stable = pairs.find((pair) => pair.lambda < -1e-8);
  const unstable = pairs.find((pair) => pair.lambda > 1e-8);
  return stable && unstable ? { stable, unstable } : null;
}

function nodeData(matrix: Matrix): NodeData | null {
  const pairs = realEigenPairs(matrix);
  if (pairs.length !== 2) return null;
  const [first, second] = pairs;
  if (Math.abs(first.lambda - second.lambda) < 1e-8) return null;
  const bothPositive = first.lambda > 1e-8 && second.lambda > 1e-8;
  const bothNegative = first.lambda < -1e-8 && second.lambda < -1e-8;
  if (!bothPositive && !bothNegative) return null;

  const sorted = [...pairs].sort((left, right) => Math.abs(left.lambda) - Math.abs(right.lambda));
  return {
    slow: sorted[0],
    fast: sorted[1],
    stable: bothNegative,
  };
}

function starData(matrix: Matrix): StarData | null {
  const lambda = trace(matrix) / 2;
  if (Math.abs(lambda) < 1e-8) return null;
  const scalarLike =
    Math.abs(matrix[0][0] - lambda) < 1e-7 &&
    Math.abs(matrix[1][1] - lambda) < 1e-7 &&
    Math.abs(matrix[0][1]) < 1e-7 &&
    Math.abs(matrix[1][0]) < 1e-7;
  return scalarLike ? { lambda, stable: lambda < 0 } : null;
}

function defectiveNodeData(matrix: Matrix): DefectiveNodeData | null {
  const lambda = trace(matrix) / 2;
  if (Math.abs(lambda) < 1e-8 || Math.abs(discriminant(matrix)) > 1e-7) return null;

  const shifted: Matrix = [
    [matrix[0][0] - lambda, matrix[0][1]],
    [matrix[1][0], matrix[1][1] - lambda],
  ];
  const scalarLike =
    Math.abs(shifted[0][0]) < 1e-7 &&
    Math.abs(shifted[0][1]) < 1e-7 &&
    Math.abs(shifted[1][0]) < 1e-7 &&
    Math.abs(shifted[1][1]) < 1e-7;
  if (scalarLike) return null;

  const eigenvector = eigenVectorFor(matrix, lambda);
  return {
    lambda,
    eigenvector,
    generalizedVector: generalizedEigenVectorFor(shifted, eigenvector),
    stable: lambda < 0,
  };
}

function zeroEigenData(matrix: Matrix): ZeroEigenData | null {
  if (Math.abs(determinant(matrix)) > 1e-8) return null;
  if (maxMatrixAbs(matrix) < 1e-8) return { kind: "zero" };

  const mu = trace(matrix);
  const equilibriumVector = eigenVectorFor(matrix, 0);
  if (Math.abs(mu) > 1e-8) {
    return {
      kind: "line",
      equilibrium: { lambda: 0, vector: equilibriumVector },
      moving: { lambda: mu, vector: eigenVectorFor(matrix, mu) },
      stable: mu < 0,
    };
  }

  return {
    kind: "nilpotent",
    equilibriumVector,
    generalizedVector: generalizedEigenVectorFor(matrix, equilibriumVector),
  };
}

function generalizedEigenVectorFor(shifted: Matrix, eigenvector: Vec): Vec {
  const rows: [number, number, number][] = [
    [shifted[0][0], shifted[0][1], eigenvector[0]],
    [shifted[1][0], shifted[1][1], eigenvector[1]],
  ];
  const [a, b, target] = rows.sort(
    (left, right) => right[0] * right[0] + right[1] * right[1] - (left[0] * left[0] + left[1] * left[1]),
  )[0];
  const denominator = a * a + b * b;
  if (denominator < 1e-10) return [0, 1];
  return [a * target / denominator, b * target / denominator];
}

function centerData(matrix: Matrix): CenterData | null {
  const det = determinant(matrix);
  if (Math.abs(trace(matrix)) > 1e-8 || det <= 1e-8) return null;
  return { beta: Math.sqrt(det) };
}

function centerEllipseBasis(matrix: Matrix, center: CenterData): [Vec, Vec] {
  const realPart: Vec = [1, 0];
  const minusImaginaryPart = scale(multiply(matrix, realPart), 1 / center.beta);
  return [realPart, minusImaginaryPart];
}

function centerPrincipalAxes(matrix: Matrix, center: CenterData): PrincipalAxis[] {
  const [firstColumn, secondColumn] = centerEllipseBasis(matrix, center);
  const a = firstColumn[0] * firstColumn[0] + secondColumn[0] * secondColumn[0];
  const b = firstColumn[0] * firstColumn[1] + secondColumn[0] * secondColumn[1];
  const d = firstColumn[1] * firstColumn[1] + secondColumn[1] * secondColumn[1];
  const middle = (a + d) / 2;
  const radius = Math.hypot((a - d) / 2, b);
  if (radius < 1e-8) {
    return [
      { vector: [1, 0], label: "a_1" },
      { vector: [0, 1], label: "a_2" },
    ];
  }
  const eigenvalues = [middle + radius, middle - radius];

  return eigenvalues.map((lambda, index) => ({
    vector: orientReferenceVector(symmetricEigenVector(a, b, d, lambda)),
    label: `a_${index + 1}`,
  }));
}

function symmetricEigenVector(a: number, b: number, d: number, lambda: number): Vec {
  const vector: Vec = Math.abs(b) > Math.abs(a - lambda)
    ? [b, lambda - a]
    : [lambda - d, b];
  const length = norm(vector);
  if (length > 1e-8) return scale(vector, 1 / length);
  return a >= d ? [1, 0] : [0, 1];
}

function spiralData(matrix: Matrix): SpiralData | null {
  const disc = discriminant(matrix);
  const alpha = trace(matrix) / 2;
  if (disc >= -1e-8 || Math.abs(alpha) < 1e-8) return null;
  return {
    alpha,
    beta: Math.sqrt(-disc) / 2,
    stable: alpha < 0,
  };
}

function formatNumber(value: number): string {
  if (Math.abs(value) < 0.0005) return "0";
  return Number(value.toFixed(2)).toString();
}

function rationalDisplayParts(value: number) {
  if (Math.abs(value) < 1e-10) return { kind: "integer" as const, value: "0" };

  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const maxDenominator = 36;
  let bestNumerator = Math.round(absolute);
  let bestDenominator = 1;
  let bestError = Math.abs(absolute - bestNumerator);

  for (let denominator = 2; denominator <= maxDenominator; denominator += 1) {
    const numerator = Math.round(absolute * denominator);
    const approximation = numerator / denominator;
    const error = Math.abs(absolute - approximation);
    if (error < bestError) {
      bestNumerator = numerator;
      bestDenominator = denominator;
      bestError = error;
    }
  }

  if (bestError > 1e-8) return { kind: "decimal" as const, value: formatNumber(value) };
  if (bestDenominator === 1) return { kind: "integer" as const, value: `${sign}${bestNumerator}` };
  return { kind: "fraction" as const, sign, numerator: String(bestNumerator), denominator: String(bestDenominator) };
}

type MathDisplayVariant = "inline" | "compact" | "standard";

function displayMathClassName({
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

function inlineMathClassName({ className }: { variant?: MathDisplayVariant; className?: string }): string {
  return ["math-render", className].filter(Boolean).join(" ");
}

function DisplayMath({
  latex,
  className,
  centered = true,
}: {
  latex: string;
  className?: string;
  centered?: boolean;
}) {
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

function MathText({
  math,
  variant,
  block = false,
  className,
}: {
  math: string;
  variant?: MathDisplayVariant;
  block?: boolean;
  className?: string;
}) {
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

function rk4Step(matrix: Matrix, point: Vec, step: number, mode: ScaleMode): Vec {
  const field = (p: Vec): Vec => {
    const velocity = multiply(matrix, p);
    if (mode === "physical") return velocity;
    const speed = norm(velocity);
    return speed > 0 ? scale(velocity, 1 / Math.max(1, speed)) : velocity;
  };

  const k1 = field(point);
  const k2 = field(add(point, scale(k1, step / 2)));
  const k3 = field(add(point, scale(k2, step / 2)));
  const k4 = field(add(point, scale(k3, step)));

  return add(
    point,
    scale(add(add(k1, scale(k2, 2)), add(scale(k3, 2), k4)), step / 6),
  );
}

function PhaseCanvas({
  matrix,
  mode,
  density,
  worldRadius,
  saddleSamples,
  starSamples,
  centerSamples,
  showVectorField = true,
  showReferenceLines = true,
  showReferenceLabels = true,
  ariaLabel = "Phase portrait canvas",
}: {
  matrix: Matrix;
  mode: ScaleMode;
  density: number;
  worldRadius: number;
  saddleSamples: SaddleSample[];
  starSamples: SaddleSample[];
  centerSamples: CenterSample[];
  showVectorField?: boolean;
  showReferenceLines?: boolean;
  showReferenceLabels?: boolean;
  ariaLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const render = () => {
      const displayWidth = container.clientWidth;
      const displayHeight = container.clientHeight;
      if (displayWidth <= 0 || displayHeight <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.floor(displayWidth * dpr);
      const pixelHeight = Math.floor(displayHeight * dpr);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      if (canvas.style.width !== `${displayWidth}px`) {
        canvas.style.width = `${displayWidth}px`;
      }
      if (canvas.style.height !== `${displayHeight}px`) {
        canvas.style.height = `${displayHeight}px`;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const width = displayWidth;
      const height = displayHeight;
      const unit = Math.min(width, height) / (2 * worldRadius);
      const center: Vec = [width / 2, height / 2];
      const toScreen = (point: Vec): Vec => [
        center[0] + point[0] * unit,
        center[1] - point[1] * unit,
      ];

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#fbf7ed";
      context.fillRect(0, 0, width, height);

      drawGrid(context, width, height, center, unit, worldRadius);
      if (showVectorField) {
        drawDirectionField(context, matrix, toScreen, worldRadius, density);
      }
      const zeroEigen = zeroEigenData(matrix);
      if (zeroEigen) {
        drawZeroEigenPortrait(context, zeroEigen, toScreen, worldRadius, density, saddleSamples);
      } else {
        const saddle = saddleData(matrix);
        if (saddle) {
          drawSaddlePortrait(context, saddle, toScreen, worldRadius, density, saddleSamples);
        } else {
          const star = starData(matrix);
          if (star) {
            drawStarPortrait(context, star, toScreen, worldRadius, density, starSamples);
          } else {
            const defectiveNode = defectiveNodeData(matrix);
            if (defectiveNode) {
              drawDefectiveNodePortrait(context, defectiveNode, toScreen, worldRadius, density, saddleSamples);
            } else {
              const node = nodeData(matrix);
              if (node) {
                drawNodePortrait(context, node, toScreen, worldRadius, density, saddleSamples);
              } else {
                const centerDataForMatrix = centerData(matrix);
                if (centerDataForMatrix) {
                  drawCenterPortrait(context, matrix, centerDataForMatrix, toScreen, worldRadius, density, centerSamples, showReferenceLines);
                } else {
                  const spiralDataForMatrix = spiralData(matrix);
                  if (spiralDataForMatrix) {
                    drawSpiralPortrait(context, matrix, spiralDataForMatrix, toScreen, worldRadius, density, centerSamples);
                  } else {
                    if (showReferenceLines) {
                      drawEigenLines(context, eigenDirections(matrix), toScreen, worldRadius);
                    }
                    drawTrajectories(context, matrix, mode, toScreen, worldRadius, density);
                  }
                }
              }
            }
          }
        }
      }
      if (showReferenceLabels) {
        drawEigenVectorReferences(context, eigenVectorReferences(matrix), toScreen, worldRadius);
      }
      drawOrigin(context, toScreen);
    };

    let animationFrame = 0;
    const scheduleRender = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(render);
    };

    scheduleRender();
    const observer = new ResizeObserver(scheduleRender);
    observer.observe(container);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [
    matrix,
    mode,
    density,
    worldRadius,
    saddleSamples,
    starSamples,
    centerSamples,
    showVectorField,
    showReferenceLines,
    showReferenceLabels,
  ]);

  return <canvas ref={canvasRef} className="phase-canvas" aria-label={ariaLabel} />;
}

function drawGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  center: Vec,
  unit: number,
  worldRadius: number,
) {
  context.save();
  context.lineWidth = 1;
  context.strokeStyle = "rgba(38, 45, 54, 0.08)";
  for (let x = -Math.floor(worldRadius); x <= worldRadius; x += 1) {
    const px = center[0] + x * unit;
    context.beginPath();
    context.moveTo(px, 0);
    context.lineTo(px, height);
    context.stroke();
  }
  for (let y = -Math.floor(worldRadius); y <= worldRadius; y += 1) {
    const py = center[1] - y * unit;
    context.beginPath();
    context.moveTo(0, py);
    context.lineTo(width, py);
    context.stroke();
  }

  context.strokeStyle = "rgba(37, 43, 51, 0.42)";
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(0, center[1]);
  context.lineTo(width, center[1]);
  context.moveTo(center[0], 0);
  context.lineTo(center[0], height);
  context.stroke();

  context.restore();
}

function drawDirectionField(
  context: CanvasRenderingContext2D,
  matrix: Matrix,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
  density: number,
) {
  context.save();
  context.strokeStyle = "rgba(35, 87, 137, 0.24)";
  context.lineWidth = 1.1;

  const count = 7 + density * 2;
  for (let i = 0; i <= count; i += 1) {
    const x = -worldRadius + (2 * worldRadius * i) / count;
    for (let j = 0; j <= count; j += 1) {
      const y = -worldRadius + (2 * worldRadius * j) / count;
      const v = multiply(matrix, [x, y]);
      const speed = norm(v);
      if (speed < 1e-7) continue;
      const direction = scale(v, 0.12 / speed);
      const start = toScreen([x - direction[0], y - direction[1]]);
      const end = toScreen([x + direction[0], y + direction[1]]);
      drawArrow(context, start, end, 4);
    }
  }
  context.restore();
}

function drawEigenLines(
  context: CanvasRenderingContext2D,
  directions: Vec[],
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
) {
  context.save();
  directions.forEach((direction, index) => {
    const start = toScreen(scale(direction, -worldRadius));
    const end = toScreen(scale(direction, worldRadius));
    context.strokeStyle = index === 0 ? "rgba(184, 87, 53, 0.78)" : "rgba(47, 127, 114, 0.78)";
    context.lineWidth = 2.4;
    context.setLineDash([8, 6]);
    context.beginPath();
    context.moveTo(start[0], start[1]);
    context.lineTo(end[0], end[1]);
    context.stroke();
  });
  context.restore();
}

function drawEigenVectorReferences(
  context: CanvasRenderingContext2D,
  references: VectorReference[],
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
) {
  if (references.length === 0) return;

  context.save();
  context.strokeStyle = EIGEN_VECTOR_COLOR;
  context.fillStyle = EIGEN_VECTOR_COLOR;
  context.lineWidth = 2.2;

  references.forEach(({ vector: direction, labelIndex }, index) => {
    const length = Math.min(worldRadius * 0.64, rayLimit(direction, worldRadius) * 0.54);
    const start = toScreen([0, 0]);
    const end = toScreen(scale(direction, length));
    const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
    const screenLength = Math.max(Math.hypot(end[0] - start[0], end[1] - start[1]), 1);
    const tangent: Vec = [(end[0] - start[0]) / screenLength, (end[1] - start[1]) / screenLength];
    const normal: Vec = [-tangent[1], tangent[0]];
    const normalSign = index % 2 === 0 ? 1 : -1;

    context.setLineDash([7, 6]);
    context.beginPath();
    context.moveTo(start[0], start[1]);
    context.lineTo(end[0], end[1]);
    context.stroke();

    context.setLineDash([]);
    context.beginPath();
    context.moveTo(end[0] - 11 * Math.cos(angle - Math.PI / 5), end[1] - 11 * Math.sin(angle - Math.PI / 5));
    context.lineTo(end[0], end[1]);
    context.lineTo(end[0] - 11 * Math.cos(angle + Math.PI / 5), end[1] - 11 * Math.sin(angle + Math.PI / 5));
    context.stroke();

    const label: Vec = [
      end[0] + tangent[0] * 18 + normal[0] * 22 * normalSign,
      end[1] + tangent[1] * 18 + normal[1] * 22 * normalSign,
    ];
    drawVectorReferenceLabel(context, label, labelIndex);
  });

  context.restore();
}

function drawVectorReferenceLabel(context: CanvasRenderingContext2D, position: Vec, index: number) {
  const [x, y] = position;

  context.save();
  context.textAlign = "left";
  context.textBaseline = "alphabetic";

  context.font = "italic 700 17px KaTeX_Main, 'Times New Roman', serif";
  context.lineWidth = 5;
  context.strokeStyle = "#fbf7ed";
  context.strokeText("V", x - 8, y + 5);
  context.fillStyle = EIGEN_VECTOR_COLOR;
  context.fillText("V", x - 8, y + 5);

  context.font = "700 10px KaTeX_Main, 'Times New Roman', serif";
  context.strokeStyle = "#fbf7ed";
  context.strokeText(String(index), x + 5, y + 8);
  context.fillStyle = EIGEN_VECTOR_COLOR;
  context.fillText(String(index), x + 5, y + 8);
  context.restore();
}

function drawZeroEigenPortrait(
  context: CanvasRenderingContext2D,
  data: ZeroEigenData,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
  density: number,
  samples: SaddleSample[],
) {
  if (data.kind === "zero") {
    drawZeroMatrixEquilibria(context, toScreen, worldRadius);
    return;
  }

  const equilibriumDirection = data.kind === "line" ? data.equilibrium.vector : data.equilibriumVector;
  drawEquilibriumLine(context, equilibriumDirection, toScreen, worldRadius);

  if (data.kind === "line") {
    drawZeroEigenLineCurves(context, data, toScreen, worldRadius, density, samples);
  } else {
    drawNilpotentCurves(context, data, toScreen, worldRadius, density, samples);
  }
}

function drawZeroMatrixEquilibria(context: CanvasRenderingContext2D, toScreen: (point: Vec) => Vec, worldRadius: number) {
  context.save();
  context.fillStyle = SADDLE_AXIS_COLOR;
  context.globalAlpha = 0.35;

  for (let x = -Math.floor(worldRadius); x <= worldRadius; x += 1) {
    for (let y = -Math.floor(worldRadius); y <= worldRadius; y += 1) {
      const point = toScreen([x, y]);
      context.beginPath();
      context.arc(point[0], point[1], 2.2, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.restore();
}

function drawEquilibriumLine(
  context: CanvasRenderingContext2D,
  direction: Vec,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
) {
  const lineDirection = orientReferenceVector(direction);
  const endScale = rayLimit(lineDirection, worldRadius) * 1.02;
  const start = toScreen(scale(lineDirection, -endScale));
  const end = toScreen(scale(lineDirection, endScale));

  context.save();
  context.strokeStyle = SADDLE_AXIS_COLOR;
  context.lineWidth = 3;
  context.setLineDash([12, 7]);
  context.beginPath();
  context.moveTo(start[0], start[1]);
  context.lineTo(end[0], end[1]);
  context.stroke();
  context.restore();
}

function drawZeroEigenLineCurves(
  context: CanvasRenderingContext2D,
  data: Extract<ZeroEigenData, { kind: "line" }>,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
  density: number,
  samples: SaddleSample[],
) {
  const visibleLimit = worldRadius * 1.08;
  const activeSamples = samples ?? defaultSaddleSamples;
  const visibleSamples = activeSamples.slice(0, density >= 3 ? activeSamples.length : 4);

  context.save();
  context.strokeStyle = SADDLE_CURVE_COLOR;
  context.fillStyle = context.strokeStyle;
  context.lineWidth = 1.9;
  context.globalAlpha = 0.95;
  context.setLineDash([]);

  visibleSamples.forEach((sample) => {
    if (Math.abs(sample.unstableCoefficient) < 1e-6) return;
    const coefficient = Math.max(Math.abs(sample.unstableCoefficient), 0.04);
    const spans = nodeTimeSpans(worldRadius * 1.5, coefficient, Math.abs(data.moving.lambda), worldRadius * 0.004);
    const tStart = data.stable ? -spans.away : -spans.toward;
    const tEnd = data.stable ? spans.toward : spans.away;
    const segments = sampleZeroEigenLineCurve(
      data,
      sample.stableCoefficient,
      sample.unstableCoefficient,
      tStart,
      tEnd,
      visibleLimit,
    );
    segments.forEach((segment) => {
      const screenSegment = segment.map(toScreen);
      drawScreenPolyline(context, screenSegment);
      drawArrowsByScreenLength(context, screenSegment, density >= 3 ? 3 : 2, 9);
    });
  });

  context.restore();
}

function sampleZeroEigenLineCurve(
  data: Extract<ZeroEigenData, { kind: "line" }>,
  equilibriumCoefficient: number,
  movingCoefficient: number,
  tStart: number,
  tEnd: number,
  visibleLimit: number,
): Vec[][] {
  const segments: Vec[][] = [];
  let current: Vec[] = [];
  const samples = 900;

  for (let index = 0; index <= samples; index += 1) {
    const t = tStart + ((tEnd - tStart) * index) / samples;
    const point = add(
      scale(data.equilibrium.vector, equilibriumCoefficient),
      scale(data.moving.vector, movingCoefficient * Math.exp(data.moving.lambda * t)),
    );
    const visible =
      Number.isFinite(point[0] + point[1]) &&
      Math.abs(point[0]) <= visibleLimit &&
      Math.abs(point[1]) <= visibleLimit;

    if (visible) {
      current.push(point);
    } else if (current.length > 1) {
      segments.push(current);
      current = [];
    } else {
      current = [];
    }
  }

  if (current.length > 1) segments.push(current);
  return segments;
}

function drawNilpotentCurves(
  context: CanvasRenderingContext2D,
  data: Extract<ZeroEigenData, { kind: "nilpotent" }>,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
  density: number,
  samples: SaddleSample[],
) {
  const visibleLimit = worldRadius * 1.08;
  const activeSamples = samples ?? defaultSaddleSamples;
  const visibleSamples = activeSamples.slice(0, density >= 3 ? activeSamples.length : 4);

  context.save();
  context.strokeStyle = SADDLE_CURVE_COLOR;
  context.fillStyle = context.strokeStyle;
  context.lineWidth = 1.9;
  context.globalAlpha = 0.95;
  context.setLineDash([]);

  visibleSamples.forEach((sample) => {
    if (Math.abs(sample.unstableCoefficient) < 1e-6) return;
    const span = Math.min(10, Math.max(3, (worldRadius * 1.6) / Math.abs(sample.unstableCoefficient)));
    const segments = sampleNilpotentCurve(
      data,
      sample.stableCoefficient,
      sample.unstableCoefficient,
      -span,
      span,
      visibleLimit,
    );
    segments.forEach((segment) => {
      const screenSegment = segment.map(toScreen);
      drawScreenPolyline(context, screenSegment);
      drawArrowsByScreenLength(context, screenSegment, density >= 3 ? 3 : 2, 9);
    });
  });

  context.restore();
}

function sampleNilpotentCurve(
  data: Extract<ZeroEigenData, { kind: "nilpotent" }>,
  equilibriumCoefficient: number,
  generalizedCoefficient: number,
  tStart: number,
  tEnd: number,
  visibleLimit: number,
): Vec[][] {
  const segments: Vec[][] = [];
  let current: Vec[] = [];
  const samples = 720;

  for (let index = 0; index <= samples; index += 1) {
    const t = tStart + ((tEnd - tStart) * index) / samples;
    const point = add(
      scale(data.equilibriumVector, equilibriumCoefficient + generalizedCoefficient * t),
      scale(data.generalizedVector, generalizedCoefficient),
    );
    const visible =
      Number.isFinite(point[0] + point[1]) &&
      Math.abs(point[0]) <= visibleLimit &&
      Math.abs(point[1]) <= visibleLimit;

    if (visible) {
      current.push(point);
    } else if (current.length > 1) {
      segments.push(current);
      current = [];
    } else {
      current = [];
    }
  }

  if (current.length > 1) segments.push(current);
  return segments;
}

function drawSaddlePortrait(
  context: CanvasRenderingContext2D,
  saddle: SaddleData,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
  density: number,
  saddleSamples: SaddleSample[],
) {
  drawSaddleRays(context, saddle, toScreen, worldRadius);
  drawSaddleCurves(context, saddle, toScreen, worldRadius, density, saddleSamples);
}

function drawSaddleRays(
  context: CanvasRenderingContext2D,
  saddle: SaddleData,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
) {
  context.save();
  context.lineWidth = 2.5;
  context.setLineDash([]);

  [-1, 1].forEach((sign) => {
    drawSaddleRay(context, scale(saddle.stable.vector, sign), "stable", toScreen, worldRadius);
    drawSaddleRay(context, scale(saddle.unstable.vector, sign), "unstable", toScreen, worldRadius);
  });

  context.restore();
}

function drawSaddleRay(
  context: CanvasRenderingContext2D,
  direction: Vec,
  kind: "stable" | "unstable",
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
) {
  const endScale = rayLimit(direction, worldRadius) * 1.02;
  const start = toScreen(scale(direction, worldRadius * 0.004));
  const end = toScreen(scale(direction, endScale));

  context.strokeStyle = SADDLE_AXIS_COLOR;
  context.fillStyle = context.strokeStyle;
  context.beginPath();
  context.moveTo(start[0], start[1]);
  context.lineTo(end[0], end[1]);
  context.stroke();

  const arrowLength = endScale * 0.085;
  [0.18, 0.36, 0.54, 0.72, 0.9].forEach((fraction) => {
    const center = endScale * fraction;
    const outwardStart = toScreen(scale(direction, center - arrowLength / 2));
    const outwardEnd = toScreen(scale(direction, center + arrowLength / 2));
    if (kind === "unstable") {
      drawArrow(context, outwardStart, outwardEnd, 9);
    } else {
      drawArrow(context, outwardEnd, outwardStart, 9);
    }
  });
}

function rayLimit(direction: Vec, worldRadius: number): number {
  const xLimit = Math.abs(direction[0]) > 1e-8 ? worldRadius / Math.abs(direction[0]) : Number.POSITIVE_INFINITY;
  const yLimit = Math.abs(direction[1]) > 1e-8 ? worldRadius / Math.abs(direction[1]) : Number.POSITIVE_INFINITY;
  return Math.min(xLimit, yLimit);
}

function drawSaddleCurves(
  context: CanvasRenderingContext2D,
  saddle: SaddleData,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
  density: number,
  saddleSamples: SaddleSample[],
) {
  const visibleLimit = worldRadius * 1.08;
  const growthTarget = worldRadius * 1.55;
  const activeSamples = saddleSamples ?? defaultSaddleSamples;
  const visibleSamples = activeSamples.slice(0, density >= 3 ? activeSamples.length : 4);

  context.save();
  context.strokeStyle = SADDLE_CURVE_COLOR;
  context.fillStyle = context.strokeStyle;
  context.lineWidth = 1.9;
  context.globalAlpha = 0.95;
  context.setLineDash([]);

  visibleSamples.forEach((sample) => {
    if (Math.abs(sample.stableCoefficient) < 1e-6 || Math.abs(sample.unstableCoefficient) < 1e-6) return;
    const tBackward = saddleTimeSpan(growthTarget, Math.abs(sample.stableCoefficient), Math.abs(saddle.stable.lambda));
    const tForward = saddleTimeSpan(growthTarget, Math.abs(sample.unstableCoefficient), saddle.unstable.lambda);
    const segments = sampleSaddleCurve(
      saddle,
      sample.stableCoefficient,
      sample.unstableCoefficient,
      -tBackward,
      tForward,
      visibleLimit,
    );
    segments.forEach((segment) => {
      const screenSegment = segment.map(toScreen);
      drawScreenPolyline(context, screenSegment);
      drawArrowsByScreenLength(context, screenSegment, density >= 3 ? 3 : 2, 9);
    });
  });

  context.restore();
}

function saddleTimeSpan(target: number, coefficient: number, rate: number): number {
  const safeCoefficient = Math.max(coefficient, 0.04);
  const safeRate = Math.max(rate, 0.04);
  return Math.min(8, Math.max(1.35, Math.log(Math.max(target / safeCoefficient, 1.2)) / safeRate + 0.28));
}

function sampleSaddleCurve(
  saddle: SaddleData,
  stableCoefficient: number,
  unstableCoefficient: number,
  tStart: number,
  tEnd: number,
  visibleLimit: number,
): Vec[][] {
  const segments: Vec[][] = [];
  let current: Vec[] = [];
  const samples = 820;

  for (let index = 0; index <= samples; index += 1) {
    const t = tStart + ((tEnd - tStart) * index) / samples;
    const point = add(
      scale(saddle.stable.vector, stableCoefficient * Math.exp(saddle.stable.lambda * t)),
      scale(saddle.unstable.vector, unstableCoefficient * Math.exp(saddle.unstable.lambda * t)),
    );
    const visible =
      Number.isFinite(point[0] + point[1]) &&
      Math.abs(point[0]) <= visibleLimit &&
      Math.abs(point[1]) <= visibleLimit;

    if (visible) {
      current.push(point);
    } else if (current.length > 1) {
      segments.push(current);
      current = [];
    } else {
      current = [];
    }
  }

  if (current.length > 1) segments.push(current);
  return segments;
}

function drawNodePortrait(
  context: CanvasRenderingContext2D,
  node: NodeData,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
  density: number,
  samples: SaddleSample[],
) {
  drawNodeRays(context, node, toScreen, worldRadius);
  drawNodeCurves(context, node, toScreen, worldRadius, density, samples);
}

function drawDefectiveNodePortrait(
  context: CanvasRenderingContext2D,
  node: DefectiveNodeData,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
  density: number,
  samples: SaddleSample[],
) {
  drawDefectiveNodeRay(context, node, toScreen, worldRadius);
  drawDefectiveNodeCurves(context, node, toScreen, worldRadius, density, samples);
}

function drawDefectiveNodeRay(
  context: CanvasRenderingContext2D,
  node: DefectiveNodeData,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
) {
  context.save();
  context.lineWidth = 2.5;
  context.strokeStyle = SADDLE_AXIS_COLOR;
  context.setLineDash([]);
  [-1, 1].forEach((sign) => {
    drawNodeRay(context, scale(node.eigenvector, sign), node.stable, toScreen, worldRadius);
  });
  context.restore();
}

function drawStarPortrait(
  context: CanvasRenderingContext2D,
  star: StarData,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
  density: number,
  samples: SaddleSample[],
) {
  const activeSamples = samples.length > 0 ? samples : defaultStarSamples;
  const visibleSamples = activeSamples.slice(0, density >= 3 ? activeSamples.length : Math.min(activeSamples.length, 6));

  context.save();
  context.lineWidth = 2.3;
  context.strokeStyle = SADDLE_CURVE_COLOR;
  context.setLineDash([]);

  visibleSamples.forEach((sample) => {
    const rawDirection: Vec = [sample.stableCoefficient, sample.unstableCoefficient];
    const length = norm(rawDirection);
    if (length < 1e-6) return;
    const direction = scale(rawDirection, 1 / length);
    drawNodeRay(context, direction, star.stable, toScreen, worldRadius);
    drawNodeRay(context, scale(direction, -1), star.stable, toScreen, worldRadius);
  });

  context.restore();
}

function drawDefectiveNodeCurves(
  context: CanvasRenderingContext2D,
  node: DefectiveNodeData,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
  density: number,
  samples: SaddleSample[],
) {
  const visibleLimit = worldRadius * 1.08;
  const growthTarget = worldRadius * 1.55;
  const activeSamples = samples ?? defaultSaddleSamples;
  const visibleSamples = activeSamples.slice(0, density >= 3 ? activeSamples.length : 4);

  context.save();
  context.strokeStyle = SADDLE_CURVE_COLOR;
  context.fillStyle = context.strokeStyle;
  context.lineWidth = 1.9;
  context.globalAlpha = 0.95;
  context.setLineDash([]);

  visibleSamples.forEach((sample) => {
    if (Math.abs(sample.unstableCoefficient) < 1e-6) return;
    const coefficient = Math.max(Math.abs(sample.stableCoefficient), Math.abs(sample.unstableCoefficient));
    const spans = nodeTimeSpans(growthTarget, coefficient, Math.abs(node.lambda), worldRadius * 0.004);
    const tStart = node.stable ? -spans.away : -spans.toward;
    const tEnd = node.stable ? spans.toward : spans.away;
    const segments = sampleDefectiveNodeCurve(
      node,
      sample.stableCoefficient,
      sample.unstableCoefficient,
      tStart,
      tEnd,
      visibleLimit,
      worldRadius * 0.004,
    );
    segments.forEach((segment) => {
      const screenSegment = segment.map(toScreen);
      drawScreenPolyline(context, screenSegment);
      drawArrowsByScreenLength(context, screenSegment, density >= 3 ? 3 : 2, 9);
    });
  });

  context.restore();
}

function sampleDefectiveNodeCurve(
  node: DefectiveNodeData,
  eigenCoefficient: number,
  generalizedCoefficient: number,
  tStart: number,
  tEnd: number,
  visibleLimit: number,
  minVisibleRadius: number,
): Vec[][] {
  const segments: Vec[][] = [];
  let current: Vec[] = [];
  const samples = 1100;

  for (let index = 0; index <= samples; index += 1) {
    const t = tStart + ((tEnd - tStart) * index) / samples;
    const point = defectiveNodePoint(node, eigenCoefficient, generalizedCoefficient, t);
    const visible =
      Number.isFinite(point[0] + point[1]) &&
      Math.abs(point[0]) <= visibleLimit &&
      Math.abs(point[1]) <= visibleLimit &&
      norm(point) >= minVisibleRadius;

    if (visible) {
      current.push(point);
    } else if (current.length > 1) {
      segments.push(current);
      current = [];
    } else {
      current = [];
    }
  }

  if (current.length > 1) segments.push(current);
  return segments;
}

function defectiveNodePoint(
  node: DefectiveNodeData,
  eigenCoefficient: number,
  generalizedCoefficient: number,
  t: number,
): Vec {
  const eigenPart = scale(node.eigenvector, eigenCoefficient + generalizedCoefficient * t);
  const generalizedPart = scale(node.generalizedVector, generalizedCoefficient);
  return scale(add(eigenPart, generalizedPart), Math.exp(node.lambda * t));
}

function drawNodeRays(
  context: CanvasRenderingContext2D,
  node: NodeData,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
) {
  context.save();
  context.lineWidth = 2.5;
  context.strokeStyle = SADDLE_AXIS_COLOR;
  context.setLineDash([]);

  [node.slow.vector, node.fast.vector].forEach((direction) => {
    [-1, 1].forEach((sign) => {
      drawNodeRay(context, scale(direction, sign), node.stable, toScreen, worldRadius);
    });
  });

  context.restore();
}

function drawNodeRay(
  context: CanvasRenderingContext2D,
  direction: Vec,
  stable: boolean,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
) {
  const endScale = rayLimit(direction, worldRadius) * 1.02;
  const start = toScreen(scale(direction, worldRadius * 0.004));
  const end = toScreen(scale(direction, endScale));

  context.beginPath();
  context.moveTo(start[0], start[1]);
  context.lineTo(end[0], end[1]);
  context.stroke();

  const arrowLength = endScale * 0.085;
  [0.18, 0.36, 0.54, 0.72, 0.9].forEach((fraction) => {
    const center = endScale * fraction;
    const outwardStart = toScreen(scale(direction, center - arrowLength / 2));
    const outwardEnd = toScreen(scale(direction, center + arrowLength / 2));
    if (stable) {
      drawArrow(context, outwardEnd, outwardStart, 9);
    } else {
      drawArrow(context, outwardStart, outwardEnd, 9);
    }
  });
}

function drawNodeCurves(
  context: CanvasRenderingContext2D,
  node: NodeData,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
  density: number,
  samples: SaddleSample[],
) {
  const visibleLimit = worldRadius * 1.08;
  const growthTarget = worldRadius * 1.55;
  const activeSamples = samples ?? defaultSaddleSamples;
  const visibleSamples = activeSamples.slice(0, density >= 3 ? activeSamples.length : 4);

  context.save();
  context.strokeStyle = SADDLE_CURVE_COLOR;
  context.fillStyle = context.strokeStyle;
  context.lineWidth = 1.9;
  context.globalAlpha = 0.95;
  context.setLineDash([]);

  visibleSamples.forEach((sample) => {
    if (Math.abs(sample.stableCoefficient) < 1e-6 || Math.abs(sample.unstableCoefficient) < 1e-6) return;
    const spans = nodeTimeSpans(
      growthTarget,
      Math.max(Math.abs(sample.stableCoefficient), Math.abs(sample.unstableCoefficient)),
      Math.min(Math.abs(node.slow.lambda), Math.abs(node.fast.lambda)),
      worldRadius * 0.004,
    );
    const tStart = node.stable ? -spans.away : -spans.toward;
    const tEnd = node.stable ? spans.toward : spans.away;
    const segments = sampleNodeCurve(
      node,
      sample.stableCoefficient,
      sample.unstableCoefficient,
      tStart,
      tEnd,
      visibleLimit,
    );
    segments.forEach((segment) => {
      const screenSegment = segment.map(toScreen);
      drawScreenPolyline(context, screenSegment);
      drawArrowsByScreenLength(context, screenSegment, density >= 3 ? 3 : 2, 9);
    });
  });

  context.restore();
}

function nodeTimeSpans(target: number, coefficient: number, slowRate: number, originTarget: number) {
  const safeCoefficient = Math.max(coefficient, 0.04);
  const safeRate = Math.max(slowRate, 0.04);
  const safeOriginTarget = Math.max(originTarget, 0.002);
  return {
    away: Math.min(10.5, Math.max(1.8, Math.log(Math.max(target / safeCoefficient, 1.25)) / safeRate + 0.9)),
    toward: Math.min(12, Math.max(2.2, Math.log(Math.max(safeCoefficient / safeOriginTarget, 1.25)) / safeRate + 0.9)),
  };
}

function sampleNodeCurve(
  node: NodeData,
  slowCoefficient: number,
  fastCoefficient: number,
  tStart: number,
  tEnd: number,
  visibleLimit: number,
): Vec[][] {
  const segments: Vec[][] = [];
  let current: Vec[] = [];
  const samples = 1100;

  for (let index = 0; index <= samples; index += 1) {
    const t = tStart + ((tEnd - tStart) * index) / samples;
    const point = add(
      scale(node.slow.vector, slowCoefficient * Math.exp(node.slow.lambda * t)),
      scale(node.fast.vector, fastCoefficient * Math.exp(node.fast.lambda * t)),
    );
    const visible =
      Number.isFinite(point[0] + point[1]) &&
      Math.abs(point[0]) <= visibleLimit &&
      Math.abs(point[1]) <= visibleLimit;

    if (visible) {
      current.push(point);
    } else if (current.length > 1) {
      segments.push(current);
      current = [];
    } else {
      current = [];
    }
  }

  if (current.length > 1) segments.push(current);
  return segments;
}

function drawCenterPortrait(
  context: CanvasRenderingContext2D,
  matrix: Matrix,
  center: CenterData,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
  density: number,
  samples: CenterSample[],
  showReferenceLines = true,
) {
  const activeSamples = samples.length > 0 ? samples : defaultCenterSamples;
  const visibleSamples = activeSamples.slice(0, density >= 3 ? activeSamples.length : Math.min(activeSamples.length, 4));

  context.save();
  context.strokeStyle = SADDLE_CURVE_COLOR;
  context.fillStyle = context.strokeStyle;
  context.lineWidth = 2;
  context.globalAlpha = 0.95;
  context.setLineDash([]);

  visibleSamples.forEach((sample) => {
    const seed: Vec = [sample.x, sample.y];
    if (norm(seed) < 1e-6) return;
    const orbit = sampleCenterOrbit(matrix, center.beta, seed);
    const screenOrbit = orbit.map(toScreen);
    drawScreenPolyline(context, screenOrbit);
    drawArrowsByScreenLength(context, screenOrbit, density >= 3 ? 4 : 3, 9);
  });

  context.restore();
  if (showReferenceLines) {
    drawCenterPrincipalAxes(context, centerPrincipalAxes(matrix, center), toScreen, worldRadius);
  }
}

function sampleCenterOrbit(matrix: Matrix, beta: number, seed: Vec): Vec[] {
  const velocityBasis = scale(multiply(matrix, seed), 1 / beta);
  const points: Vec[] = [];
  const samples = 360;

  for (let index = 0; index <= samples; index += 1) {
    const theta = (2 * Math.PI * index) / samples;
    points.push(add(scale(seed, Math.cos(theta)), scale(velocityBasis, Math.sin(theta))));
  }

  return points;
}

function drawCenterPrincipalAxes(
  context: CanvasRenderingContext2D,
  axes: PrincipalAxis[],
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
) {
  context.save();
  context.strokeStyle = EIGEN_VECTOR_COLOR;
  context.fillStyle = EIGEN_VECTOR_COLOR;
  context.lineWidth = 1.8;
  context.globalAlpha = 0.9;
  context.setLineDash([6, 6]);
  context.font = "italic 700 13px KaTeX_Main, 'Times New Roman', serif";
  context.textAlign = "center";
  context.textBaseline = "middle";

  axes.forEach((axis, index) => {
    const length = Math.min(worldRadius * 0.78, rayLimit(axis.vector, worldRadius) * 0.72);
    const start = toScreen(scale(axis.vector, -length));
    const end = toScreen(scale(axis.vector, length));
    context.beginPath();
    context.moveTo(start[0], start[1]);
    context.lineTo(end[0], end[1]);
    context.stroke();

    const label = toScreen(scale(axis.vector, length + worldRadius * 0.07));
    drawPrincipalAxisLabel(context, label, index + 1);
  });

  context.restore();
}

function drawPrincipalAxisLabel(context: CanvasRenderingContext2D, position: Vec, index: number) {
  const [x, y] = position;
  context.save();
  context.setLineDash([]);
  context.font = "italic 700 14px KaTeX_Main, 'Times New Roman', serif";
  context.lineWidth = 5;
  context.strokeStyle = "#fbf7ed";
  context.strokeText("a", x - 6, y + 4);
  context.fillStyle = EIGEN_VECTOR_COLOR;
  context.fillText("a", x - 6, y + 4);
  context.font = "700 9px KaTeX_Main, 'Times New Roman', serif";
  context.strokeStyle = "#fbf7ed";
  context.strokeText(String(index), x + 5, y + 7);
  context.fillStyle = EIGEN_VECTOR_COLOR;
  context.fillText(String(index), x + 5, y + 7);
  context.restore();
}

function drawSpiralPortrait(
  context: CanvasRenderingContext2D,
  matrix: Matrix,
  spiral: SpiralData,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
  density: number,
  samples: CenterSample[],
) {
  const activeSamples = samples.length > 0 ? samples : defaultCenterSamples;
  const visibleSamples = activeSamples.slice(0, density >= 3 ? activeSamples.length : Math.min(activeSamples.length, 4));

  context.save();
  context.strokeStyle = SADDLE_CURVE_COLOR;
  context.fillStyle = context.strokeStyle;
  context.lineWidth = 1.95;
  context.globalAlpha = 0.95;
  context.setLineDash([]);

  visibleSamples.forEach((sample) => {
    const seed: Vec = [sample.x, sample.y];
    if (norm(seed) < 1e-6) return;
    const segments = sampleSpiralCurve(matrix, spiral, seed, worldRadius);
    segments.forEach((segment) => {
      const screenSegment = segment.map(toScreen);
      drawScreenPolyline(context, screenSegment);
      drawArrowsByScreenLength(context, screenSegment, density >= 3 ? 4 : 3, 9);
    });
  });

  context.restore();
}

function sampleSpiralCurve(
  matrix: Matrix,
  spiral: SpiralData,
  seed: Vec,
  worldRadius: number,
): Vec[][] {
  const visibleLimit = worldRadius * 1.08;
  const minVisibleRadius = worldRadius * 0.006;
  const shifted: Matrix = [
    [matrix[0][0] - spiral.alpha, matrix[0][1]],
    [matrix[1][0], matrix[1][1] - spiral.alpha],
  ];
  const seedExtent = Math.max(norm(seed), 0.08);
  const alphaSize = Math.max(Math.abs(spiral.alpha), 0.04);
  const rotationSpan = (2 * Math.PI * (spiral.beta < 0.75 ? 2 : 2.8)) / spiral.beta;
  const awaySpan = Math.min(
    12,
    Math.max(rotationSpan * 0.72, Math.log(Math.max(visibleLimit / seedExtent, 1.35)) / alphaSize + 0.7),
  );
  const towardSpan = Math.min(
    12,
    Math.max(rotationSpan * 0.9, Math.log(Math.max(seedExtent / minVisibleRadius, 1.35)) / alphaSize + 0.7),
  );
  const tStart = spiral.stable ? -awaySpan : -towardSpan;
  const tEnd = spiral.stable ? towardSpan : awaySpan;
  const segments: Vec[][] = [];
  let current: Vec[] = [];
  const samples = 900;

  for (let index = 0; index <= samples; index += 1) {
    const t = tStart + ((tEnd - tStart) * index) / samples;
    const point = spiralPoint(shifted, spiral, seed, t);
    const radius = norm(point);
    const visible =
      Number.isFinite(point[0] + point[1]) &&
      Math.abs(point[0]) <= visibleLimit &&
      Math.abs(point[1]) <= visibleLimit &&
      radius >= minVisibleRadius;

    if (visible) {
      current.push(point);
    } else if (current.length > 1) {
      segments.push(current);
      current = [];
    } else {
      current = [];
    }
  }

  if (current.length > 1) segments.push(current);
  return segments;
}

function spiralPoint(shifted: Matrix, spiral: SpiralData, seed: Vec, t: number): Vec {
  const angle = spiral.beta * t;
  const oscillation = add(
    scale(seed, Math.cos(angle)),
    scale(multiply(shifted, seed), Math.sin(angle) / spiral.beta),
  );
  return scale(oscillation, Math.exp(spiral.alpha * t));
}

function drawScreenPolyline(context: CanvasRenderingContext2D, points: Vec[]) {
  if (points.length < 2) return;
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach((point) => context.lineTo(point[0], point[1]));
  context.stroke();
}

function drawArrowsByScreenLength(
  context: CanvasRenderingContext2D,
  points: Vec[],
  count: number,
  size: number,
) {
  const totalLength = screenPathLength(points);
  if (totalLength < 90) return;

  for (let index = 1; index <= count; index += 1) {
    const centerDistance = (totalLength * index) / (count + 1);
    const halfLength = Math.min(13, totalLength * 0.035);
    const start = pointAtScreenDistance(points, Math.max(0, centerDistance - halfLength));
    const end = pointAtScreenDistance(points, Math.min(totalLength, centerDistance + halfLength));
    if (start && end && Math.hypot(end[0] - start[0], end[1] - start[1]) > 2) {
      drawArrow(context, start, end, size);
    }
  }
}

function screenPathLength(points: Vec[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]);
  }
  return length;
}

function pointAtScreenDistance(points: Vec[], targetDistance: number): Vec | null {
  if (points.length === 0) return null;
  if (targetDistance <= 0) return points[0];

  let walked = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const segmentLength = Math.hypot(current[0] - previous[0], current[1] - previous[1]);
    if (walked + segmentLength >= targetDistance) {
      const ratio = segmentLength > 0 ? (targetDistance - walked) / segmentLength : 0;
      return [
        previous[0] + (current[0] - previous[0]) * ratio,
        previous[1] + (current[1] - previous[1]) * ratio,
      ];
    }
    walked += segmentLength;
  }

  return points[points.length - 1];
}

function drawTrajectories(
  context: CanvasRenderingContext2D,
  matrix: Matrix,
  mode: ScaleMode,
  toScreen: (point: Vec) => Vec,
  worldRadius: number,
  density: number,
) {
  const seeds = initialSeeds.slice(0, 8 + density * 4);
  const step = mode === "physical" ? 0.018 : 0.045;
  const steps = mode === "physical" ? 580 : 520;
  const limit = worldRadius * 1.14;

  context.save();
  seeds.forEach((seed, index) => {
    const hue = index % 2 === 0 ? "#235789" : "#8f5b25";
    drawTrajectoryBranch(context, matrix, seed, step, steps, limit, mode, toScreen, hue);
    drawTrajectoryBranch(context, matrix, seed, -step, steps, limit, mode, toScreen, "#2f7f72");
  });
  context.restore();
}

function drawTrajectoryBranch(
  context: CanvasRenderingContext2D,
  matrix: Matrix,
  seed: Vec,
  step: number,
  steps: number,
  limit: number,
  mode: ScaleMode,
  toScreen: (point: Vec) => Vec,
  color: string,
) {
  let point = seed;
  const path: Vec[] = [];
  for (let i = 0; i < steps; i += 1) {
    if (Math.abs(point[0]) > limit || Math.abs(point[1]) > limit || !Number.isFinite(point[0] + point[1])) break;
    path.push(point);
    point = rk4Step(matrix, point, step, mode);
  }
  if (path.length < 2) return;

  context.strokeStyle = color;
  context.globalAlpha = 0.76;
  context.lineWidth = 1.7;
  context.setLineDash([]);
  context.beginPath();
  const first = toScreen(path[0]);
  context.moveTo(first[0], first[1]);
  for (const p of path.slice(1)) {
    const screen = toScreen(p);
    context.lineTo(screen[0], screen[1]);
  }
  context.stroke();

  const arrowIndex = Math.min(path.length - 1, Math.max(5, Math.floor(path.length * 0.62)));
  const arrowStart = toScreen(path[Math.max(0, arrowIndex - 4)]);
  const arrowEnd = toScreen(path[arrowIndex]);
  drawArrow(context, arrowStart, arrowEnd, 6);
  context.globalAlpha = 1;
}

function drawOrigin(context: CanvasRenderingContext2D, toScreen: (point: Vec) => Vec) {
  const origin = toScreen([0, 0]);
  context.save();
  context.fillStyle = "#252b33";
  context.beginPath();
  context.arc(origin[0], origin[1], 4.5, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawArrow(context: CanvasRenderingContext2D, start: Vec, end: Vec, size: number) {
  const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
  context.beginPath();
  context.moveTo(start[0], start[1]);
  context.lineTo(end[0], end[1]);
  context.stroke();

  const previousLineCap = context.lineCap;
  const previousLineJoin = context.lineJoin;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(end[0] - size * Math.cos(angle - Math.PI / 5), end[1] - size * Math.sin(angle - Math.PI / 5));
  context.lineTo(end[0], end[1]);
  context.lineTo(end[0] - size * Math.cos(angle + Math.PI / 5), end[1] - size * Math.sin(angle + Math.PI / 5));
  context.stroke();
  context.lineCap = previousLineCap;
  context.lineJoin = previousLineJoin;
}

function MatrixInput({
  matrix,
  onChange,
}: {
  matrix: Matrix;
  onChange: (matrix: Matrix) => void;
}) {
  const [draft, setDraft] = useState<string[][]>(() => matrix.map((row) => row.map(formatNumber)));

  const isCompleteNumber = (value: string) => /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value.trim());

  const update = (row: 0 | 1, column: 0 | 1, value: string) => {
    setDraft((current) => {
      const next = current.map((draftRow) => [...draftRow]);
      next[row][column] = value;
      return next;
    });

    if (!isCompleteNumber(value)) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;

    const next: Matrix = [
      [...matrix[0]] as [number, number],
      [...matrix[1]] as [number, number],
    ];
    next[row][column] = parsed;
    onChange(next);
  };

  const normalize = (row: 0 | 1, column: 0 | 1) => {
    setDraft((current) => {
      const value = current[row][column];
      const next = current.map((draftRow) => [...draftRow]);
      next[row][column] = isCompleteNumber(value) ? formatNumber(Number(value)) : formatNumber(matrix[row][column]);
      return next;
    });
  };

  return (
    <div className="matrix-input" dir="ltr">
      {matrix.map((row, rowIndex) =>
        row.map((_value, columnIndex) => (
          <input
            key={`${rowIndex}-${columnIndex}`}
            aria-label={`a${rowIndex + 1}${columnIndex + 1}`}
            type="text"
            inputMode="decimal"
            value={draft[rowIndex][columnIndex]}
            onChange={(event) => update(rowIndex as 0 | 1, columnIndex as 0 | 1, event.target.value)}
            onBlur={() => normalize(rowIndex as 0 | 1, columnIndex as 0 | 1)}
          />
        )),
      )}
    </div>
  );
}

function SampleEditor({
  samples,
  resetSamples,
  onChange,
  onClose,
}: {
  samples: SaddleSample[];
  resetSamples: SaddleSample[];
  onChange: (samples: SaddleSample[]) => void;
  onClose: () => void;
}) {
  const updateSample = (index: number, key: keyof SaddleSample, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    onChange(samples.map((sample, sampleIndex) => (
      sampleIndex === index ? { ...sample, [key]: parsed } : sample
    )));
  };

  const removeSample = (index: number) => {
    if (samples.length <= 1) return;
    onChange(samples.filter((_sample, sampleIndex) => sampleIndex !== index));
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="sample-modal" role="dialog" aria-modal="true" aria-labelledby="sample-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sample-modal-header">
          <div>
            <span>מקדמי פתרונות</span>
            <h2 id="sample-modal-title">מדגם הפתרונות</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="סגירה">×</button>
        </div>

        <div className="sample-table" dir="ltr">
          <div className="sample-table-head">
            <span><MathText math={String.raw`c_1`} /></span>
            <span><MathText math={String.raw`c_2`} /></span>
            <span />
          </div>
          {samples.map((sample, index) => (
            <div className="sample-row" key={`sample-${index}`}>
              <input
                type="number"
                step="0.05"
                value={sample.stableCoefficient}
                onChange={(event) => updateSample(index, "stableCoefficient", event.target.value)}
              />
              <input
                type="number"
                step="0.05"
                value={sample.unstableCoefficient}
                onChange={(event) => updateSample(index, "unstableCoefficient", event.target.value)}
              />
              <button type="button" onClick={() => removeSample(index)} aria-label="מחיקת פתרון">−</button>
            </div>
          ))}
        </div>

        <div className="sample-modal-actions">
          <button type="button" onClick={() => onChange([...samples, emptySaddleSample])}>הוסף פתרון</button>
          <button type="button" onClick={() => onChange(resetSamples.map((sample) => ({ ...sample })))}>איפוס מדגם</button>
        </div>
      </div>
    </div>
  );
}

function CenterSampleEditor({
  samples,
  onChange,
  onClose,
}: {
  samples: CenterSample[];
  onChange: (samples: CenterSample[]) => void;
  onClose: () => void;
}) {
  const updateSample = (index: number, key: keyof CenterSample, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    onChange(samples.map((sample, sampleIndex) => (
      sampleIndex === index ? { ...sample, [key]: parsed } : sample
    )));
  };

  const removeSample = (index: number) => {
    if (samples.length <= 1) return;
    onChange(samples.filter((_sample, sampleIndex) => sampleIndex !== index));
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="sample-modal" role="dialog" aria-modal="true" aria-labelledby="center-sample-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sample-modal-header">
          <div>
            <span>נקודות על מסלולים</span>
            <h2 id="center-sample-modal-title">מדגם הפתרונות</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="סגירה">×</button>
        </div>

        <div className="sample-table" dir="ltr">
          <div className="sample-table-head">
            <span><MathText math={String.raw`x_0`} /></span>
            <span><MathText math={String.raw`y_0`} /></span>
            <span />
          </div>
          {samples.map((sample, index) => (
            <div className="sample-row" key={`center-sample-${index}`}>
              <input
                type="number"
                step="0.05"
                value={sample.x}
                onChange={(event) => updateSample(index, "x", event.target.value)}
              />
              <input
                type="number"
                step="0.05"
                value={sample.y}
                onChange={(event) => updateSample(index, "y", event.target.value)}
              />
              <button type="button" onClick={() => removeSample(index)} aria-label="מחיקת פתרון">−</button>
            </div>
          ))}
        </div>

        <div className="sample-modal-actions">
          <button type="button" onClick={() => onChange([...samples, emptyCenterSample])}>הוסף נקודה</button>
          <button type="button" onClick={() => onChange(defaultCenterSamples.map((sample) => ({ ...sample })))}>איפוס מדגם</button>
        </div>
      </div>
    </div>
  );
}

function vectorLatex(vector: Vec): string {
  return `\\begin{pmatrix}${formatNumber(vector[0])}\\\\${formatNumber(vector[1])}\\end{pmatrix}`;
}

function SvgMatrixEntry({ value, x, y }: { value: number; x: number; y: number }) {
  const parts = rationalDisplayParts(value);

  if (parts.kind !== "fraction") {
    return (
      <text x={x} y={y} className="assembled-matrix-svg-entry" textAnchor="middle" dominantBaseline="middle">
        {parts.value}
      </text>
    );
  }

  const fractionX = parts.sign ? x + 9 : x;
  const signX = x - 22;

  return (
    <g className="assembled-matrix-svg-entry">
      {parts.sign && (
        <text x={signX} y={y} textAnchor="middle" dominantBaseline="middle">
          {parts.sign}
        </text>
      )}
      <text x={fractionX} y={y - 15} textAnchor="middle" dominantBaseline="middle">
        {parts.numerator}
      </text>
      <line x1={fractionX - 16} y1={y} x2={fractionX + 16} y2={y} />
      <text x={fractionX} y={y + 17} textAnchor="middle" dominantBaseline="middle">
        {parts.denominator}
      </text>
    </g>
  );
}

function AssembledMatrixDisplay({ matrix }: { matrix: Matrix }) {
  return (
    <svg
      className="assembled-matrix-svg"
      role="img"
      viewBox="0 0 520 250"
      aria-label="המטריצה המתקבלת"
    >
      <text x="58" y="132" className="assembled-matrix-svg-letter" textAnchor="middle" dominantBaseline="middle">
        A
      </text>
      <text x="98" y="132" className="assembled-matrix-svg-letter" textAnchor="middle" dominantBaseline="middle">
        =
      </text>
      <path className="assembled-matrix-svg-bracket" d="M158 42 C134 42 134 42 134 66 L134 184 C134 208 134 208 158 208" />
      <path className="assembled-matrix-svg-bracket" d="M362 42 C386 42 386 42 386 66 L386 184 C386 208 386 208 362 208" />
      <SvgMatrixEntry value={matrix[0][0]} x={210} y={92} />
      <SvgMatrixEntry value={matrix[0][1]} x={310} y={92} />
      <SvgMatrixEntry value={matrix[1][0]} x={210} y={162} />
      <SvgMatrixEntry value={matrix[1][1]} x={310} y={162} />
    </svg>
  );
}

function complexNumberLatex(real: number, imag: number): string {
  const realPart = formatNumber(real);
  const imagPart = formatNumber(Math.abs(imag));
  if (Math.abs(imag) < 0.0005) return realPart;
  if (Math.abs(real) < 0.0005) return imag < 0 ? `-${imagPart}i` : `${imagPart}i`;
  return imag < 0 ? `${realPart}-${imagPart}i` : `${realPart}+${imagPart}i`;
}

function complexMethodData(matrix: Matrix, alpha: number, beta: number) {
  const realPart: Vec = [1, 0];
  const shifted: Matrix = [
    [matrix[0][0] - alpha, matrix[0][1]],
    [matrix[1][0], matrix[1][1] - alpha],
  ];
  const sinePart = scale(multiply(shifted, realPart), 1 / beta);
  const imaginaryPart = scale(sinePart, -1);

  return {
    eigenvector: `\\begin{pmatrix}${complexNumberLatex(realPart[0], imaginaryPart[0])}\\\\${complexNumberLatex(realPart[1], imaginaryPart[1])}\\end{pmatrix}`,
  };
}

function DiagonalizableMethodPanel({
  firstVector,
  secondVector,
  asymptoticRows,
  note,
}: {
  firstVector: Vec;
  secondVector: Vec;
  asymptoticRows: Array<{ time: string; direction: string }>;
  note: React.ReactNode;
}) {
  return (
    <section className="panel-section method-panel">
      <div className="section-heading">אופן ציור התמונה</div>
      <p>
        המטריצה לכסינה עם וקטורים עצמיים:
      </p>
      <div className="method-vector-grid" dir="ltr">
        <MathText block math={String.raw`V_1=${vectorLatex(firstVector)}`} />
        <MathText block math={String.raw`V_2=${vectorLatex(secondVector)}`} />
      </div>
      <p>
        ולכן הפתרון הכללי הוא מהצורה:
      </p>
      <div className="method-equation" dir="ltr">
        <MathText block math={String.raw`X(t)=c_1V_1e^{\lambda_1t}+c_2V_2e^{\lambda_2t}`} />
      </div>
      <div className="method-asymptotics">
        <strong>התנהגות אסימפטוטית</strong>
        <p>פתרונות כלליים מתיישרים עם הישרים העצמיים:</p>
        <div className="asymptotic-table" dir="ltr">
          {asymptoticRows.map((row) => (
            <div key={row.time}>
              <MathText math={row.time} />
              <MathText math={row.direction} />
            </div>
          ))}
        </div>
        <div className="method-note">
          <strong>שימו לב!</strong>
          <span>{note}</span>
        </div>
      </div>
    </section>
  );
}

function SaddleMethodPanel({ saddle }: { saddle: SaddleData }) {
  const stableVector = orientReferenceVector(saddle.stable.vector);
  const unstableVector = orientReferenceVector(saddle.unstable.vector);

  return (
    <DiagonalizableMethodPanel
      firstVector={stableVector}
      secondVector={unstableVector}
      asymptoticRows={[
        { time: String.raw`t\to\infty`, direction: String.raw`V_2` },
        { time: String.raw`t\to-\infty`, direction: String.raw`V_1` },
      ]}
      note={(
        <>
          למעט הישרים שמגיעים לראשית כאשר <MathText math={String.raw`t\to\infty`} /> או{" "}
          <MathText math={String.raw`t\to-\infty`} />, כל הפתרונות שאינם ישרים בורחים
          מהראשית כאשר <MathText math={String.raw`t\to\pm\infty`} />.
        </>
      )}
    />
  );
}

function NodeMethodPanel({ node }: { node: NodeData }) {
  const firstVector = orientReferenceVector(node.stable ? node.slow.vector : node.fast.vector);
  const secondVector = orientReferenceVector(node.stable ? node.fast.vector : node.slow.vector);
  const towardTime = node.stable ? String.raw`t\to\infty` : String.raw`t\to-\infty`;
  const awayTime = node.stable ? String.raw`t\to-\infty` : String.raw`t\to\infty`;

  return (
    <DiagonalizableMethodPanel
      firstVector={firstVector}
      secondVector={secondVector}
      asymptoticRows={[
        { time: String.raw`t\to\infty`, direction: String.raw`V_1` },
        { time: String.raw`t\to-\infty`, direction: String.raw`V_2` },
      ]}
      note={(
        <>
          כל פתרונות המשוואה, ישרים ולא ישרים, שואפים לראשית כאשר{" "}
          <MathText math={towardTime} /> ובורחים מהראשית כאשר <MathText math={awayTime} />.
          השוני ביניהם הוא בכיוון שבו הם מבצעים זאת.
        </>
      )}
    />
  );
}

function StarMethodPanel({ star }: { star: StarData }) {
  const towardTime = star.stable ? String.raw`t\to\infty` : String.raw`t\to-\infty`;
  const awayTime = star.stable ? String.raw`t\to-\infty` : String.raw`t\to\infty`;

  return (
    <section className="panel-section method-panel">
      <div className="section-heading">אופן ציור התמונה</div>
      <p>
        במקרה זה אפשר לבחור בסיס של וקטורים עצמיים:
      </p>
      <div className="method-vector-grid" dir="ltr">
        <MathText block math={String.raw`V_1=\begin{pmatrix}1\\0\end{pmatrix}`} />
        <MathText block math={String.raw`V_2=\begin{pmatrix}0\\1\end{pmatrix}`} />
      </div>
      <p>
        הפתרון הכללי הוא מהצורה:
      </p>
      <div className="method-equation" dir="ltr">
        <MathText block math={String.raw`X(t)=(c_1V_1+c_2V_2)e^{\lambda t}`} />
      </div>
      <p>
        הפתרון מתאר ישר שכיוונו <MathText math={String.raw`c_1V_1+c_2V_2`} />.
        היות ו־<MathText math={String.raw`\{V_1,V_2\}`} /> בת״ל, אפשר לקבל כך כל ישר ב־
        <MathText math={String.raw`\mathbb{R}^2`} />. לכן הפתרונות הם כל הישרים.
      </p>
      <div className="method-asymptotics">
        <strong>התנהגות אסימפטוטית</strong>
        <div className="asymptotic-table star-asymptotic-table">
          <div>
            <MathText math={towardTime} />
            <span>שאיפה לראשית</span>
          </div>
          <div>
            <MathText math={awayTime} />
            <span>בריחה מהראשית</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function DefectiveNodeMethodPanel({ node }: { node: DefectiveNodeData }) {
  const eigenvector = orientReferenceVector(node.eigenvector);
  const generalizedVector = orientReferenceVector(node.generalizedVector);
  const forwardDirection = node.stable ? String.raw`-c_2V_1` : String.raw`c_2V_1`;
  const backwardDirection = node.stable ? String.raw`c_2V_1` : String.raw`-c_2V_1`;
  const conclusion = node.stable ? (
    <>
      בצד של <MathText math={String.raw`V_2`} />{" "}החיובי, הפתרונות מתחילים הרחק מהראשית
      בכיוון <MathText math={String.raw`-V_1`} />, מסתובבים לכיוון{" "}
      <MathText math={String.raw`V_2`} /> ומתקרבים אל הראשית עם כיוון שמשתנה ל־
      <MathText math={String.raw`V_1`} />. בצד של <MathText math={String.raw`V_2`} />{" "}
      השלילי מקבלים תמונת מראה.
    </>
  ) : (
    <>
      בצד של <MathText math={String.raw`V_2`} />{" "}החיובי, הפתרונות מתחילים בראשית
      בכיוון <MathText math={String.raw`-V_1`} />, מסתובבים לכיוון{" "}
      <MathText math={String.raw`V_2`} /> ובורחים מהראשית עם כיוון שמשתנה ל־
      <MathText math={String.raw`V_1`} />. בצד של <MathText math={String.raw`V_2`} />{" "}
      השלילי מקבלים תמונת מראה.
    </>
  );

  return (
    <section className="panel-section method-panel">
      <div className="section-heading">אופן ציור התמונה</div>
      <p>
        במקרה זה אפשר לבחור בסיס שמורכב מווקטור עצמי:
      </p>
      <div className="method-vector-grid" dir="ltr">
        <MathText block math={String.raw`V_1=${vectorLatex(eigenvector)}`} />
      </div>
      <p>
        ומווקטור חבר:
      </p>
      <div className="method-vector-row" dir="ltr">
        <MathText block math={String.raw`V_2=${vectorLatex(generalizedVector)}`} />
        <MathText block math={String.raw`(A-\lambda I)V_2=V_1`} />
      </div>
      <p>
        הפתרון הכללי הוא מהצורה:
      </p>
      <div className="method-equation" dir="ltr">
        <MathText block math={String.raw`X(t)=c_1V_1e^{\lambda t}+c_2(tV_1+V_2)e^{\lambda t}`} />
      </div>
      <div className="method-asymptotics">
        <strong>התנהגות אסימפטוטית</strong>
        <div className="asymptotic-table" dir="ltr">
          <div>
            <MathText math={String.raw`t\to\infty`} />
            <MathText math={forwardDirection} />
          </div>
          <div>
            <MathText math={String.raw`t\to-\infty`} />
            <MathText math={backwardDirection} />
          </div>
          <div>
            <MathText math={String.raw`t=0`} />
            <MathText math={String.raw`c_1V_1+c_2V_2`} />
          </div>
        </div>
        <div className="method-note">
          <strong>מסקנה</strong>
          <span>{conclusion}</span>
        </div>
      </div>
    </section>
  );
}

function CenterMethodPanel({ matrix, center }: { matrix: Matrix; center: CenterData }) {
  const data = complexMethodData(matrix, 0, center.beta);

  return (
    <section className="panel-section method-panel">
      <div className="section-heading">אופן ציור התמונה</div>
      <p>
        למשוואה יש וקטור עצמי מרוכב:
      </p>
      <div className="method-vector-grid" dir="ltr">
        <MathText block math={String.raw`V=${data.eigenvector}`} />
      </div>
      <p>
        וצורת הפתרון הכללית היא:
      </p>
      <div className="method-equation" dir="ltr">
        <MathText block math={String.raw`X(t)=c_1\operatorname{Re}(Ve^{i\beta t})+c_2\operatorname{Im}(Ve^{i\beta t})`} />
      </div>
      <p>
        פתרונות אלה מתארים אליפסות קונצנטריות, כולן עם סיבוב אחיד וכולן באותן פרופורציות.
      </p>
      <div className="method-asymptotics">
        <strong>כיוון הסיבוב</strong>
        <p>
          היות ולכל האליפסות כיוון סיבוב זהה, נבחר נקודה <MathText math={String.raw`X_0`} /> על אחת
          האליפסות ונחשב את <MathText math={String.raw`AX_0`} />. הווקטור שמתקבל הוא כיוון הסיבוב
          באותה הנקודה.
        </p>
        <strong>מציאת האליפסות בצורה מפורשת</strong>
        <p>
          לכל האליפסות צירים פרופורציוניים. נציב <MathText math={String.raw`c_1=1,c_2=0`} /> ונקבל
          פתרון לדוגמה:
        </p>
        <div className="method-equation-stack" dir="ltr">
          <MathText block math={String.raw`X(t)=\operatorname{Re}(Ve^{i\beta t})`} />
          <MathText block math={String.raw`=U\cos(\beta t)-W\sin(\beta t)`} />
        </div>
        <p>
          מגדירים את המטריצה <MathText math={String.raw`M=[\,U\ -W\,]`} />, והווקטורים העצמיים של{" "}
          <MathText math={String.raw`M^tM`} /> הם הצירים הראשיים של האליפסה.
        </p>
      </div>
    </section>
  );
}

function SpiralMethodPanel({ matrix, spiral }: { matrix: Matrix; spiral: SpiralData }) {
  const data = complexMethodData(matrix, spiral.alpha, spiral.beta);
  const towardTime = spiral.stable ? String.raw`t\to\infty` : String.raw`t\to-\infty`;
  const awayTime = spiral.stable ? String.raw`t\to-\infty` : String.raw`t\to\infty`;

  return (
    <section className="panel-section method-panel">
      <div className="section-heading">אופן ציור התמונה</div>
      <p>
        למשוואה יש וקטור עצמי מרוכב:
      </p>
      <div className="method-vector-grid" dir="ltr">
        <MathText block math={String.raw`V=${data.eigenvector}`} />
      </div>
      <p>
        צורת הפתרון הכללית היא כמו במקרה המרכז, עם גורם משותף <MathText math={String.raw`e^{\alpha t}`} />:
      </p>
      <div className="method-equation" dir="ltr">
        <MathText block math={String.raw`X(t)=e^{\alpha t}\left(c_1\operatorname{Re}(Ve^{i\beta t})+c_2\operatorname{Im}(Ve^{i\beta t})\right)`} />
      </div>
      <div className="method-asymptotics">
        <strong>כיוון הסיבוב</strong>
        <p>
          כיוון הסיבוב נקבע כמו במרכז: בוחרים נקודה <MathText math={String.raw`X_0`} /> על אחד
          המסלולים ומחשבים את <MathText math={String.raw`AX_0`} />. הווקטור שמתקבל הוא כיוון הסיבוב
          באותה הנקודה.
        </p>
        <strong>התנהגות אסימפטוטית</strong>
        <div className="asymptotic-table star-asymptotic-table">
          <div>
            <MathText math={towardTime} />
            <span>שאיפה לראשית</span>
          </div>
          <div>
            <MathText math={awayTime} />
            <span>בריחה מהראשית</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ZeroEigenMethodPanel({ zeroEigen }: { zeroEigen: ZeroEigenData }) {
  if (zeroEigen.kind === "zero") {
    return (
      <section className="panel-section method-panel">
        <div className="section-heading">אופן ציור התמונה</div>
        <p>
          במקרה זה <MathText math={String.raw`A=0`} />, ולכן המשוואה היא פשוט:
        </p>
        <div className="method-equation" dir="ltr">
          <MathText block math={String.raw`X'(t)=0`} />
        </div>
        <p>
          כל נקודה במישור היא נקודת שיווי־משקל. לכן אין תנועה בין נקודות, ותמונת הפאזה מורכבת
          כולה מנקודות קבועות.
        </p>
      </section>
    );
  }

  if (zeroEigen.kind === "nilpotent") {
    const equilibriumVector = orientReferenceVector(zeroEigen.equilibriumVector);
    const generalizedVector = orientReferenceVector(zeroEigen.generalizedVector);

    return (
      <section className="panel-section method-panel">
        <div className="section-heading">אופן ציור התמונה</div>
        <p>
          במקרה זה יש ערך עצמי יחיד <MathText math={String.raw`\lambda=0`} />, עם וקטור עצמי:
        </p>
        <div className="method-vector-grid" dir="ltr">
          <MathText block math={String.raw`V_1=${vectorLatex(equilibriumVector)}`} />
        </div>
        <p>
          ובוחרים וקטור חבר:
        </p>
        <div className="method-vector-row" dir="ltr">
          <MathText block math={String.raw`V_2=${vectorLatex(generalizedVector)}`} />
          <MathText block math={String.raw`AV_2=V_1`} />
        </div>
        <p>
          הפתרון הכללי הוא מהצורה:
        </p>
        <div className="method-equation" dir="ltr">
          <MathText block math={String.raw`X(t)=c_1V_1+c_2(tV_1+V_2)`} />
        </div>
        <div className="method-asymptotics">
          <strong>תיאור גיאומטרי</strong>
          <p>
            כאשר <MathText math={String.raw`c_2=0`} /> מקבלים נקודות שיווי־משקל על הישר בכיוון{" "}
            <MathText math={String.raw`V_1`} />. כאשר <MathText math={String.raw`c_2\ne0`} />,
            הפתרונות נעים לאורך ישרים המקבילים ל־<MathText math={String.raw`V_1`} />, ולכן מתקבלת
            תמונה של החלקה אחידה בכיוון זה.
          </p>
        </div>
      </section>
    );
  }

  const equilibriumVector = orientReferenceVector(zeroEigen.equilibrium.vector);
  const movingVector = orientReferenceVector(zeroEigen.moving.vector);
  const towardTime = zeroEigen.stable ? String.raw`t\to\infty` : String.raw`t\to-\infty`;
  const awayTime = zeroEigen.stable ? String.raw`t\to-\infty` : String.raw`t\to\infty`;

  return (
    <section className="panel-section method-panel">
      <div className="section-heading">אופן ציור התמונה</div>
      <p>
        במקרה זה יש ערך עצמי אפס, ולכן מתקבל ישר של נקודות שיווי־משקל בכיוון:
      </p>
      <div className="method-vector-grid" dir="ltr">
        <MathText block math={String.raw`V_1=${vectorLatex(equilibriumVector)}`} />
      </div>
      <p>
        בכיוון השני יש ערך עצמי <MathText math={String.raw`\mu\ne0`} /> עם וקטור:
      </p>
      <div className="method-vector-grid" dir="ltr">
        <MathText block math={String.raw`V_2=${vectorLatex(movingVector)}`} />
      </div>
      <p>
        לכן הפתרון הכללי הוא מהצורה:
      </p>
      <div className="method-equation" dir="ltr">
        <MathText block math={String.raw`X(t)=c_1V_1+c_2V_2e^{\mu t}`} />
      </div>
      <div className="method-asymptotics">
        <strong>התנהגות אסימפטוטית</strong>
        <div className="asymptotic-table star-asymptotic-table">
          <div>
            <MathText math={towardTime} />
            <span>התקרבות לישר שיווי־המשקל</span>
          </div>
          <div>
            <MathText math={awayTime} />
            <span>בריחה מישר שיווי־המשקל</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function MatrixAssemblerMethodPanel({ config }: { config: MatrixAssemblerConfig }) {
  if (config.matrixModel === "complex") {
    const eigenvalueText = config.kind === "center" ? String.raw`\lambda=\beta i` : String.raw`\lambda=\alpha+\beta i`;

    return (
      <section className="panel-section method-panel">
        <div className="section-heading">איך המטריצה נבנית?</div>
        <p>
          במקרה המרוכב מזינים ערך עצמי <MathText math={eigenvalueText} /> ווקטור עצמי מרוכב מהצורה:
        </p>
        <div className="method-equation" dir="ltr">
          <MathText block math={String.raw`V=U+iW`} />
        </div>
        <p>
          עוברים לבסיס הממשי <MathText math={String.raw`P=[\,U\ W\,]`} />. בבסיס הזה פעולת המטריצה
          מתוארת על ידי:
        </p>
        <div className="method-equation" dir="ltr">
          <MathText block math={String.raw`B=\begin{pmatrix}\alpha&\beta\\-\beta&\alpha\end{pmatrix},\qquad A=PBP^{-1}`} />
        </div>
        <p>
          עבור מרכז לוקחים <MathText math={String.raw`\alpha=0`} />. לכן מתקבלת מטריצה עם ערכים עצמיים
          מרוכבים צמודים, ותמונת הפאזה היא מרכז או ספירלה לפי הסימן של <MathText math={String.raw`\alpha`} />.
        </p>
      </section>
    );
  }

  if (config.matrixModel === "star") {
    return (
      <section className="panel-section method-panel">
        <div className="section-heading">איך המטריצה נבנית?</div>
        <p>
          בתמונת כוכב כל ישר שעובר בראשית הוא ישר עצמי. לכן המטריצה המתאימה היא פשוט כפולה
          סקלרית של הזהות:
        </p>
        <div className="method-equation" dir="ltr">
          <MathText block math={String.raw`A=\lambda I`} />
        </div>
        <p>
          הווקטורים <MathText math={String.raw`V_1,V_2`} /> משמשים כאן כדי להדגיש שאפשר לבחור בסיס
          של וקטורים עצמיים, אבל המטריצה עצמה אינה תלויה בבחירת הבסיס.
        </p>
      </section>
    );
  }

  if (config.matrixModel === "defective") {
    return (
      <section className="panel-section method-panel">
        <div className="section-heading">איך המטריצה נבנית?</div>
        <p>
          בצומת מנוון בוחרים וקטור עצמי <MathText math={String.raw`V_1`} /> ווקטור חבר{" "}
          <MathText math={String.raw`V_2`} /> שמקיים:
        </p>
        <div className="method-equation" dir="ltr">
          <MathText block math={String.raw`(A-\lambda I)V_2=V_1`} />
        </div>
        <p>
          מציבים <MathText math={String.raw`P=[\,V_1\ V_2\,]`} /> ואת בלוק ז׳ורדן:
        </p>
        <div className="method-equation" dir="ltr">
          <MathText block math={String.raw`J=\begin{pmatrix}\lambda&1\\0&\lambda\end{pmatrix},\qquad A=PJP^{-1}`} />
        </div>
      </section>
    );
  }

  return (
    <section className="panel-section method-panel">
      <div className="section-heading">איך המטריצה נבנית?</div>
      <p>
        מציבים את הווקטורים העצמיים כעמודות במטריצה <MathText math={String.raw`P=[\,V_1\ V_2\,]`} />,
        ואת הערכים העצמיים במטריצה האלכסונית <MathText math={String.raw`D=\operatorname{diag}(\lambda_1,\lambda_2)`} />.
      </p>
      <div className="method-equation" dir="ltr">
        <MathText block math={String.raw`A=PDP^{-1}`} />
      </div>
      <p>
        מכיוון שהווקטורים בלתי־תלויים, <MathText math={String.raw`P`} /> הפיכה, והמטריצה שמתקבלת
        אכן מקיימת <MathText math={String.raw`AV_1=\lambda_1V_1`} /> ו־
        <MathText math={String.raw`AV_2=\lambda_2V_2`} />.
      </p>
    </section>
  );
}

function MatrixAssemblerActivity({ onOpenInLab }: { onOpenInLab: (matrix: Matrix) => void }) {
  const [assemblerKind, setAssemblerKind] = useState<MatrixAssemblerKind>("saddle");
  const [stableLambdaDraft, setStableLambdaDraft] = useState("-1");
  const [stableVectorDraft, setStableVectorDraft] = useState<[string, string]>(["1", "0"]);
  const [unstableLambdaDraft, setUnstableLambdaDraft] = useState("2");
  const [unstableVectorDraft, setUnstableVectorDraft] = useState<[string, string]>(["0", "1"]);
  const config = matrixAssemblerConfigs.find((candidate) => candidate.kind === assemblerKind) ?? matrixAssemblerConfigs[0];

  const result = useMemo(() => {
    const firstLambda = Number(stableLambdaDraft);
    const secondLambda = Number(unstableLambdaDraft);
    const firstVector: Vec = [Number(stableVectorDraft[0]), Number(stableVectorDraft[1])];
    const secondVector: Vec = [Number(unstableVectorDraft[0]), Number(unstableVectorDraft[1])];
    const values = config.requiresSecondLambda
      ? [firstLambda, secondLambda, ...firstVector, ...secondVector]
      : [firstLambda, ...firstVector, ...secondVector];
    const errors: string[] = [];
    const signText = (sign: LambdaRequirement) => {
      if (sign === "negative") return "שלילי";
      if (sign === "positive") return "חיובי";
      return "שונה מאפס";
    };
    const hasCorrectSign = (value: number, sign: LambdaRequirement) => {
      if (sign === "negative") return value < 0;
      if (sign === "positive") return value > 0;
      return Math.abs(value) > 1e-8;
    };

    if (values.some((value) => !Number.isFinite(value))) {
      errors.push("יש להזין מספרים תקינים בכל השדות.");
    }
    if (Number.isFinite(firstLambda) && !hasCorrectSign(firstLambda, config.firstLambdaSign)) {
      errors.push(`הערך העצמי הראשון צריך להיות ${signText(config.firstLambdaSign)}.`);
    }
    if (config.requiresSecondLambda && Number.isFinite(secondLambda) && !hasCorrectSign(secondLambda, config.secondLambdaSign)) {
      errors.push(`הערך העצמי השני צריך להיות ${signText(config.secondLambdaSign)}.`);
    }
    if (config.matrixModel === "diagonal" && config.kind !== "saddle" && Math.abs(firstLambda - secondLambda) < 1e-8) {
      errors.push("בצומת רגיל הערכים העצמיים צריכים להיות שונים. אם הם שווים, זו תמונת כוכב.");
    }
    if (norm(firstVector) < 1e-8) {
      errors.push(config.matrixModel === "complex" ? "החלק הממשי של הווקטור העצמי לא יכול להיות וקטור האפס." : "הווקטור הראשון לא יכול להיות וקטור האפס.");
    }
    if (norm(secondVector) < 1e-8) {
      errors.push(config.matrixModel === "complex" ? "החלק המדומה של הווקטור העצמי לא יכול להיות וקטור האפס." : `${config.secondVectorLabel} לא יכול להיות וקטור האפס.`);
    }

    const det = vectorDeterminant(firstVector, secondVector);
    if (config.requiresIndependentVectors && Math.abs(det) < 1e-8) {
      errors.push(config.matrixModel === "complex"
        ? "החלק הממשי והחלק המדומה צריכים להיות בלתי־תלויים ליניארית."
        : config.matrixModel === "defective"
        ? "הווקטור העצמי והווקטור החבר צריכים להיות בלתי־תלויים ליניארית."
        : "שני הווקטורים העצמיים צריכים להיות בלתי־תלויים ליניארית.");
    }

    if (errors.length > 0) return { errors, matrix: null };

    let matrix: Matrix;
    if (config.matrixModel === "complex") {
      const alpha = config.kind === "center" ? 0 : firstLambda;
      const beta = config.kind === "center" ? firstLambda : secondLambda;
      matrix = complexMatrixFromEigenData(alpha, beta, firstVector, secondVector);
    } else if (config.matrixModel === "star") {
      matrix = [
        [firstLambda, 0],
        [0, firstLambda],
      ];
    } else if (config.matrixModel === "defective") {
      matrix = defectiveMatrixFromJordanData(firstLambda, firstVector, secondVector);
    } else {
      matrix = diagonalMatrixFromEigenData(firstLambda, firstVector, secondLambda, secondVector);
    }

    return {
      errors,
      matrix,
    };
  }, [config, stableLambdaDraft, stableVectorDraft, unstableLambdaDraft, unstableVectorDraft]);

  const chooseAssemblerKind = (kind: MatrixAssemblerKind) => {
    setAssemblerKind(kind);
    if (kind === "center") {
      setStableLambdaDraft("1");
      setUnstableLambdaDraft("1");
    } else if (kind === "stable-spiral") {
      setStableLambdaDraft("-0.4");
      setUnstableLambdaDraft("1.2");
    } else if (kind === "unstable-spiral") {
      setStableLambdaDraft("0.4");
      setUnstableLambdaDraft("1.2");
    } else if (kind.includes("unstable")) {
      setStableLambdaDraft("1");
      setUnstableLambdaDraft("2");
    } else if (kind === "saddle") {
      setStableLambdaDraft("-1");
      setUnstableLambdaDraft("2");
    } else {
      setStableLambdaDraft("-1");
      setUnstableLambdaDraft("-2");
    }
  };

  const updateStableVector = (index: 0 | 1, value: string) => {
    setStableVectorDraft((current) => {
      const next: [string, string] = [...current];
      next[index] = value;
      return next;
    });
  };

  const updateUnstableVector = (index: 0 | 1, value: string) => {
    setUnstableVectorDraft((current) => {
      const next: [string, string] = [...current];
      next[index] = value;
      return next;
    });
  };

  return (
    <section className="assembler-grid">
      <aside className="control-panel assembler-panel">
        <section className="panel-section">
          <div className="section-heading">סוג תמונה</div>
          <div className="assembler-kind-grid">
            {matrixAssemblerConfigs.map((option) => (
              <button
                key={option.kind}
                className={assemblerKind === option.kind ? "selected" : ""}
                type="button"
                onClick={() => chooseAssemblerKind(option.kind)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="activity-hint">
            בחרו את סוג התמונה, הזינו ערכים עצמיים ווקטורים מתאימים, והמערכת תרכיב מטריצה שמקיימת את הדרישות.
          </p>
        </section>

        <section className="panel-section">
          <div className="section-heading">
            <span>{config.firstTitle}</span>
            <span className="method-vector-row" dir="ltr">
              <MathText math={config.firstLambdaMath} />
              {config.matrixModel === "complex" && config.requiresSecondLambda && (
                <MathText math={config.secondLambdaMath} />
              )}
            </span>
          </div>
          <label className="assembler-field">
            <span>{config.firstLambdaLabel}</span>
            <input
              dir="ltr"
              inputMode="decimal"
              type="text"
              value={stableLambdaDraft}
              onChange={(event) => setStableLambdaDraft(event.target.value)}
            />
          </label>
          {config.matrixModel === "complex" && config.requiresSecondLambda && (
            <label className="assembler-field">
              <span>{config.secondLambdaLabel}</span>
              <input
                dir="ltr"
                inputMode="decimal"
                type="text"
                value={unstableLambdaDraft}
                onChange={(event) => setUnstableLambdaDraft(event.target.value)}
              />
            </label>
          )}
          {config.matrixModel !== "complex" && (
            <div className="assembler-vector-field">
              <span>{config.firstVectorLabel ?? "וקטור עצמי"} <MathText math={config.firstVectorMath ?? String.raw`V_1`} /></span>
              <div className="vector-inputs" dir="ltr">
                <input
                  aria-label="v1 x"
                  inputMode="decimal"
                  type="text"
                  value={stableVectorDraft[0]}
                  onChange={(event) => updateStableVector(0, event.target.value)}
                />
                <input
                  aria-label="v1 y"
                  inputMode="decimal"
                  type="text"
                  value={stableVectorDraft[1]}
                  onChange={(event) => updateStableVector(1, event.target.value)}
                />
              </div>
            </div>
          )}
        </section>

        <section className="panel-section">
          <div className="section-heading">
            <span>{config.secondTitle}</span>
            {config.secondLambdaMath && !(config.matrixModel === "complex" && config.requiresSecondLambda) && (
              <MathText math={config.secondLambdaMath} />
            )}
          </div>
          {config.requiresSecondLambda && config.matrixModel !== "complex" && (
            <label className="assembler-field">
              <span>{config.secondLambdaLabel}</span>
              <input
                dir="ltr"
                inputMode="decimal"
                type="text"
                value={unstableLambdaDraft}
                onChange={(event) => setUnstableLambdaDraft(event.target.value)}
              />
            </label>
          )}
          {config.matrixModel === "complex" && (
            <div className="assembler-vector-field">
              <span>{config.firstVectorLabel ?? "חלק ממשי"} <MathText math={config.firstVectorMath ?? String.raw`U`} /></span>
              <div className="vector-inputs" dir="ltr">
                <input
                  aria-label="u x"
                  inputMode="decimal"
                  type="text"
                  value={stableVectorDraft[0]}
                  onChange={(event) => updateStableVector(0, event.target.value)}
                />
                <input
                  aria-label="u y"
                  inputMode="decimal"
                  type="text"
                  value={stableVectorDraft[1]}
                  onChange={(event) => updateStableVector(1, event.target.value)}
                />
              </div>
            </div>
          )}
          <div className="assembler-vector-field">
            <span>{config.secondVectorLabel} <MathText math={config.secondVectorMath ?? String.raw`V_2`} /></span>
            <div className="vector-inputs" dir="ltr">
              <input
                aria-label="v2 x"
                inputMode="decimal"
                type="text"
                value={unstableVectorDraft[0]}
                onChange={(event) => updateUnstableVector(0, event.target.value)}
              />
              <input
                aria-label="v2 y"
                inputMode="decimal"
                type="text"
                value={unstableVectorDraft[1]}
                onChange={(event) => updateUnstableVector(1, event.target.value)}
              />
            </div>
          </div>
        </section>
      </aside>

      <section className="canvas-panel">
        <div className="canvas-header">
          <div>
            <span className="canvas-label">תמונת פאזה מהמטריצה שהורכבה</span>
            <strong>{result.matrix ? classify(result.matrix) : "ממתין לקלט תקין"}</strong>
          </div>
          <div className="legend">
            <span className="legend-item eigen">ישרים עצמיים</span>
            {result.matrix && eigenVectorReferences(result.matrix).length > 0 && (
              <span className="legend-item eigen-vector">וקטורים עצמיים</span>
            )}
            <span className="legend-item curve">פתרונות</span>
            <span className="legend-item field">שדה כיוונים</span>
          </div>
        </div>
        <div className="canvas-wrap">
          {result.matrix ? (
            <PhaseCanvas
              matrix={result.matrix}
              mode="normalized"
              density={2}
              worldRadius={3.2}
              saddleSamples={defaultSaddleSamples}
              starSamples={defaultStarSamples}
              centerSamples={defaultCenterSamples}
            />
          ) : (
            <div className="canvas-placeholder">הציור יופיע כאן לאחר הזנת נתונים תקינים.</div>
          )}
        </div>
      </section>

      <aside className="analysis-panel">
        <section className="result-card primary assembler-result-card">
          <span>המטריצה המתקבלת</span>
          {result.matrix ? (
            <strong className="assembler-matrix-result" dir="ltr">
              <AssembledMatrixDisplay matrix={result.matrix} />
            </strong>
          ) : (
            <strong>אין עדיין מטריצה</strong>
          )}
        </section>

        {result.errors.length > 0 ? (
          <section className="panel-section validation-card">
            <div className="section-heading">בדיקות קלט</div>
            <ul>
              {result.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </section>
        ) : (
          <MatrixAssemblerMethodPanel config={config} />
        )}

        {result.matrix && (
          <button type="button" className="panel-action" onClick={() => onOpenInLab(result.matrix)}>
            פתח במעבדה הראשית
          </button>
        )}
      </aside>
    </section>
  );
}

function QuizStats({ stats }: { stats: QuizSessionStats }) {
  const percent = stats.answered === 0 ? 0 : Math.round((100 * stats.correct) / stats.answered);
  return (
    <div className="quiz-stats" aria-label="סטטיסטיקת תרגול">
      <span>שאלות: {stats.answered}</span>
      <span>נכונות: {stats.correct}</span>
      <span>דיוק: {percent}%</span>
      <span>רצף: {stats.currentStreak}</span>
    </div>
  );
}

const emptyQuizStats: QuizSessionStats = {
  answered: 0,
  correct: 0,
  currentStreak: 0,
  bestStreak: 0,
};

function MistakeReport({
  mistakes,
  onClose,
  onClear,
}: {
  mistakes: MistakeRecord[];
  onClose: () => void;
  onClear: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="sample-modal mistake-report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mistake-report-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sample-modal-header">
          <div>
            <span>תרגול</span>
            <h2 id="mistake-report-title">דו״ח טעויות</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="סגירה">×</button>
        </div>

        {mistakes.length === 0 ? (
          <p className="mistake-report-empty">אין טעויות בסשן הנוכחי.</p>
        ) : (
          <div className="mistake-report-list">
            {mistakes.map((mistake, index) => (
              <article className="mistake-card" key={mistake.id}>
                <div className="mistake-card-header">
                  <strong>טעות {index + 1}</strong>
                  <span>
                    Seed {mistake.seed} · {difficultyLabels[mistake.difficulty]} · {practiceActivityLabels[mistake.activity]}
                  </span>
                </div>

                {mistake.activity === "matrix-to-portrait" && (
                  <div className="mistake-matrix-card">
                    <AssembledMatrixDisplay matrix={mistake.matrix} />
                  </div>
                )}

                <div className="mistake-answer-grid">
                  <section>
                    <span>נבחר</span>
                    <strong className="wrong">{mistake.selectedLabel}</strong>
                  </section>
                  <section>
                    <span>נכון</span>
                    <strong className="correct">{mistake.correctLabel}</strong>
                  </section>
                </div>

                <p className="mistake-explanation">{mistake.explanation}</p>
              </article>
            ))}
          </div>
        )}

        <div className="sample-modal-actions">
          {mistakes.length > 0 && (
            <button type="button" onClick={onClear}>איפוס מעקב</button>
          )}
          <button type="button" onClick={onClose}>סגירה</button>
        </div>
      </div>
    </div>
  );
}

function SelfPracticeActivity() {
  const [activity, setActivity] = useState<PracticeActivity>("matrix-to-portrait");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [quizMode, setQuizMode] = useState<QuizMode>("qualitative");
  const [seed, setSeed] = useState(104136);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [stats, setStats] = useState<QuizSessionStats>(emptyQuizStats);
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [isMistakeReportOpen, setIsMistakeReportOpen] = useState(false);

  const question = useMemo(
    () => buildPracticeQuestion(difficulty, quizMode, seed),
    [difficulty, quizMode, seed],
  );
  const { phaseCase, portraitOptions, classificationOptions } = question;

  const currentOptions = activity === "matrix-to-portrait" ? portraitOptions : classificationOptions;
  const correctOptionId = currentOptions.find((option) => option.kind === phaseCase.kind)?.id ?? "";
  const isSelectedCorrect = selectedOptionId === correctOptionId;

  const resetForNextQuestion = (step = 1) => {
    setSeed((current) => current + step);
    setSelectedOptionId(null);
    setChecked(false);
  };

  const chooseActivity = (nextActivity: PracticeActivity) => {
    setActivity(nextActivity);
    resetForNextQuestion(nextActivity === "matrix-to-portrait" ? 37 : 53);
  };

  const chooseDifficulty = (nextDifficulty: Difficulty) => {
    setDifficulty(nextDifficulty);
    resetForNextQuestion(nextDifficulty === "easy" ? 101 : nextDifficulty === "medium" ? 211 : 307);
  };

  const chooseQuizMode = (nextMode: QuizMode) => {
    setQuizMode(nextMode);
    resetForNextQuestion(nextMode === "qualitative" ? 17 : 29);
  };

  const resetTracking = () => {
    setStats(emptyQuizStats);
    setMistakes([]);
    setIsMistakeReportOpen(false);
  };

  const checkAnswer = () => {
    if (!selectedOptionId || checked) return;
    const isCorrect = selectedOptionId === correctOptionId;
    setChecked(true);
    setStats((current) => updateStats(current, isCorrect));

    if (!isCorrect) {
      const selected = currentOptions.find((option) => option.id === selectedOptionId);
      if (selected) {
        setMistakes((current) => [
          ...current,
          {
            id: `${seed}-${selectedOptionId}-${Date.now()}`,
            activity,
            difficulty,
            seed,
            matrix: phaseCase.matrix,
            correctKind: phaseCase.kind,
            selectedKind: selected.kind,
            selectedLabel: optionLabel(selected),
            correctLabel: phaseKindLabels[phaseCase.kind],
            explanation: buildMistakeExplanation(activity, phaseCase),
            createdAt: Date.now(),
          },
        ]);
      }
    }
  };

  return (
    <section className="practice-grid" aria-label="תרגול במישור הפאזה">
      <aside className="control-panel practice-panel">
        <section className="panel-section">
          <div className="section-heading">פעילות</div>
          <div className="segmented-control stacked">
            <button
              className={activity === "matrix-to-portrait" ? "selected" : ""}
              type="button"
              onClick={() => chooseActivity("matrix-to-portrait")}
            >
              מטריצה לתמונה
            </button>
            <button
              className={activity === "portrait-to-class" ? "selected" : ""}
              type="button"
              onClick={() => chooseActivity("portrait-to-class")}
            >
              תמונה לסיווג
            </button>
          </div>
        </section>

        <section className="panel-section">
          <div className="section-heading">רמת קושי</div>
          <div className="segmented-control">
            {(["easy", "medium", "hard"] as Difficulty[]).map((option) => (
              <button
                key={option}
                className={difficulty === option ? "selected" : ""}
                type="button"
                onClick={() => chooseDifficulty(option)}
              >
                {difficultyLabels[option]}
              </button>
            ))}
          </div>
        </section>

        {activity === "matrix-to-portrait" && (
          <section className="panel-section">
            <div className="section-heading">סוג התאמה</div>
            <div className="segmented-control">
              <button
                className={quizMode === "qualitative" ? "selected" : ""}
                type="button"
                onClick={() => chooseQuizMode("qualitative")}
              >
                איכותי
              </button>
              <button
                className={quizMode === "exact" ? "selected" : ""}
                type="button"
                onClick={() => chooseQuizMode("exact")}
              >
                מדויק
              </button>
            </div>
            <p className="activity-hint">
              במצב &quot;איכותי&quot; מקבלים תמונות פאזה גנריות. במצב &quot;מדויק&quot; כל תמונות הפאזה נבנות בעזרת אותו בסיס שמתאים למטריצה בשאלה.
            </p>
          </section>
        )}

        <section className="panel-section">
          <div className="section-heading">התקדמות</div>
          <QuizStats stats={stats} />
          <button type="button" className="panel-action" onClick={() => resetForNextQuestion(1)}>
            שאלה חדשה
          </button>
          <button
            type="button"
            className="panel-action secondary"
            disabled={mistakes.length === 0}
            onClick={() => setIsMistakeReportOpen(true)}
          >
            דו״ח טעויות ({mistakes.length})
          </button>
          <button type="button" className="panel-action secondary" onClick={resetTracking}>
            איפוס מעקב
          </button>
        </section>
      </aside>

      <section className="practice-main">
        <div className="practice-question-card">
          <p className="course-kicker">Seed {seed} · {difficultyLabels[difficulty]}</p>
          <h2>{activity === "matrix-to-portrait" ? "איזו תמונת פאזה מתאימה למטריצה?" : "איזה סיווג מתאים לתמונת הפאזה?"}</h2>
          {activity === "matrix-to-portrait" ? (
            <>
              <p>
                בחרו את האפשרות הגרפית המתאימה. במצב איכותי הכיוונים המדויקים אינם חייבים להיות זהים לכיווני הווקטורים העצמיים.
              </p>
              <div className="practice-matrix-card">
                <AssembledMatrixDisplay matrix={phaseCase.matrix} />
              </div>
            </>
          ) : (
            <p>התמונה מוצגת ללא שם הסיווג וללא וקטורים מסגירים. בחרו את הסיווג המתאים מבין האפשרויות.</p>
          )}
        </div>

        {activity === "portrait-to-class" && (
          <div className="practice-large-portrait">
            <PhaseCanvas
              key={`portrait-to-class-${phaseCase.id}-${activity}`}
              matrix={phaseCase.matrix}
              mode="normalized"
              density={difficulty === "hard" ? 1 : difficulty === "medium" ? 2 : 3}
              worldRadius={3.2}
              saddleSamples={defaultSaddleSamples}
              starSamples={defaultStarSamples}
              centerSamples={defaultCenterSamples}
              showVectorField={difficulty !== "hard"}
              showReferenceLabels={false}
              showReferenceLines={difficulty === "easy"}
              ariaLabel="תמונת פאזה לשאלת סיווג"
            />
          </div>
        )}

        {activity === "matrix-to-portrait" ? (
          <div className="portrait-options-grid">
            {portraitOptions.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const isCorrect = option.id === correctOptionId;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`quiz-option portrait-option ${isSelected ? "selected" : ""} ${checked && isCorrect ? "correct" : ""} ${checked && isSelected && !isCorrect ? "wrong" : ""}`}
                  onClick={() => !checked && setSelectedOptionId(option.id)}
                  aria-pressed={isSelected}
                >
                  <span>{checked ? phaseKindLabels[option.kind] : "אפשרות"}</span>
                  <div className="portrait-option-canvas">
                    <PhaseCanvas
                      key={`matrix-to-portrait-${option.id}-${phaseCase.id}`}
                      matrix={option.matrix}
                      mode="normalized"
                      density={1}
                      worldRadius={3.2}
                      saddleSamples={defaultSaddleSamples}
                      starSamples={defaultStarSamples}
                      centerSamples={defaultCenterSamples}
                      showVectorField={difficulty === "easy"}
                      showReferenceLabels={false}
                      showReferenceLines={quizMode === "exact"}
                      ariaLabel="אפשרות לתמונת פאזה"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="classification-options-grid">
            {classificationOptions.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const isCorrect = option.id === correctOptionId;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`quiz-option classification-option ${isSelected ? "selected" : ""} ${checked && isCorrect ? "correct" : ""} ${checked && isSelected && !isCorrect ? "wrong" : ""}`}
                  onClick={() => !checked && setSelectedOptionId(option.id)}
                  aria-pressed={isSelected}
                >
                  {option.label}
                  {checked && isCorrect && <span> נכון</span>}
                  {checked && isSelected && !isCorrect && <span> לא נכון</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="practice-actions">
          <button type="button" className="panel-action" disabled={!selectedOptionId || checked} onClick={checkAnswer}>
            בדיקה
          </button>
          <button type="button" className="panel-action secondary" disabled={!checked} onClick={() => resetForNextQuestion(1)}>
            שאלה הבאה
          </button>
        </div>
      </section>

      <aside className="analysis-panel practice-feedback-panel">
        <section className="result-card primary">
          <span>סוג השאלה</span>
          <strong>{checked ? phaseKindLabels[phaseCase.kind] : "ממתינים לבדיקה"}</strong>
        </section>
        <section className={`panel-section quiz-feedback ${checked ? (isSelectedCorrect ? "correct" : "wrong") : ""}`}>
          <div className="section-heading">משוב</div>
          {!checked ? (
            <p>בחרו תשובה ולחצו על בדיקה כדי לקבל הסבר.</p>
          ) : (
            <>
              <strong>{isSelectedCorrect ? "נכון." : `לא נכון. התשובה הנכונה היא ${phaseKindLabels[phaseCase.kind]}.`}</strong>
              <p>{activity === "matrix-to-portrait" ? "להלן שתי דרכים לזהות את תמונת הפאזה מתוך המטריצה." : visualFeedbackText(phaseCase.kind)}</p>
            </>
          )}
        </section>
        {checked && activity === "matrix-to-portrait" && (
          <MatrixCalculationDetails phaseCase={phaseCase} />
        )}
      </aside>

      {isMistakeReportOpen && (
        <MistakeReport
          mistakes={mistakes}
          onClose={() => setIsMistakeReportOpen(false)}
          onClear={resetTracking}
        />
      )}
    </section>
  );
}

const introSaddleMatrix: Matrix = [[-2, 0], [0, 3]];
const introStableNodeMatrix: Matrix = [[-2, 0], [0, -1]];
const introUnstableNodeMatrix: Matrix = [[1, 0], [0, 2]];
const introStableStarMatrix: Matrix = [[-1.2, 0], [0, -1.2]];
const introUnstableStarMatrix: Matrix = [[1.2, 0], [0, 1.2]];
const introStableDefectiveNodeMatrix: Matrix = [[-1, 1], [0, -1]];
const introUnstableDefectiveNodeMatrix: Matrix = [[1, 1], [0, 1]];
const introCenterMatrix: Matrix = [[0, -1.4], [1.4, 0]];
const introStableSpiralMatrix: Matrix = [[-0.35, -1.15], [1.15, -0.35]];
const introUnstableSpiralMatrix: Matrix = [[0.35, -1.15], [1.15, 0.35]];
const introStableEquilibriumLineMatrix: Matrix = [[0, 0], [0, -1.2]];
const introUnstableEquilibriumLineMatrix: Matrix = [[0, 0], [0, 1.2]];
const introNilpotentMatrix: Matrix = [[0, 1], [0, 0]];
const introZeroFieldMatrix: Matrix = [[0, 0], [0, 0]];

const nonzeroEigenSubcases = [
  { key: "saddle", label: "אוכף", eigenMath: String.raw`\lambda_1<0<\lambda_2` },
  { key: "stable-node", label: "צומת יציב", eigenMath: String.raw`\lambda_1,\lambda_2<0` },
  { key: "unstable-node", label: "צומת לא יציב", eigenMath: String.raw`\lambda_1,\lambda_2>0` },
  { key: "stable-star", label: "כוכב יציב", eigenMath: String.raw`\lambda_1=\lambda_2<0`, diagonalizable: "לכסין" },
  { key: "unstable-star", label: "כוכב לא יציב", eigenMath: String.raw`\lambda_1=\lambda_2>0`, diagonalizable: "לכסין" },
  {
    key: "stable-defective-node",
    label: "צומת מנוון יציב",
    eigenMath: String.raw`\lambda_1=\lambda_2<0`,
    diagonalizable: "לא לכסין",
  },
  {
    key: "unstable-defective-node",
    label: "צומת מנוון לא יציב",
    eigenMath: String.raw`\lambda_1=\lambda_2>0`,
    diagonalizable: "לא לכסין",
  },
  { key: "center", label: "מרכז", eigenMath: String.raw`\lambda=\pm i\beta` },
  { key: "stable-spiral", label: "ספירלה יציבה", eigenMath: String.raw`\mathrm{Re}(\lambda)<0` },
  { key: "unstable-spiral", label: "ספירלה לא יציבה", eigenMath: String.raw`\mathrm{Re}(\lambda)>0` },
] as const;

const zeroEigenSubcases = [
  { key: "stable-equilibrium-line", label: "ישר שיווי־משקל יציב", eigenMath: String.raw`\lambda_1=0,\;\lambda_2<0` },
  { key: "unstable-equilibrium-line", label: "ישר שיווי־משקל לא יציב", eigenMath: String.raw`\lambda_1=0,\;\lambda_2>0` },
  { key: "nilpotent", label: "מקרה נילפוטנטי", eigenMath: String.raw`\lambda_1=\lambda_2=0` },
  { key: "zero-field", label: "שדה אפס", eigenMath: "A=0" },
] as const;

type IntroSubcase = (typeof nonzeroEigenSubcases)[number] | (typeof zeroEigenSubcases)[number];

function IntroPhasePortrait({
  matrix,
  ariaLabel,
  caption,
}: {
  matrix: Matrix;
  ariaLabel: string;
  caption: string;
}) {
  return (
    <figure className="intro-phase-portrait">
      <div className="intro-phase-portrait-header">
        <div className="legend">
          <span className="legend-item eigen">ישרים עצמיים</span>
          <span className="legend-item eigen-vector">וקטורים עצמיים</span>
          <span className="legend-item curve">פתרונות</span>
          <span className="legend-item field">שדה כיוונים</span>
        </div>
      </div>
      <div className="intro-phase-portrait-canvas">
        <PhaseCanvas
          matrix={matrix}
          mode="normalized"
          density={2}
          worldRadius={3.2}
          saddleSamples={defaultSaddleSamples}
          starSamples={defaultStarSamples}
          centerSamples={defaultCenterSamples}
          showVectorField
          showReferenceLines
          showReferenceLabels
          ariaLabel={ariaLabel}
        />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function SaddleIntroBody() {
  return (
    <div className="intro-sub-expansion-body">
      <p>במקרה זה צורת הפתרון הכללית היא</p>
      <p className="intro-equation">
        <MathText block math="X(t)=c_1V_1e^{\lambda_1 t}+c_2V_2e^{\lambda_2 t}" />
      </p>
      <p>
        כאשר מציבים <MathText math="c_1=\pm1" />, <MathText math="c_2=0" /> מקבלים את הפתרונות{" "}
        <MathText math="X(t)=\pm V_1e^{\lambda_1 t}" />. זאת נוסחה שמתארת ישרים שכיוונם <MathText math="\pm V_1" />,
        אשר שואפים לראשית כאשר <MathText math={String.raw`t\to\infty`} /> ובורחים מהראשית לאורך הישר כאשר{" "}
        <MathText math={String.raw`t\to-\infty`} />.
      </p>
      <p>
        כאשר מציבים <MathText math="c_1=0" />, <MathText math="c_2=\pm1" /> מקבלים את הפתרונות{" "}
        <MathText math="X(t)=\pm V_2e^{\lambda_2 t}" /> שגם הם פתרונות ישרים, כיוונם הוא <MathText math="\pm V_2" />,
        אך הפעם הם שואפים לראשית כאשר <MathText math={String.raw`t\to-\infty`} /> ובורחים מהראשית כאשר{" "}
        <MathText math={String.raw`t\to\infty`} />.
      </p>
      <p>
        לאחר מכן, נוכל לזהות שבמקרה הכללי <MathText math="c_1,c_2" /> שניהם לא אפס - מקבלים פתרונות שכאשר{" "}
        <MathText math={String.raw`t\to\infty`} /> האיבר הדומיננטי בהם הוא <MathText math="c_2V_2e^{\lambda_2 t}" />{" "}
        וכאשר <MathText math={String.raw`t\to-\infty`} /> האיבר הדומיננטי בהם הוא{" "}
        <MathText math="c_1V_1e^{\lambda_1 t}" />.
      </p>
      <p>
        במילים אחרות, כל הפתרונות האחרים הופכים את כיוונם ל-<MathText math="\pm V_2" /> באינסוף ול-{" "}
        <MathText math="\pm V_1" /> במינוס אינסוף, כמודגם באיור שלהלן.
      </p>
      <IntroPhasePortrait
        matrix={introSaddleMatrix}
        ariaLabel="תמונת פאזה של אוכף"
        caption="תמונת פאזה אופיינית של אוכף"
      />
    </div>
  );
}

function StableNodeIntroBody() {
  return (
    <div className="intro-sub-expansion-body">
      <p>במקרה זה צורת הפתרון הכללית היא</p>
      <p className="intro-equation">
        <MathText block math="X(t)=c_1V_1e^{\lambda_1 t}+c_2V_2e^{\lambda_2 t}" />
      </p>
      <p>
        כאשר <MathText math="\lambda_1,\lambda_2<0" /> ו-<MathText math="\lambda_1\neq\lambda_2" />. כאשר מציבים{" "}
        <MathText math="c_1=\pm1" />, <MathText math="c_2=0" /> מקבלים את הפתרונות{" "}
        <MathText math="X(t)=\pm V_1e^{\lambda_1 t}" />. זאת נוסחה שמתארת ישרים שכיוונם <MathText math="\pm V_1" />,
        אשר שואפים לראשית כאשר <MathText math={String.raw`t\to\infty`} /> ובורחים מהראשית לאורך הישר כאשר{" "}
        <MathText math={String.raw`t\to-\infty`} />.
      </p>
      <p>
        כאשר מציבים <MathText math="c_1=0" />, <MathText math="c_2=\pm1" /> מקבלים את הפתרונות{" "}
        <MathText math="X(t)=\pm V_2e^{\lambda_2 t}" /> שגם הם פתרונות ישרים, כיוונם הוא <MathText math="\pm V_2" />,
        וגם כאן הפתרונות שואפים לראשית כאשר <MathText math={String.raw`t\to\infty`} /> ובורחים מהראשית כאשר{" "}
        <MathText math={String.raw`t\to-\infty`} />.
      </p>
      <p>
        לאחר מכן, נוכל לזהות שבמקרה הכללי <MathText math="c_1,c_2" /> שניהם לא אפס, מקבלים פתרונות שכאשר{" "}
        <MathText math={String.raw`t\to\infty`} /> האיבר הדומיננטי בהם הוא <MathText math="c_2V_2e^{\lambda_2 t}" />{" "}
        (בהנחה ש-<MathText math="\lambda_1<\lambda_2<0" />), וכאשר <MathText math={String.raw`t\to-\infty`} /> האיבר
        הדומיננטי בהם הוא <MathText math="c_1V_1e^{\lambda_1 t}" />
      </p>
      <p>
        במילים אחרות, כל הפתרונות שאינם ישרים עצמיים נכנסים לראשית בכיוון <MathText math="\pm V_2" /> כאשר{" "}
        <MathText math={String.raw`t\to\infty`} />, ובורחים ממנה בכיוון <MathText math="\pm V_1" /> כאשר{" "}
        <MathText math={String.raw`t\to-\infty`} />, כמודגם באיור שלהלן.
      </p>
      <IntroPhasePortrait
        matrix={introStableNodeMatrix}
        ariaLabel="תמונת פאזה של צומת יציב"
        caption="תמונת פאזה אופיינית של צומת יציב"
      />
    </div>
  );
}

function UnstableNodeIntroBody() {
  return (
    <div className="intro-sub-expansion-body">
      <p>במקרה זה צורת הפתרון הכללית היא</p>
      <p className="intro-equation">
        <MathText block math="X(t)=c_1V_1e^{\lambda_1 t}+c_2V_2e^{\lambda_2 t}" />
      </p>
      <p>
        כאשר <MathText math="\lambda_1,\lambda_2>0" /> ו-<MathText math="\lambda_1\neq\lambda_2" />. כאשר מציבים{" "}
        <MathText math="c_1=\pm1" />, <MathText math="c_2=0" /> מקבלים את הפתרונות{" "}
        <MathText math="X(t)=\pm V_1e^{\lambda_1 t}" />. זאת נוסחה שמתארת ישרים שכיוונם <MathText math="\pm V_1" />,
        אשר בורחים מהראשית כאשר <MathText math={String.raw`t\to\infty`} /> ושואפים אליה לאורך הישר כאשר{" "}
        <MathText math={String.raw`t\to-\infty`} />.
      </p>
      <p>
        כאשר מציבים <MathText math="c_1=0" />, <MathText math="c_2=\pm1" /> מקבלים את הפתרונות{" "}
        <MathText math="X(t)=\pm V_2e^{\lambda_2 t}" /> שגם הם פתרונות ישרים, כיוונם הוא <MathText math="\pm V_2" />,
        וגם כאן הפתרונות בורחים מהראשית כאשר <MathText math={String.raw`t\to\infty`} /> ושואפים אליה כאשר{" "}
        <MathText math={String.raw`t\to-\infty`} />.
      </p>
      <p>
        לאחר מכן, נוכל לזהות שבמקרה הכללי <MathText math="c_1,c_2" /> שניהם לא אפס, מקבלים פתרונות שכאשר{" "}
        <MathText math={String.raw`t\to\infty`} /> האיבר הדומיננטי בהם הוא <MathText math="c_2V_2e^{\lambda_2 t}" />{" "}
        (בהנחה ש-<MathText math="0<\lambda_1<\lambda_2" />), וכאשר <MathText math={String.raw`t\to-\infty`} /> האיבר
        הדומיננטי בהם הוא <MathText math="c_1V_1e^{\lambda_1 t}" />
      </p>
      <p>
        במילים אחרות, כל הפתרונות שאינם ישרים עצמיים יוצאים מהראשית בכיוון <MathText math="\pm V_2" /> כאשר{" "}
        <MathText math={String.raw`t\to\infty`} />, ונכנסים אליה בכיוון <MathText math="\pm V_1" /> כאשר{" "}
        <MathText math={String.raw`t\to-\infty`} />, כמודגם באיור שלהלן.
      </p>
      <IntroPhasePortrait
        matrix={introUnstableNodeMatrix}
        ariaLabel="תמונת פאזה של צומת לא יציב"
        caption="תמונת פאזה אופיינית של צומת לא יציב"
      />
    </div>
  );
}

function StarIntroBody({ stable }: { stable: boolean }) {
  const matrix = stable ? introStableStarMatrix : introUnstableStarMatrix;
  const behavior = stable ? "ששואפים לראשית" : "שבורחים מהראשית";
  const label = stable ? "כוכב יציב" : "כוכב לא יציב";

  return (
    <div className="intro-sub-expansion-body">
      <p>
        היות והמטריצה בעלת ערך עצמי יחיד ולכסינה, הרי שהיא סקלרית. כלומר <MathText math="A=\lambda I" /> עבור{" "}
        <MathText math="\lambda\neq 0" /> כלשהו. הפתרון הכללי במקרה כזה הוא
      </p>
      <p className="intro-equation">
        <MathText block math={String.raw`X(t)=\begin{pmatrix}a\\b\end{pmatrix}e^{\lambda t}`} />
      </p>
      <p>
        כאשר <MathText math="a,b" /> יכולים להיות כל קומבינציה של סקלרים, היות וכל וקטור הוא וקטור עצמי של המטריצה.
        לכן, פתרונות המשוואה הם כל הישרים ({behavior}), כמודגם באיור שלהלן.
      </p>
      <IntroPhasePortrait
        matrix={matrix}
        ariaLabel={`תמונת פאזה של ${label}`}
        caption={`תמונת פאזה אופיינית של ${label}`}
      />
    </div>
  );
}

function DefectiveNodeIntroBody({ stable }: { stable: boolean }) {
  const matrix = stable ? introStableDefectiveNodeMatrix : introUnstableDefectiveNodeMatrix;
  const label = stable ? "צומת מנוון יציב" : "צומת מנוון לא יציב";

  return (
    <div className="intro-sub-expansion-body">
      <p>
        במקרה זה <MathText math="\lambda_1=\lambda_2=\lambda" />, אך המטריצה אינה לכסינה. לכן קיים רק כיוון עצמי
        אחד <MathText math="V_1" />, יחד עם וקטור חבר <MathText math="V_2" /> שמקיים{" "}
        <MathText math="(A-\lambda I)V_2=V_1" />. הפתרון הכללי הוא
      </p>
      <p className="intro-equation">
        <MathText block math={String.raw`X(t)=c_1e^{\lambda t}V_1+c_2e^{\lambda t}(tV_1+V_2)`} />
      </p>
      <p>
        כאשר מציבים <MathText math="c_2=0" /> מקבלים את הפתרונות <MathText math="X(t)=c_1e^{\lambda t}V_1" />,
        כלומר ישרים שכיוונם <MathText math="\pm V_1" />.
      </p>
      <p>בניגוד לצומת יציב או לא יציב רגיל, אין כיוון עצמי שני שונה.</p>
      <p>עבור פתרון כללי, נתחיל בלדון במקרה שבו <MathText math="c_2>0" />:</p>
      {stable ? (
        <>
          <ol className="intro-numbered-list">
            <li>
              כאשר <MathText math={String.raw`t\to\infty`} />, כיוון הפתרון הופך לדומה ל-<MathText math="-V_1" />,
              כלומר כיוון הישר העצמי השלילי.
            </li>
            <li>
              כאשר <MathText math={String.raw`t\to-\infty`} />, הפתרון בורח מהראשית אך הכיוון (שנובע מהאיבר
              הדומיננטי) הוא <MathText math="V_1" /> (כלומר כיוון הישר העצמי החיובי).
            </li>
            <li>
              כאשר <MathText math="t=0" /> אנחנו נמצאים בנקודה <MathText math="c_1V_1+c_2V_2" /> שנמצאת בצד
              השלילי של <MathText math="V_2" />.
            </li>
          </ol>
          <p>
            כלומר, במקרה הזה כל הפתרונות מגיעים מכיוון החיובי של הישר העצמי, עוברים דרך נקודת ביניים מהצד
            השלילי של <MathText math="V_2" />, ונכנסים לראשית בכיוון השלילי של הישר העצמי.
          </p>
        </>
      ) : (
        <>
          <ol className="intro-numbered-list">
            <li>
              כאשר <MathText math={String.raw`t\to\infty`} />, כיוון הפתרון הופך לדומה ל-<MathText math="V_1" />,
              כלומר כיוון הישר העצמי החיובי.
            </li>
            <li>
              כאשר <MathText math={String.raw`t\to-\infty`} />, הפתרון שואף לראשית אך הכיוון (שנובע מהאיבר
              הדומיננטי) הוא <MathText math="-V_1" /> (כלומר כיוון הישר העצמי השלילי).
            </li>
            <li>
              כאשר <MathText math="t=0" /> אנחנו נמצאים בנקודה <MathText math="c_1V_1+c_2V_2" /> שנמצאת בצד
              החיובי של <MathText math="V_2" />.
            </li>
          </ol>
          <p>
            כלומר, במקרה הזה כל הפתרונות יוצאים מהראשית בכיוון השלילי של הישר העצמי, עוברים דרך נקודת ביניים מהצד
            החיובי של <MathText math="V_2" />, ולאחר מכן בורחים מהראשית בכיוון ששואף לכיוון הישר העצמי החיובי.
          </p>
        </>
      )}
      <p>
        כאשר <MathText math="c_2<0" />, מקבלים משיקולים דומים תמונת מראה מוחלטת של מה שתיארנו זה עתה, כמודגם באיור
        שלהלן.
      </p>
      <IntroPhasePortrait
        matrix={matrix}
        ariaLabel={`תמונת פאזה של ${label}`}
        caption={`תמונת פאזה אופיינית של ${label}`}
      />
    </div>
  );
}

function CenterIntroBody() {
  return (
    <div className="intro-sub-expansion-body">
      <p>
        במקרה זה הערכים העצמיים מרוכבים טהורים <MathText math="\lambda=\pm i\beta" /> עם{" "}
        <MathText math="\beta\neq0" />. לכן קיים וקטור עצמי מרוכב <MathText math="V" />, וצורת הפתרון
        הכללית היא
      </p>
      <p className="intro-equation">
        <MathText block math={String.raw`X(t)=c_1\operatorname{Re}(Ve^{i\beta t})+c_2\operatorname{Im}(Ve^{i\beta t})`} />
      </p>
      <p>
        פתרונות אלה מתארים אליפסות קונצנטריות, כולן עם סיבוב אחיד וכולן באותן פרופורציות של צירים.
      </p>
      <p>
        <strong>כיוון הסיבוב.</strong> היות ולכל האליפסות כיוון סיבוב זהה, מספיק לבחור נקודה{" "}
        <MathText math="X_0" /> על אחת האליפסות ולחשב את <MathText math="AX_0" />. הווקטור שמתקבל הוא
        כיוון הסיבוב באותה נקודה.
      </p>
      <p>
        <strong>חישוב מפורש של האליפסות.</strong> לכל האליפסות צירים פרופורציוניים. נציב{" "}
        <MathText math="c_1=1" />, <MathText math="c_2=0" /> ונקבל פתרון לדוגמה
      </p>
      <p className="intro-equation">
        <MathText block math={String.raw`X(t)=\operatorname{Re}(Ve^{i\beta t})=U\cos(\beta t)-W\sin(\beta t)`} />
      </p>
      <p>
        כאשר כתבנו <MathText math="V=U+iW" />. מגדירים את המטריצה <MathText math="M=[\,U\ \ -W\,]" />, ואז
        הוקטורים העצמיים של <MathText math="M^tM" /> הם כיווני הצירים הראשיים של האליפסה. מכאן ניתן לשחזר
        במדויק את צורת כל אליפסה במישור הפאזה, כמודגם באיור שלהלן.
      </p>
      <IntroPhasePortrait
        matrix={introCenterMatrix}
        ariaLabel="תמונת פאזה של מרכז"
        caption="תמונת פאזה אופיינית של מרכז"
      />
    </div>
  );
}

function SpiralIntroBody({ stable }: { stable: boolean }) {
  const matrix = stable ? introStableSpiralMatrix : introUnstableSpiralMatrix;
  const label = stable ? "ספירלה יציבה" : "ספירלה לא יציבה";
  const towardTime = stable ? String.raw`t\to\infty` : String.raw`t\to-\infty`;
  const awayTime = stable ? String.raw`t\to-\infty` : String.raw`t\to\infty`;
  const alphaCondition = stable ? String.raw`\alpha<0` : String.raw`\alpha>0`;

  return (
    <div className="intro-sub-expansion-body">
      <p>
        במקרה זה הערכים העצמיים מרוכבים <MathText math="\lambda=\alpha\pm i\beta" /> עם{" "}
        <MathText math={alphaCondition} /> ו-<MathText math="\beta\neq0" />. לכן קיים וקטור עצמי מרוכב{" "}
        <MathText math="V" />, וצורת הפתרון הכללית היא כמו במרכז, עם גורם משותף{" "}
        <MathText math="e^{\alpha t}" />:
      </p>
      <p className="intro-equation">
        <MathText
          block
          math={String.raw`X(t)=e^{\alpha t}\left(c_1\operatorname{Re}(Ve^{i\beta t})+c_2\operatorname{Im}(Ve^{i\beta t})\right)`}
        />
      </p>
      <p>
        פתרונות אלה מתארים מסלולים ספירליים: יש סיבוב כמו במרכז, אך בנוסף המרחק מן הראשית{" "}
        {stable ? "קטן" : "גדל"} באופן מעריכי עם הזמן.
      </p>
      <p>
        <strong>כיוון הסיבוב.</strong> כיוון הסיבוב נקבע כמו במרכז: בוחרים נקודה <MathText math="X_0" /> על אחד
        המסלולים ומחשבים את <MathText math="AX_0" />. הווקטור שמתקבל הוא כיוון הסיבוב באותה נקודה.
      </p>
      <p>
        <strong>התנהגות אסימפטוטית.</strong> בניגוד למרכז, המסלולים אינם סגורים. כאשר{" "}
        <MathText math={towardTime} /> הפתרונות {stable ? "שואפים לראשית" : "בורחים מהראשית"}, וכאשר{" "}
        <MathText math={awayTime} /> הם {stable ? "בורחים ממנה" : "שואפים אליה"}, כמודגם באיור שלהלן.
      </p>
      <IntroPhasePortrait
        matrix={matrix}
        ariaLabel={`תמונת פאזה של ${label}`}
        caption={`תמונת פאזה אופיינית של ${label}`}
      />
    </div>
  );
}

function renderIntroSubcaseBody(key: IntroSubcase["key"]) {
  if (key === "saddle") return <SaddleIntroBody />;
  if (key === "stable-node") return <StableNodeIntroBody />;
  if (key === "unstable-node") return <UnstableNodeIntroBody />;
  if (key === "stable-star") return <StarIntroBody stable />;
  if (key === "unstable-star") return <StarIntroBody stable={false} />;
  if (key === "stable-defective-node") return <DefectiveNodeIntroBody stable />;
  if (key === "unstable-defective-node") return <DefectiveNodeIntroBody stable={false} />;
  if (key === "center") return <CenterIntroBody />;
  if (key === "stable-spiral") return <SpiralIntroBody stable />;
  if (key === "unstable-spiral") return <SpiralIntroBody stable={false} />;
  if (key === "stable-equilibrium-line") return <EquilibriumLineIntroBody stable />;
  if (key === "unstable-equilibrium-line") return <EquilibriumLineIntroBody stable={false} />;
  if (key === "nilpotent") return <NilpotentIntroBody />;
  if (key === "zero-field") return <ZeroFieldIntroBody />;
  return null;
}

function IntroSubcaseDetails({ subcase }: { subcase: IntroSubcase }) {
  return (
    <details className="intro-sub-expansion">
      <IntroSubExpansionSummary
        label={subcase.label}
        eigenMath={subcase.eigenMath}
        diagonalizable={"diagonalizable" in subcase ? subcase.diagonalizable : undefined}
      />
      {renderIntroSubcaseBody(subcase.key)}
    </details>
  );
}

function EquilibriumLineIntroBody({ stable }: { stable: boolean }) {
  const matrix = stable ? introStableEquilibriumLineMatrix : introUnstableEquilibriumLineMatrix;
  const label = stable ? "ישר שיווי־משקל יציב" : "ישר שיווי־משקל לא יציב";
  const towardTime = stable ? String.raw`t\to\infty` : String.raw`t\to-\infty`;
  const awayTime = stable ? String.raw`t\to-\infty` : String.raw`t\to\infty`;
  const muCondition = stable ? String.raw`\mu<0` : String.raw`\mu>0`;

  return (
    <div className="intro-sub-expansion-body">
      <p>
        במקרה זה יש ערך עצמי אפס, ולכן מתקבל ישר של נקודות שיווי־משקל בכיוון <MathText math="V_1" />. בכיוון
        השני יש ערך עצמי <MathText math="\mu\neq0" /> עם <MathText math={muCondition} /> ועם וקטור עצמי{" "}
        <MathText math="V_2" />. הפתרון הכללי הוא
      </p>
      <p className="intro-equation">
        <MathText block math="X(t)=c_1V_1+c_2V_2e^{\mu t}" />
      </p>
      <p>
        כאשר <MathText math="c_2=0" /> מקבלים נקודות שיווי־משקל על הישר. כאשר <MathText math="c_2\neq0" /> מקבלים
        מסלולים שכאשר <MathText math={towardTime} /> {stable ? "מתקרבים לישר שיווי־המשקל" : "מתרחקים ממנו"}, וכאשר{" "}
        <MathText math={awayTime} /> {stable ? "בורחים ממנו" : "שואפים אליו"}, כמודגם באיור שלהלן.
      </p>
      <IntroPhasePortrait
        matrix={matrix}
        ariaLabel={`תמונת פאזה של ${label}`}
        caption={`תמונת פאזה אופיינית של ${label}`}
      />
    </div>
  );
}

function NilpotentIntroBody() {
  return (
    <div className="intro-sub-expansion-body">
      <p>
        במקרה זה <MathText math="\lambda_1=\lambda_2=0" />, אך <MathText math="A\neq0" />. יש וקטור עצמי{" "}
        <MathText math="V_1" /> ווקטור חבר <MathText math="V_2" /> שמקיים <MathText math="AV_2=V_1" />. הפתרון
        הכללי הוא
      </p>
      <p className="intro-equation">
        <MathText block math="X(t)=c_1V_1+c_2(tV_1+V_2)" />
      </p>
      <p>
        כאשר <MathText math="c_2=0" /> מקבלים נקודות שיווי־משקל על הישר בכיוון <MathText math="V_1" />. כאשר{" "}
        <MathText math="c_2\neq0" /> הפתרונות נעים לאורך ישרים המקבילים ל-<MathText math="V_1" />, ולכן מתקבלת
        תמונת החלקה אחידה בכיוון זה, כמודגם באיור שלהלן.
      </p>
      <IntroPhasePortrait
        matrix={introNilpotentMatrix}
        ariaLabel="תמונת פאזה של מקרה נילפוטנטי"
        caption="תמונת פאזה אופיינית של מקרה נילפוטנטי"
      />
    </div>
  );
}

function ZeroFieldIntroBody() {
  return (
    <div className="intro-sub-expansion-body">
      <p>
        במקרה זה <MathText math="A=0" />, ולכן המשוואה היא פשוט <MathText math="X'(t)=0" />.
      </p>
      <p>
        כל נקודה במישור היא נקודת שיווי־משקל. לכן אין תנועה בין נקודות, ותמונת הפאזה מורכבת כולה מנקודות קבועות,
        כמודגם באיור שלהלן.
      </p>
      <IntroPhasePortrait
        matrix={introZeroFieldMatrix}
        ariaLabel="תמונת פאזה של שדה אפס"
        caption="תמונת פאזה אופיינית של שדה אפס"
      />
    </div>
  );
}

function VietaPhasePortraitIntroBody() {
  return (
    <>
      <p>
        בחלק הקודם סיווגנו את תמונות הפאזה לפי הערכים העצמיים של המטריצה. לעיתים נוח יותר לסווג את התמונה ישירות
        לפי העקבה והדטרמיננטה, בלי לחשב במפורש את <MathText math="\lambda_1,\lambda_2" />. הגישה מבוססת על נוסחאות
        ויאטה לפולינום האופייני של מטריצה מסדר <MathText math="2\times2" />.
      </p>
      <p>עבור מטריצה</p>
      <p className="intro-equation">
        <MathText block math={String.raw`A=\begin{pmatrix}a&b\\c&d\end{pmatrix}`} />
      </p>
      <p>הפולינום האופייני הוא</p>
      <p className="intro-equation">
        <MathText block math={String.raw`p_A(\lambda)=\lambda^2-(a+d)\lambda+(ad-bc)=0`} />
      </p>
      <p>נגדיר</p>
      <p className="intro-equation">
        <MathText block math={String.raw`\tau=\operatorname{tr}(A)=a+d,\qquad \delta=\det(A)=ad-bc`} />
      </p>
      <div className="intro-claim">
        <p>
          <strong>נוסחאות ויאטה.</strong> אם <MathText math="\lambda_1,\lambda_2" /> הם שורשי הפולינום האופייני, אזי
        </p>
        <p className="intro-equation">
          <MathText block math={String.raw`\lambda_1+\lambda_2=\tau,\qquad \lambda_1\lambda_2=\delta`} />
        </p>
      </div>
      <p>
        כדי להבין האם הערכים העצמיים ממשיים, מרוכבים או חוזרים, נשתמש גם בדיסקרימיננטה של הפולינום האופייני:
      </p>
      <p className="intro-equation">
        <MathText block math={String.raw`D=\tau^2-4\delta`} />
      </p>
      <p>
        כאשר <MathText math="D>0" /> הערכים העצמיים ממשיים ושונים, כאשר <MathText math="D=0" /> הם ממשיים וחוזרים,
        וכאשר <MathText math="D<0" /> הם מרוכבים צמודים.
      </p>

      <h3 className="intro-sub-expansion-section-title">עץ סיווג לפי ויאטה</h3>
      <ol className="intro-numbered-list">
        <li>
          אם <MathText math="\delta=0" />, אזי <MathText math="\lambda_1\lambda_2=0" /> ולפחות ערך עצמי אחד הוא אפס.
          במקרה <MathText math="A=0" /> מתקבל שדה אפס. אם <MathText math="A\neq0" /> וגם <MathText math="\tau=0" />{" "}
          מתקבל המקרה הנילפוטנטי. אחרת, הסימן של <MathText math="\tau" /> קובע האם מדובר בישר שיווי־משקל יציב או לא
          יציב.
        </li>
        <li>
          אם <MathText math="\delta<0" />, אזי לערכים העצמיים סימנים מנוגדים, ולכן מתקבלת תמונת אוכף.
        </li>
        <li>
          אם <MathText math="\delta>0" /> ו-<MathText math="D<0" />, אזי הערכים העצמיים מרוכבים. אם גם{" "}
          <MathText math="\tau=0" /> מתקבל מרכז; אם <MathText math="\tau<0" /> ספירלה יציבה; ואם <MathText math="\tau>0" />{" "}
          ספירלה לא יציבה.
        </li>
        <li>
          אם <MathText math="\delta>0" /> ו-<MathText math="D>0" />, אזי שני הערכים העצמיים ממשיים ושונים. הסימן של{" "}
          <MathText math="\tau" /> קובע האם מדובר בצומת יציב או בצומת לא יציב.
        </li>
        <li>
          אם <MathText math="D=0" />, אזי <MathText math="\lambda_1=\lambda_2" />. כאן <MathText math="\tau" /> ו-
          <MathText math="\delta" /> לבדם אינם מספיקים: יש לבדוק האם <MathText math="A=\lambda I" /> (כוכב) או שהמטריצה
          אינה לכסינה (צומת מנוון).
        </li>
      </ol>
      <p>
        כך ניתן לעבור בין חישוב ערכים עצמיים לבין סיווג ישיר לפי <MathText math="\tau,\delta,D" />. שתי הגישות מובילות
        לאותן תמונות הפאזה שפורטו בחלק הקודם.
      </p>
    </>
  );
}

function IntroSubExpansionSummary({
  label,
  eigenMath,
  diagonalizable,
}: {
  label: string;
  eigenMath: string;
  diagonalizable?: string;
}) {
  return (
    <summary>
      <span className="intro-sub-expansion-label">
        <span>{label}</span>
        <MathText math={eigenMath} />
        {diagonalizable ? <span className="intro-sub-expansion-note">{diagonalizable}</span> : null}
      </span>
    </summary>
  );
}

function PhasePlaneIntro() {
  return (
    <div className="module-intro-page" aria-label="מבוא למישור הפאזה">
      <article className="module-intro-card video-placeholder module-intro-video">
        <div className="section-heading">מקום לסרטון</div>
        <div className="embedded-placeholder">
          <span>Embedded video</span>
          <strong>יתווסף בהמשך</strong>
        </div>
      </article>

      <article className="module-intro-card module-intro-content" aria-label="מודול לימודי">
        <p className="course-kicker">מודול לימודי</p>
        <h2>מישור הפאזה של מערכת ליניארית</h2>
        <p>
          בעמוד זה נעסוק במערכות אוטונומיות מהצורה
        </p>
        <p className="intro-equation">
          <MathText block math={String.raw`\begin{pmatrix}x'(t)\\y'(t)\end{pmatrix}=\begin{pmatrix}f(x,y)\\g(x,y)\end{pmatrix}`} />
        </p>
        <p>
          ובמיוחד, במקרה הפרטי מהצורה <MathText math="X'=AX" /> כאשר <MathText math="A" /> היא מטריצה ממשית מסדר{" "}
          <MathText math="2\times2" />. נחקור את הקשר בין מערכות אוטונומיות כלליות למערכות במקדמים קבועים, ולאחר מכן
          נחקור את כל תמונות הפאזה האפשריות במקרה הפרטי. בלשוניות המצורפות מוצעים כלים על מנת להטמיע ולתרגל את נושא
          תמונת הפאזה של המערכת <MathText math="X'=AX" />.
        </p>

        <div className="intro-expansion-list">
          <details className="intro-expansion">
            <summary>משוואות אוטונומיות</summary>
            <div className="intro-expansion-body">
              <p>
                <strong>הגדרה.</strong> מערכת דיפרנציאלית אוטונומית מסדר ראשון היא מערכת מהצורה{" "}
                <MathText math="X'(t)=F(X(t))" />. כלומר, מערכת שאינה תלויה בצורה מפורשת בזמן.
              </p>
              <p>במקרה הדו־ממדי מקבלים את המערכת</p>
              <p className="intro-equation">
                <MathText
                  block
                  math={String.raw`\begin{pmatrix}x'(t)\\y'(t)\end{pmatrix}=\begin{pmatrix}f(x(t),y(t))\\g(x(t),y(t))\end{pmatrix}`}
                />
              </p>
              <p>לדוגמה, המערכת</p>
              <p className="intro-equation">
                <MathText
                  block
                  math={String.raw`\begin{pmatrix}x'(t)\\y'(t)\end{pmatrix}=\begin{pmatrix}x(t)+e^{y(t)}\\y(t)x(t)\end{pmatrix}`}
                />
              </p>
              <p>
                היא מערכת אוטונומית, בעוד שהמערכת
              </p>
              <p className="intro-equation">
                <MathText
                  block
                  math={String.raw`\begin{pmatrix}x'(t)\\y'(t)\end{pmatrix}=\begin{pmatrix}tx(t)+e^{y(t)}\\y(t)x(t)\end{pmatrix}`}
                />
              </p>
              <p>אינה מערכת אוטונומית.</p>
              <p>
                בחלק זה נדון רק במקרה של מערכות דו־ממדיות, אך הרבה מן התוצאות והמשפטים ניתנים להרחבה לממדים גבוהים
                יותר באופן טבעי.
              </p>
              <div className="intro-claim">
                <p>
                  <strong>משפט.</strong> <strong>(משפט הקיום והיחידות למערכות אוטונומיות)</strong> נניח כי{" "}
                  <MathText math="f,g,\frac{\partial f}{\partial x},\frac{\partial f}{\partial y},\frac{\partial g}{\partial x},\frac{\partial g}{\partial y}" />{" "}
                  רציפות בתחום דו־ממדי <MathText math="D\subset\mathbb{R}^2" />, ותהא <MathText math="(x_0,y_0)\in D" />{" "}
                  נקודה פנימית. אזי, לכל <MathText math="t_0\in\mathbb{R}" />, קיים פתרון יחיד לבעיה
                </p>
                <p className="intro-equation">
                  <MathText
                    block
                    math={String.raw`\begin{cases}\begin{pmatrix}x'(t)\\y'(t)\end{pmatrix}=\begin{pmatrix}f(x(t),y(t))\\g(x(t),y(t))\end{pmatrix}\\\begin{pmatrix}x(t_0)\\y(t_0)\end{pmatrix}=\begin{pmatrix}x_0\\y_0\end{pmatrix}\end{cases}`}
                  />
                </p>
                <p>
                  המוגדר בקטע מהצורה <MathText math="[t_0-h,t_0+h]" /> עבור <MathText math="h>0" /> כלשהו.
                </p>
              </div>
              <p>
                למערכות אוטונומיות יש סימטריה יחודית להזזה בזמן, כפי שהטענה הבאה מראה.
              </p>
              <div className="intro-claim">
                <p>
                  <strong>טענה.</strong> <strong>(סימטריה להזזה בזמן)</strong> תהא
                </p>
                <p className="intro-equation">
                  <MathText
                    block
                    math={String.raw`\begin{pmatrix}x'(t)\\y'(t)\end{pmatrix}=\begin{pmatrix}f(x(t),y(t))\\g(x(t),y(t))\end{pmatrix}`}
                  />
                </p>
                <p>מערכת אוטונומית. אזי:</p>
                <ol className="intro-numbered-list">
                  <li>
                    אם <MathText math="(x(t),y(t))" /> פתרון של המשוואה בקטע <MathText math="[a,b]" />, גם{" "}
                    <MathText math="(x(t-t_0),y(t-t_0))" /> פתרון של המשוואה בקטע <MathText math="[a+t_0,b+t_0]" />.
                  </li>
                  <li>
                    נניח כי המערכת מקיימת את תנאי משפט הקיום והיחידות, וכי <MathText math="(x(t),y(t))" />,{" "}
                    <MathText math="(x_2(t),y_2(t))" /> פתרונות המקיימים
                    <MathText math="(x(t_1),y(t_1))=(x_2(t_2),y_2(t_2))" />. אזי, בהכרח מתקיים{" "}
                    <MathText math="(x_2(t),y_2(t))=(x(t-t_2+t_1),y(t-t_2+t_1))" />.
                  </li>
                </ol>
              </div>
              <p>
                הטענה למעשה אומרת שלכל פתרון ניתן להזיז את זמן ההתחלה מבלי לשנות את צורת הפתרון, ושאם שני פתרונות
                נחתכים (אפילו בזמנים שונים), הם חייבים להיות הזזה בזמן אחד של השני, ובמילים אחרות, לתאר את אותו
                הפתרון בזמן שונה. היתרון הגדול בתכונות אלה הוא שניתן &quot;לוותר&quot; על ציר הזמן, וכדי לחקור באופן
                איכותי פתרונות של מערכות אוטונומיות מספיק לחקור אותן במישור <MathText math="x-y" /> בלבד.
              </p>
              <p>
                <strong>דוגמה.</strong> נתבונן במערכת המשוואה האוטונומית
              </p>
              <p className="intro-equation">
                <MathText
                  block
                  math={String.raw`\begin{pmatrix}x'(t)\\y'(t)\end{pmatrix}=\begin{pmatrix}-y(t)\\x(t)\end{pmatrix}`}
                />
              </p>
              <p>
                ניתן לוודא כי הפונקציה <MathText math="(x(t),y(t))=(\cos(t),\sin(t))" /> היא פתרון של המשוואה, שמתאר
                את מעגל היחידה. על פי הטענה, גם הפונקציה <MathText math="(\cos(t-t_0),\sin(t-t_0))" /> היא פתרון של
                המשוואה, אך הציור שמתאר אותה במישור <MathText math="x-y" /> גם הוא ציור של אותו מעגל היחידה. כלומר,
                שני הפתרונות מתארים את אותו סוג תנועה, ומכאן שאין חשיבות ברמת חקירת צורת הפתרון - לציר הזמן.
              </p>
            </div>
          </details>

          <details className="intro-expansion">
            <summary>נקודה קריטית של משוואה אוטונומית</summary>
            <div className="intro-expansion-body">
              <p>
                <strong>הגדרה.</strong> בהנתן מערכת אוטונומית
              </p>
              <p className="intro-equation">
                <MathText
                  block
                  math={String.raw`\begin{pmatrix}x'(t)\\y'(t)\end{pmatrix}=\begin{pmatrix}f(x(t),y(t))\\g(x(t),y(t))\end{pmatrix}`}
                />
              </p>
              <p>
                נקודה <MathText math="(x_0,y_0)\in\mathbb{R}^2" /> מכונה נקודה קריטית של המערכת אם{" "}
                <MathText math="f(x_0,y_0)=g(x_0,y_0)=0" />.
              </p>
              <p>
                <strong>דוגמה.</strong> הראשית <MathText math="(x_0,y_0)=(0,0)" /> היא הנקודה הקריטית היחידה של
                המערכת האוטונומית
              </p>
              <p className="intro-equation">
                <MathText
                  block
                  math={String.raw`\begin{pmatrix}x'(t)\\y'(t)\end{pmatrix}=\begin{pmatrix}e^{x(t)}-1\\y(t)\end{pmatrix}`}
                />
              </p>
              <p>
                <strong>הגדרה.</strong> <strong>(ליניאריזציה סביב נקודה קריטית)</strong> תהא{" "}
                <MathText math="(x_0,y_0)" /> נקודה קריטית של המערכת האוטונומית
              </p>
              <p className="intro-equation">
                <MathText
                  block
                  math={String.raw`\begin{pmatrix}x'(t)\\y'(t)\end{pmatrix}=\begin{pmatrix}f(x(t),y(t))\\g(x(t),y(t))\end{pmatrix}`}
                />
              </p>
              <p>ליניאריזציה סביב הנקודה <MathText math="(x_0,y_0)" /> היא המשוואה המקורבת</p>
              <p className="intro-equation">
                <MathText
                  block
                  math={String.raw`\begin{pmatrix}u'(t)\\v'(t)\end{pmatrix}=\begin{pmatrix}\frac{\partial f}{\partial x}(x_0,y_0)u(t)+\frac{\partial f}{\partial y}(x_0,y_0)v(t)\\\frac{\partial g}{\partial x}(x_0,y_0)u(t)+\frac{\partial g}{\partial y}(x_0,y_0)v(t)\end{pmatrix}`}
                />
              </p>
              <p>
                כאשר <MathText math="u(t)=x(t)-x_0" /> ו-<MathText math="v(t)=y(t)-y_0" />.
              </p>
              <p>
                ליניאריזציה למערכת אוטונומית מתקבלת למעשה על ידי שימוש בקירוב מסדר ראשון בפולינום טיילור של הפונקציה{" "}
                <MathText math="f(x,y)" />, <MathText math="g(x,y)" /> סביב הנקודה הקריטית. היות ומדובר בנקודה קריטית,
                הליניאריזציה תוביל אותנו תמיד למערכת מד״ר במקדמים קבועים, כאשר מטריצת המקדמים היא מטריצת הנגזרות
                החלקיות של <MathText math="f,g" /> בנקודה הקריטית.
              </p>
              <p>
                הקירוב של מערכת לא ליניארית בעזרת מערכת ליניארית חשוב לא רק משום שהוא ממיר את המשוואה לקירוב שקל יותר
                לפתור. כמסקנה ממשפט הרטמן-גרובמן, ניתן להסיק דברים בנוגע ליציבות/יציבות אסימפטוטית של המשוואה המקורית
                על פי ההתנהגות של המשוואה המקורבת. כלומר, ניתן לחקור מערכות אוטונומיות מסובכות בעזרת הקירוב הליניארי
                שלהן, שהוא קל להבנה.
              </p>
              <p>
                <strong>דוגמה.</strong> נמצא את הליניאריזציה סביב הראשית למערכת שהצגנו קודם לכן. נגדיר
              </p>
              <p className="intro-equation">
                <MathText block math="f(x,y)=e^x-1,\quad g(x,y)=y" />
              </p>
              <p>כלומר</p>
              <p className="intro-equation">
                <MathText
                  block
                  math={String.raw`\begin{pmatrix}\frac{\partial f}{\partial x}(0,0)&\frac{\partial f}{\partial y}(0,0)\\\frac{\partial g}{\partial x}(0,0)&\frac{\partial g}{\partial y}(0,0)\end{pmatrix}=\begin{pmatrix}1&0\\0&1\end{pmatrix}`}
                />
              </p>
              <p>ולכן, הליניאריזציה תהיה</p>
              <p className="intro-equation">
                <MathText
                  block
                  math={String.raw`\begin{pmatrix}u'(t)\\v'(t)\end{pmatrix}=\begin{pmatrix}1&0\\0&1\end{pmatrix}\begin{pmatrix}u(t)\\v(t)\end{pmatrix}=\begin{pmatrix}u(t)\\v(t)\end{pmatrix}`}
                />
              </p>
            </div>
          </details>

          <details className="intro-expansion">
            <summary>משוואות במקדמים קבועים</summary>
            <div className="intro-expansion-body">
              <p>
                בין אם בעזרת ליניאריזציה סביב נקודה קריטית ובין אם לא, מערכות מד״ר במקדמים קבועים הן מערכות נפוצות
                מאוד ואת הפתרונות שלהן אנחנו יודעים לכתוב. בחלק זה נציג ונדון בסוגי הפתרונות שיכולים להתקבל ובתמונות
                הפאזה המתאימות.
              </p>

              <div className="intro-sub-expansion-list">
                {nonzeroEigenSubcases.map((subcase) => (
                  <IntroSubcaseDetails key={subcase.key} subcase={subcase} />
                ))}
              </div>

              <h3 className="intro-sub-expansion-section-title">מקרים עם ערך עצמי אפס</h3>
              <p>
                כאשר <MathText math="\det(A)=0" /> לפחות אחד מן הערכים העצמיים הוא אפס, ומופיעים ישרים של נקודות
                שיווי־משקל או מקרים מנוונים נוספים.
              </p>

              <div className="intro-sub-expansion-list">
                {zeroEigenSubcases.map((subcase) => (
                  <IntroSubcaseDetails key={subcase.key} subcase={subcase} />
                ))}
              </div>
            </div>
          </details>

          <details className="intro-expansion">
            <summary>תמונת פאזה על פי נוסחאות ויאטה</summary>
            <div className="intro-expansion-body">
              <VietaPhasePortraitIntroBody />
            </div>
          </details>
        </div>
      </article>
    </div>
  );
}

export default function PhasePlaneModule() {
  const [matrix, setMatrix] = useState<Matrix>(presetGroups[0].presets[0].matrix);
  const [matrixInputVersion, setMatrixInputVersion] = useState(0);
  const [mode, setMode] = useState<ScaleMode>("normalized");
  const [density, setDensity] = useState(2);
  const [worldRadius, setWorldRadius] = useState(3.2);
  const [saddleSamples, setSaddleSamples] = useState<SaddleSample[]>(defaultSaddleSamples);
  const [starSamples, setStarSamples] = useState<SaddleSample[]>(defaultStarSamples);
  const [centerSamples, setCenterSamples] = useState<CenterSample[]>(defaultCenterSamples);
  const [isSampleEditorOpen, setIsSampleEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActivityTab>("phase-intro");
  const summary = useMemo(() => {
    const tr = trace(matrix);
    const det = determinant(matrix);
    return {
      classification: classify(matrix),
      trace: tr,
      determinant: det,
      discriminant: discriminant(matrix),
      eigenvalues: eigenSummary(matrix),
    };
  }, [matrix]);

  const choosePreset = (preset: Preset) => {
    setMatrix(preset.matrix);
    setMatrixInputVersion((version) => version + 1);
  };
  const openMatrixInLab = (nextMatrix: Matrix) => {
    setMatrix(nextMatrix);
    setMatrixInputVersion((version) => version + 1);
    setActiveTab("phase-lab");
  };
  const usesPointSamples = centerData(matrix) !== null || spiralData(matrix) !== null;
  const starForExplanation = starData(matrix);
  const isStarPortrait = starForExplanation !== null;
  const saddleForExplanation = saddleData(matrix);
  const nodeForExplanation = nodeData(matrix);
  const defectiveNodeForExplanation = defectiveNodeData(matrix);
  const centerForExplanation = centerData(matrix);
  const spiralForExplanation = spiralData(matrix);
  const zeroEigenForExplanation = zeroEigenData(matrix);

  return (
    <main className="app-shell" dir="rtl">
      <header className="topbar">
        <div>
          <p className="course-kicker">104136 · משוואות דיפרנציאליות רגילות</p>
          <h1>מישור הפאזה</h1>
        </div>
        <nav aria-label="ניווט באתר">
          <Link className="module-pill" href="/">
            עמוד הבית
          </Link>
          <button
            className={`module-pill ${activeTab === "phase-intro" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("phase-intro")}
          >
            מבוא
          </button>
          <button
            className={`module-pill ${activeTab === "phase-lab" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("phase-lab")}
          >
            מישור פאזה
          </button>
          <button
            className={`module-pill ${activeTab === "matrix-assembler" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("matrix-assembler")}
          >
            הרכבת המטריצה
          </button>
          <button
            className={`module-pill ${activeTab === "self-practice" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("self-practice")}
          >
            תרגול
          </button>
        </nav>
      </header>

      {activeTab === "phase-intro" ? (
        <PhasePlaneIntro />
      ) : activeTab === "phase-lab" ? (
      <section className="lab-grid">
        <aside className="control-panel">
          <section className="panel-section">
            <div className="section-heading">
              <span>מטריצה</span>
              <MathText math="X'=AX" />
            </div>
            <MatrixInput key={matrixInputVersion} matrix={matrix} onChange={setMatrix} />
          </section>

          <section className="panel-section">
            <div className="section-heading">דוגמאות</div>
            <div className="preset-groups">
              {presetGroups.map((group) => (
                <section className="preset-group" key={group.title}>
                  <h3>{group.title}</h3>
                  <div className="preset-grid">
                    {group.presets.map((preset) => (
                      <button key={preset.name} type="button" onClick={() => choosePreset(preset)}>
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>

          <section className="panel-section">
            <div className="section-heading">ציור מסלולים</div>
            <div className="segmented-control">
              <button
                className={mode === "normalized" ? "selected" : ""}
                type="button"
                onClick={() => setMode("normalized")}
              >
                מנורמל
              </button>
              <button
                className={mode === "physical" ? "selected" : ""}
                type="button"
                onClick={() => setMode("physical")}
              >
                זמן אמיתי
              </button>
            </div>
            <label className="range-row">
              <span>צפיפות</span>
              <input
                type="range"
                min="1"
                max="4"
                step="1"
                value={density}
                onChange={(event) => setDensity(Number(event.target.value))}
              />
            </label>
            <label className="range-row">
              <span>זום</span>
              <input
                type="range"
                min="1.4"
                max="5"
                step="0.1"
                value={worldRadius}
                onChange={(event) => setWorldRadius(Number(event.target.value))}
              />
            </label>
            <button type="button" className="panel-action" onClick={() => setIsSampleEditorOpen(true)}>
              מדגם הפתרונות
            </button>
          </section>
        </aside>

        <section className="canvas-panel">
          <div className="canvas-header">
            <div>
              <span className="canvas-label">תמונת פאזה</span>
              <strong>{summary.classification}</strong>
            </div>
            <div className="legend">
              <span className="legend-item eigen">ישרים עצמיים</span>
              {eigenVectorReferences(matrix).length > 0 && (
                <span className="legend-item eigen-vector">וקטורים עצמיים</span>
              )}
              <span className="legend-item curve">פתרונות</span>
              <span className="legend-item field">שדה כיוונים</span>
            </div>
          </div>
          <div className="canvas-wrap">
            <PhaseCanvas
              matrix={matrix}
              mode={mode}
              density={density}
              worldRadius={worldRadius}
              saddleSamples={saddleSamples}
              starSamples={starSamples}
              centerSamples={centerSamples}
            />
          </div>
        </section>

        <aside className="analysis-panel">
          <section className="result-card primary">
            <span>סיווג</span>
            <strong>{summary.classification}</strong>
          </section>
          <section className="result-card">
            <span>ערכים עצמיים</span>
            <div className="eigen-list">
              {summary.eigenvalues.map((lambda, index) => (
                <MathText key={`${lambda}-${index}`} math={`\\lambda_${index + 1}=${lambda}`} />
              ))}
            </div>
          </section>
          <div className="metrics-grid">
            <section className="metric">
              <span className="metric-label">עקבה</span>
              <strong><MathText math={String.raw`\operatorname{tr}(A)`} /></strong>
              <em><MathText math={formatNumber(summary.trace)} /></em>
            </section>
            <section className="metric">
              <span className="metric-label">דטרמיננטה</span>
              <strong><MathText math={String.raw`\det(A)`} /></strong>
              <em><MathText math={formatNumber(summary.determinant)} /></em>
            </section>
            <section className="metric wide">
              <span className="metric-label">דיסקרימיננטה</span>
              <strong><MathText math={String.raw`D=\operatorname{tr}(A)^2-4\det(A)`} /></strong>
              <em><MathText math={formatNumber(summary.discriminant)} /></em>
            </section>
          </div>
          {saddleForExplanation && <SaddleMethodPanel saddle={saddleForExplanation} />}
          {!saddleForExplanation && nodeForExplanation && <NodeMethodPanel node={nodeForExplanation} />}
          {!saddleForExplanation && !nodeForExplanation && defectiveNodeForExplanation && (
            <DefectiveNodeMethodPanel node={defectiveNodeForExplanation} />
          )}
          {!saddleForExplanation && !nodeForExplanation && !defectiveNodeForExplanation && starForExplanation && (
            <StarMethodPanel star={starForExplanation} />
          )}
          {!saddleForExplanation && !nodeForExplanation && !defectiveNodeForExplanation && !starForExplanation && centerForExplanation && (
            <CenterMethodPanel matrix={matrix} center={centerForExplanation} />
          )}
          {!saddleForExplanation && !nodeForExplanation && !defectiveNodeForExplanation && !starForExplanation && !centerForExplanation && spiralForExplanation && (
            <SpiralMethodPanel matrix={matrix} spiral={spiralForExplanation} />
          )}
          {!saddleForExplanation && !nodeForExplanation && !defectiveNodeForExplanation && !starForExplanation && !centerForExplanation && !spiralForExplanation && zeroEigenForExplanation && (
            <ZeroEigenMethodPanel zeroEigen={zeroEigenForExplanation} />
          )}
        </aside>
      </section>
      ) : activeTab === "matrix-assembler" ? (
        <MatrixAssemblerActivity onOpenInLab={openMatrixInLab} />
      ) : (
        <SelfPracticeActivity />
      )}
      {activeTab === "phase-lab" && isSampleEditorOpen && (
        usesPointSamples ? (
          <CenterSampleEditor
            samples={centerSamples}
            onChange={setCenterSamples}
            onClose={() => setIsSampleEditorOpen(false)}
          />
        ) : (
          <SampleEditor
            samples={isStarPortrait ? starSamples : saddleSamples}
            resetSamples={isStarPortrait ? defaultStarSamples : defaultSaddleSamples}
            onChange={isStarPortrait ? setStarSamples : setSaddleSamples}
            onClose={() => setIsSampleEditorOpen(false)}
          />
        )
      )}
    </main>
  );
}
