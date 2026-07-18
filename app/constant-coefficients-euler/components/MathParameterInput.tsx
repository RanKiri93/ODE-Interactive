type MathParameterInputProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  invalid?: boolean;
  parameter: "k" | "r" | "alpha" | "beta";
  disabled?: boolean;
  inSuperscript?: boolean;
};

export function MathParameterInput({
  value,
  onChange,
  ariaLabel,
  invalid = false,
  parameter,
  disabled = false,
  inSuperscript = false,
}: MathParameterInputProps) {
  return (
    <input
      type="text"
      inputMode={parameter === "k" ? "numeric" : "decimal"}
      className={`math-parameter-input${inSuperscript ? " in-superscript" : ""}${invalid ? " is-invalid" : ""}`}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
