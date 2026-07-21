import type { ConstantBasisTemplate } from "../practice/basisComposer";
import {
  parseNumericDraft,
  parsePositiveIntegerDraft,
} from "../utils/parsing";
import { MathParameterInput } from "./MathParameterInput";
import { MathText } from "./MathText";

type EulerBasisElementComposerProps = {
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
  label: string;
  ariaLabel: string;
}> = [
  { id: "real-exponential", label: "x^{r}", ariaLabel: "תבנית x בחזקת r" },
  { id: "real-power-exponential", label: "(\\ln x)^{k}x^{r}", ariaLabel: "תבנית ln x בחזקת k כפול x בחזקת r" },
  { id: "complex-cos", label: "x^{\\alpha}\\cos(\\beta\\ln x)", ariaLabel: "תבנית x בחזקת alpha כפול cos של beta ln x" },
  { id: "complex-sin", label: "x^{\\alpha}\\sin(\\beta\\ln x)", ariaLabel: "תבנית x בחזקת alpha כפול sin של beta ln x" },
  {
    id: "complex-power-cos",
    label: "(\\ln x)^{k}x^{\\alpha}\\cos(\\beta\\ln x)",
    ariaLabel: "תבנית ln x בחזקת k עם cos",
  },
  {
    id: "complex-power-sin",
    label: "(\\ln x)^{k}x^{\\alpha}\\sin(\\beta\\ln x)",
    ariaLabel: "תבנית ln x בחזקת k עם sin",
  },
];

type FieldInvalidStates = {
  real: boolean;
  imag: boolean;
  power: boolean;
};

function getFieldInvalidStates(
  draft: EulerBasisElementComposerProps["draft"],
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
  draft: EulerBasisElementComposerProps["draft"];
  invalid: FieldInvalidStates;
  disabled: boolean;
  onChangeField: EulerBasisElementComposerProps["onChangeField"];
};

function LnXFactor() {
  return (
    <span className="math-ln-factor">
      <span className="math-parenthesis">(</span>
      <span className="math-function">ln</span>
      <span className="math-variable">x</span>
      <span className="math-parenthesis">)</span>
    </span>
  );
}

function RealPowerExpression({ draft, invalid, disabled, onChangeField }: InlineExpressionProps) {
  return (
    <span className="basis-inline-expression">
      <span className="math-variable">x</span>
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
      </sup>
    </span>
  );
}

function RealLogPowerExpression({ draft, invalid, disabled, onChangeField }: InlineExpressionProps) {
  return (
    <span className="basis-inline-expression">
      <LnXFactor />
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
      <span className="math-variable math-factor-gap">x</span>
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
      </sup>
    </span>
  );
}

function EulerTrigExpression({
  draft,
  invalid,
  disabled,
  onChangeField,
  trig,
}: InlineExpressionProps & { trig: "cos" | "sin" }) {
  return (
    <span className="basis-inline-expression">
      <span className="math-variable">x</span>
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
      <span className="math-function">ln</span>
      <span className="math-variable">x</span>
      <span className="math-parenthesis">)</span>
    </span>
  );
}

function EulerLogTrigExpression({
  draft,
  invalid,
  disabled,
  onChangeField,
  trig,
}: InlineExpressionProps & { trig: "cos" | "sin" }) {
  return (
    <span className="basis-inline-expression">
      <LnXFactor />
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
      <span className="math-variable math-factor-gap">x</span>
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
      <span className="math-function">ln</span>
      <span className="math-variable">x</span>
      <span className="math-parenthesis">)</span>
    </span>
  );
}

function renderInlineExpression(
  props: InlineExpressionProps & { template: ConstantBasisTemplate },
) {
  switch (props.template) {
    case "real-exponential":
      return <RealPowerExpression {...props} />;
    case "real-power-exponential":
      return <RealLogPowerExpression {...props} />;
    case "complex-cos":
      return <EulerTrigExpression {...props} trig="cos" />;
    case "complex-sin":
      return <EulerTrigExpression {...props} trig="sin" />;
    case "complex-power-cos":
      return <EulerLogTrigExpression {...props} trig="cos" />;
    case "complex-power-sin":
      return <EulerLogTrigExpression {...props} trig="sin" />;
    default:
      return null;
  }
}

export function EulerBasisElementComposer({
  mode,
  draft,
  validationMessage,
  disabled = false,
  onSelectTemplate,
  onChangeField,
  onConfirm,
  onCancel,
}: EulerBasisElementComposerProps) {
  const invalid = getFieldInvalidStates(draft, validationMessage);
  const expressionProps: InlineExpressionProps = {
    draft,
    invalid,
    disabled,
    onChangeField,
  };

  return (
    <section className="basis-element-composer" aria-label="הוספת איבר בסיס אוילר">
      <div className="section-heading">בחרו תבנית</div>
      <div className="basis-template-grid" role="radiogroup" aria-label="תבניות בסיס אוילר">
        {TEMPLATE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`basis-template-option ${draft.template === option.id ? "selected" : ""}`}
            aria-pressed={draft.template === option.id}
            aria-label={option.ariaLabel}
            disabled={disabled}
            onClick={() => onSelectTemplate(option.id)}
          >
            <MathText size="compact" math={option.label} />
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
