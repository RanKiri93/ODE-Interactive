import { analyzeStability } from "../math/stability";
import type {
  SolutionRootGroup,
  StabilityAnswerInput,
  StabilityClassification,
  StabilityEvaluationResult,
  StabilityReason,
} from "../types";

export function defaultStabilityAnswer(): StabilityAnswerInput {
  return {
    classification: null,
    reason: null,
  };
}

export function stabilityAnswerFromAnalysis(analysis: {
  classification: StabilityClassification;
  reason: StabilityReason;
}): StabilityAnswerInput {
  return {
    classification: analysis.classification,
    reason: analysis.reason,
  };
}

export function evaluateStabilityAnswer(
  input: StabilityAnswerInput,
  roots: SolutionRootGroup[],
): StabilityEvaluationResult {
  const expected = analyzeStability(roots);
  const missingClassification = input.classification === null;
  const missingReason = input.reason === null;

  if (missingClassification && missingReason) {
    return {
      isCorrect: false,
      classificationCorrect: false,
      reasonCorrect: false,
      missingClassification: true,
      missingReason: true,
      expected,
      message: "יש לבחור סיווג ונימוק.",
    };
  }

  if (missingClassification) {
    return {
      isCorrect: false,
      classificationCorrect: false,
      reasonCorrect: input.reason === expected.reason,
      missingClassification: true,
      missingReason: false,
      expected,
      message: "יש לבחור את סוג היציבות.",
    };
  }

  if (missingReason) {
    return {
      isCorrect: false,
      classificationCorrect: input.classification === expected.classification,
      reasonCorrect: false,
      missingClassification: false,
      missingReason: true,
      expected,
      message: "יש לבחור את הנימוק המתאים.",
    };
  }

  const classificationCorrect = input.classification === expected.classification;
  const reasonCorrect = input.reason === expected.reason;

  if (classificationCorrect && reasonCorrect) {
    return {
      isCorrect: true,
      classificationCorrect: true,
      reasonCorrect: true,
      missingClassification: false,
      missingReason: false,
      expected,
      message: "הסיווג והנימוק נכונים.",
    };
  }

  if (classificationCorrect && !reasonCorrect) {
    return {
      isCorrect: false,
      classificationCorrect: true,
      reasonCorrect: false,
      missingClassification: false,
      missingReason: false,
      expected,
      message: "סיווג היציבות נכון, אך הנימוק אינו מתאים.",
    };
  }

  if (!classificationCorrect && reasonCorrect) {
    return {
      isCorrect: false,
      classificationCorrect: false,
      reasonCorrect: true,
      missingClassification: false,
      missingReason: false,
      expected,
      message: "הנימוק שנבחר מתאים לשורשים, אך סיווג היציבות אינו נכון.",
    };
  }

  return {
    isCorrect: false,
    classificationCorrect: false,
    reasonCorrect: false,
    missingClassification: false,
    missingReason: false,
    expected,
    message: "הסיווג והנימוק אינם מתאימים לשורשים.",
  };
}
