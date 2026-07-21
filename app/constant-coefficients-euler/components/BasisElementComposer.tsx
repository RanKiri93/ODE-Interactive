import type { ConstantBasisTemplate } from "../practice/basisComposer";
import {
  parseNumericDraft,
  parsePositiveIntegerDraft,
} from "../utils/parsing";
import { MathParameterInput } from "./MathParameterInput";
import { MathText } from "./MathText";

type BasisElementComposerProps = {
  independentVariable: "x" | "t";
  mode: "add" | "edit";
  draft: {
    template: ConstantBasisTemplate | null;
    real: string;
    imag: string;
    power: string;
  };
  validationMessage: string | null;
  disabled?: boolean;
  onSelectTemplate: (template: ConstantBasisTemplate) => void;
  onChangeField: (field: "real" | "imag" | "power", value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

const TEMPLATE_OPTIONS: Array<{
  id: ConstantBasisTemplate;
  label: (variable: "x" | "t") => string;
}> = [
  { id: "real-exponential", label: (variable) => `e^{r${variable}}` },
  { id: "real-power-exponential", label: (variable) => `${variable}^ke^{r${variable}}` },
  { id: "complex-cos", label: (variable) => `e^{\\alpha ${variable}}\\cos(\\beta ${variable})` },
  { id: "complex-sin", label: (variable) => `e^{\\alpha ${variable}}\\sin(\\beta ${variable})` },
  {
    id: "complex-power-cos",
    label: (variable) => `${variable}^ke^{\\alpha ${variable}}\\cos(\\beta ${variable})`,
  },
  {
    id: "complex-power-sin",
    label: (variable) => `${variable}^ke^{\\alpha ${variable}}\\sin(\\beta ${variable})`,
  },
];

type FieldInvalidStates = {
  real: boolean;
  imag: boolean;
  power: boolean;
};

function needsPower(template: ConstantBasisTemplate | null): boolean {
  return (
    template === "real-power-exponential" ||
    template === "complex-power-cos" ||
    template === "complex-power-sin"
  );
}

function needsImag(template: ConstantBasisTemplate | null): boolean {
  return (
    template === "complex-cos" ||
    template === "complex-sin" ||
    template === "complex-power-cos" ||
    template === "complex-power-sin"
  );
}

function needsReal(template: ConstantBasisTemplate | null): boolean {
  return template !== null;
}

function getFieldInvalidStates(
  draft: BasisElementComposerProps["draft"],
  validationMessage: string | null,
): FieldInvalidStates {
  const empty = { real: false, imag: false, power: false };
  if (!validationMessage || !draft.template) {
    return empty;
  }

  const real = parseNumericDraft(draft.real);
  const imag = parseNumericDraft(draft.imag);
  const power = parsePositiveIntegerDraft(draft.power);

  switch (draft.template) {
    case "real-exponential":
      return { real: real === null, imag: false, power: false };
    case "real-power-exponential":
      return {
        real: real === null,
        imag: false,
        power: power === null,
      };
    case "complex-cos":
    case "complex-sin":
      return {
        real: real === null,
        imag: imag === null || imag <= 0,
        power: false,
      };
    case "complex-power-cos":
    case "complex-power-sin":
      return {
        real: real === null,
        imag: imag === null || imag <= 0,
        power: power === null,
      };
    default:
      return empty;
  }
}

type InlineExpressionProps = {
  variable: "x" | "t";
  draft: BasisElementComposerProps["draft"];
  invalid: FieldInvalidStates;
  disabled: boolean;
  onChangeField: BasisElementComposerProps["onChangeField"];
};

function RealExponentialExpression({
  variable,
  draft,
  invalid,
  disabled,
  onChangeField,
}: InlineExpressionProps) {
  return (
    <span className="basis-inline-expression">
      <span className="math-symbol">e</span>
      <sup className="math-superscript">
        <MathParameterInput
          parameter="r"
          value={draft.real}
          ariaLabel="המעריך r"
          invalid={invalid.real}
          disabled={disabled}
          inSuperscript
          onChange={(value) => onChangeField("real", value)}
        />
        <span className="math-variable">{variable}</span>
      </sup>
    </span>
  );
}

function RealPowerExponentialExpression({
  variable,
  draft,
  invalid,
  disabled,
  onChangeField,
}: InlineExpressionProps) {
  return (
    <span className="basis-inline-expression">
      <span className="math-variable">{variable}</span>
      <sup className="math-superscript">
        <MathParameterInput
          parameter="k"
          value={draft.power}
          ariaLabel="החזקה k"
          invalid={invalid.power}
          disabled={disabled}
          inSuperscript
          onChange={(value) => onChangeField("power", value)}
        />
      </sup>
      <span className="math-symbol math-factor-gap">e</span>
      <sup className="math-superscript">
        <MathParameterInput
          parameter="r"
          value={draft.real}
          ariaLabel="המעריך r"
          invalid={invalid.real}
          disabled={disabled}
          inSuperscript
          onChange={(value) => onChangeField("real", value)}
        />
        <span className="math-variable">{variable}</span>
      </sup>
    </span>
  );
}

function ComplexTrigExpression({
  variable,
  draft,
  invalid,
  disabled,
  onChangeField,
  trig,
}: InlineExpressionProps & { trig: "cos" | "sin" }) {
  return (
    <span className="basis-inline-expression">
      <span className="math-symbol">e</span>
      <sup className="math-superscript">
        <MathParameterInput
          parameter="alpha"
          value={draft.real}
          ariaLabel="החלק הממשי alpha"
          invalid={invalid.real}
          disabled={disabled}
          inSuperscript
          onChange={(value) => onChangeField("real", value)}
        />
        <span className="math-variable">{variable}</span>
      </sup>
      <span className="math-function math-factor-gap">{trig}</span>
      <span className="math-parenthesis">(</span>
      <MathParameterInput
        parameter="beta"
        value={draft.imag}
        ariaLabel="התדירות beta"
        invalid={invalid.imag}
        disabled={disabled}
        onChange={(value) => onChangeField("imag", value)}
      />
      <span className="math-variable">{variable}</span>
      <span className="math-parenthesis">)</span>
    </span>
  );
}

function ComplexPowerTrigExpression({
  variable,
  draft,
  invalid,
  disabled,
  onChangeField,
  trig,
}: InlineExpressionProps & { trig: "cos" | "sin" }) {
  return (
    <span className="basis-inline-expression">
      <span className="math-variable">{variable}</span>
      <sup className="math-superscript">
        <MathParameterInput
          parameter="k"
          value={draft.power}
          ariaLabel="החזקה k"
          invalid={invalid.power}
          disabled={disabled}
          inSuperscript
          onChange={(value) => onChangeField("power", value)}
        />
      </sup>
      <span className="math-symbol math-factor-gap">e</span>
      <sup className="math-superscript">
        <MathParameterInput
          parameter="alpha"
          value={draft.real}
          ariaLabel="החלק הממשי alpha"
          invalid={invalid.real}
          disabled={disabled}
          inSuperscript
          onChange={(value) => onChangeField("real", value)}
        />
        <span className="math-variable">{variable}</span>
      </sup>
      <span className="math-function math-factor-gap">{trig}</span>
      <span className="math-parenthesis">(</span>
      <MathParameterInput
        parameter="beta"
        value={draft.imag}
        ariaLabel="התדירות beta"
        invalid={invalid.imag}
        disabled={disabled}
        onChange={(value) => onChangeField("imag", value)}
      />
      <span className="math-variable">{variable}</span>
      <span className="math-parenthesis">)</span>
    </span>
  );
}

function renderInlineExpression(props: InlineExpressionProps & { template: ConstantBasisTemplate }) {
  switch (props.template) {
    case "real-exponential":
      return <RealExponentialExpression {...props} />;
    case "real-power-exponential":
      return <RealPowerExponentialExpression {...props} />;
    case "complex-cos":
      return <ComplexTrigExpression {...props} trig="cos" />;
    case "complex-sin":
      return <ComplexTrigExpression {...props} trig="sin" />;
    case "complex-power-cos":
      return <ComplexPowerTrigExpression {...props} trig="cos" />;
    case "complex-power-sin":
      return <ComplexPowerTrigExpression {...props} trig="sin" />;
    default:
      return null;
  }
}

export function BasisElementComposer({
  independentVariable,
  mode,
  draft,
  validationMessage,
  disabled = false,
  onSelectTemplate,
  onChangeField,
  onConfirm,
  onCancel,
}: BasisElementComposerProps) {
  const variable = independentVariable === "t" ? "t" : "x";
  const invalid = getFieldInvalidStates(draft, validationMessage);
  const expressionProps: InlineExpressionProps = {
    variable,
    draft,
    invalid,
    disabled,
    onChangeField,
  };

  return (
    <section className="basis-element-composer" aria-label="הוספת איבר בסיס">
      <div className="section-heading">בחרו תבנית</div>
      <div className="basis-template-grid" role="radiogroup" aria-label="תבניות בסיס">
        {TEMPLATE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`basis-template-option ${draft.template === option.id ? "selected" : ""}`}
            aria-pressed={draft.template === option.id}
            disabled={disabled}
            onClick={() => onSelectTemplate(option.id)}
          >
            <MathText size="compact" math={option.label(variable)} />
          </button>
        ))}
      </div>

      {draft.template ? (
        <div className="basis-inline-editor-scroll">
          {renderInlineExpression({ ...expressionProps, template: draft.template })}
        </div>
      ) : null}

      {validationMessage ? <p className="stage-feedback">{validationMessage}</p> : null}

      <div className="practice-actions">
        <button type="button" className="panel-action" disabled={disabled || !draft.template} onClick={onConfirm}>
          {mode === "edit" ? "שמור שינוי" : "הוסף לבסיס"}
        </button>
        <button type="button" className="panel-action secondary" disabled={disabled} onClick={onCancel}>
          ביטול
        </button>
      </div>
    </section>
  );
}

export function basisComposerFieldRequirements(template: ConstantBasisTemplate | null) {
  return {
    needsReal: needsReal(template),
    needsImag: needsImag(template),
    needsPower: needsPower(template),
  };
}
