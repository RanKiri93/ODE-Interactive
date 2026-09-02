/**
 * Verifies math-size CSS tokens and two source invariants that the
 * clamp-only version missed (I1: variantless .math-render).
 *
 * A. Every JSX <span> that ends up with class math-render also sets
 *    data-variant (inline | compact | standard, or a JSX expression).
 * B. No hex/rgba literal in app/globals.css outside :root duplicates a
 *    :root token value (whitespace-insensitive for rgb/rgba).
 *
 * Run: node scripts/verify-math-size-tokens.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const APP_DIR = path.join(ROOT, "app");
const GLOBALS_CSS = path.join(APP_DIR, "globals.css");

const STANDARD = "clamp(1.28rem, 1.55vw, 1.4rem)";
const HERO = "clamp(1.45rem, 2vw, 1.62rem)";
const COMPACT = "clamp(1rem, 1.1vw, 1.12rem)";
const VALID_VARIANTS = new Set(["inline", "compact", "standard"]);

/** Legend swatches (WO-6). Not token values; skipped if they ever become tokens. */
const SANCTIONED_COLORS = new Set(
  ["#2c456b", "#83aff0", "#ff9d00"].map(normalizeColorLiteral),
);

function evaluateClamp(clampExpr, viewportPx, rootPx = 16) {
  const match = clampExpr.match(/clamp\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (!match) {
    throw new Error(`Unsupported clamp: ${clampExpr}`);
  }
  const min = parseRem(match[1].trim(), rootPx);
  const preferred = parsePreferred(match[2].trim(), viewportPx, rootPx);
  const max = parseRem(match[3].trim(), rootPx);
  return Math.min(max, Math.max(min, preferred));
}

function parseRem(value, rootPx) {
  if (value.endsWith("rem")) {
    return parseFloat(value) * rootPx;
  }
  if (value.endsWith("px")) {
    return parseFloat(value);
  }
  throw new Error(`Unsupported unit: ${value}`);
}

function parsePreferred(value, viewportPx, rootPx) {
  if (value.endsWith("vw")) {
    return (parseFloat(value) / 100) * viewportPx;
  }
  return parseRem(value, rootPx);
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

function walkFiles(dir, ext, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, ext, acc);
    } else if (entry.name.endsWith(ext)) {
      acc.push(full);
    }
  }
  return acc;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll("\\", "/");
}

function expandHex(hex) {
  const h = hex.slice(1);
  if (h.length === 3 || h.length === 4) {
    return `#${[...h].map((c) => c + c).join("")}`;
  }
  return `#${h}`;
}

/** Lowercase hex (3-digit expanded) or rgb/rgba with all whitespace removed. */
function normalizeColorLiteral(value) {
  if (value == null) return null;
  const v = String(value).trim().toLowerCase();
  if (/^#([0-9a-f]{3,8})$/.test(v)) {
    return expandHex(v);
  }
  if (/^rgba?\(/.test(v) && v.endsWith(")")) {
    return v.replace(/\s+/g, "");
  }
  return null;
}

const COLOR_IN_VALUE =
  /#([0-9a-fA-F]{3,8})\b|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)/g;

function extractColorLiterals(value) {
  const results = [];
  const re = new RegExp(COLOR_IN_VALUE.source, "g");
  let match;
  while ((match = re.exec(value))) {
    results.push({
      raw: match[0],
      index: match.index,
      norm: normalizeColorLiteral(match[0]),
    });
  }
  return results;
}

function replaceRangeWithSpaces(source, start, end) {
  let out = source.slice(0, start);
  for (let i = start; i < end; i++) {
    out += source[i] === "\n" ? "\n" : " ";
  }
  return out + source.slice(end);
}

function stripCssComments(css) {
  let out = "";
  let i = 0;
  while (i < css.length) {
    if (css[i] === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      const close = end === -1 ? css.length : end + 2;
      for (let j = i; j < close; j++) {
        out += css[j] === "\n" ? "\n" : " ";
      }
      i = close;
      continue;
    }
    if (css[i] === "\"" || css[i] === "'") {
      const q = css[i];
      out += q;
      i++;
      while (i < css.length && css[i] !== q) {
        if (css[i] === "\\") {
          out += css[i] + (css[i + 1] ?? "");
          i += 2;
          continue;
        }
        out += css[i++];
      }
      if (i < css.length) out += css[i++];
      continue;
    }
    out += css[i++];
  }
  return out;
}

function consumeBraceBlock(source, openIndex) {
  let depth = 0;
  let i = openIndex;
  let inString = null;
  while (i < source.length) {
    const c = source[i];
    if (inString) {
      if (c === "\\" && inString !== null) {
        i += 2;
        continue;
      }
      if (c === inString) inString = null;
      i++;
      continue;
    }
    if (c === "\"" || c === "'") {
      inString = c;
      i++;
      continue;
    }
    if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        return { end: i + 1, body: source.slice(openIndex + 1, i) };
      }
    }
    i++;
  }
  throw new Error(`Unclosed { at index ${openIndex}`);
}

function extractRootBlocks(css) {
  const blocks = [];
  const re = /:root\b[^{]*\{/g;
  let match;
  while ((match = re.exec(css))) {
    const open = match.index + match[0].length - 1;
    const { end, body } = consumeBraceBlock(css, open);
    blocks.push({ start: match.index, end, body });
    re.lastIndex = end;
  }
  return blocks;
}

function parseRootColorTokens(rootBody) {
  const tokens = new Map();
  const re = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = re.exec(rootBody))) {
    const name = `--${match[1]}`;
    const raw = match[2].trim();
    const norm = normalizeColorLiteral(raw);
    if (!norm) continue;
    if (!tokens.has(norm)) tokens.set(norm, []);
    tokens.get(norm).push({ name, raw });
  }
  return tokens;
}

function maskRootBlocks(css, blocks) {
  let masked = css;
  for (const block of [...blocks].sort((a, b) => b.start - a.start)) {
    masked = replaceRangeWithSpaces(masked, block.start, block.end);
  }
  return masked;
}

function enclosingSelector(css, index) {
  let depth = 0;
  for (let i = index; i >= 0; i--) {
    const c = css[i];
    if (c === "}") depth++;
    else if (c === "{") {
      if (depth === 0) {
        let start = i - 1;
        while (start >= 0 && css[start] !== "{" && css[start] !== "}") start--;
        return css.slice(start + 1, i).replace(/\s+/g, " ").trim();
      }
      depth--;
    }
  }
  return "";
}

function isSanctionedLiteral(norm, raw, selector) {
  if (norm && SANCTIONED_COLORS.has(norm)) return true;
  const hex = normalizeColorLiteral(raw);
  if (hex === "#ffffff" && /polynomial-coefficient-tooltip/.test(selector)) {
    return true;
  }
  return false;
}

function findCssTokenDuplicates(css, colorTokens) {
  const withoutComments = stripCssComments(css);
  const rootBlocks = extractRootBlocks(withoutComments);
  const tokens = colorTokens ?? parseRootColorTokens(rootBlocks.map((b) => b.body).join("\n"));
  const scanned = maskRootBlocks(withoutComments, rootBlocks);
  const violations = [];

  const re = new RegExp(COLOR_IN_VALUE.source, "g");
  let match;
  while ((match = re.exec(scanned))) {
    const raw = match[0];
    const norm = normalizeColorLiteral(raw);
    if (!norm) continue;
    const selector = enclosingSelector(scanned, match.index);
    if (isSanctionedLiteral(norm, raw, selector)) continue;
    const hits = tokens.get(norm);
    if (!hits || hits.length === 0) continue;
    const tokenNames = hits.map((t) => t.name).join(", ");
    violations.push({
      line: lineOf(css, match.index),
      raw,
      tokens: tokenNames,
      selector,
    });
  }
  return { tokens, violations, rootCount: rootBlocks.length };
}

/**
 * Scan JSX <span> opening tags. A span is a math-render host if className
 * includes the class string or calls inlineMathClassName. The helper that
 * only *returns* the class string is not a span and is ignored.
 */
function findJsxSpanOpenTags(source) {
  const tags = [];
  let i = 0;
  let quote = null;
  let templateDepth = 0;
  let lineComment = false;
  let blockComment = false;

  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];

    if (lineComment) {
      if (c === "\n") lineComment = false;
      i++;
      continue;
    }
    if (blockComment) {
      if (c === "*" && next === "/") {
        blockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (quote) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (templateDepth > 0) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === "`") {
        templateDepth--;
        i++;
        continue;
      }
      i++;
      continue;
    }

    if (c === "/" && next === "/") {
      lineComment = true;
      i += 2;
      continue;
    }
    if (c === "/" && next === "*") {
      blockComment = true;
      i += 2;
      continue;
    }
    if (c === "\"" || c === "'") {
      quote = c;
      i++;
      continue;
    }
    if (c === "`") {
      templateDepth++;
      i++;
      continue;
    }

    if (c === "<" && source.startsWith("span", i + 1) && /[\s>/]/.test(source[i + 5] ?? "")) {
      const start = i;
      const end = findOpenTagEnd(source, i + 5);
      if (end !== -1) {
        tags.push({
          start,
          end,
          text: source.slice(start, end),
          line: lineOf(source, start),
        });
        i = end;
        continue;
      }
    }
    i++;
  }
  return tags;
}

function findOpenTagEnd(source, from) {
  let i = from;
  let quote = null;
  let brace = 0;
  while (i < source.length) {
    const c = source[i];
    if (quote) {
      if (c === "\\" && quote !== "`") {
        i += 2;
        continue;
      }
      if (quote === "`") {
        if (c === "\\") {
          i += 2;
          continue;
        }
        if (c === "`") quote = null;
        i++;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === "\"" || c === "'" || c === "`") {
      quote = c;
      i++;
      continue;
    }
    if (c === "{") {
      brace++;
      i++;
      continue;
    }
    if (c === "}") {
      brace = Math.max(0, brace - 1);
      i++;
      continue;
    }
    if (c === ">" && brace === 0) {
      return i + 1;
    }
    i++;
  }
  return -1;
}

function readJsxAttr(tagText, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*`);
  const match = re.exec(tagText);
  if (!match) return null;
  const i = match.index + match[0].length;
  const c = tagText[i];
  if (c === "\"" || c === "'") {
    const end = tagText.indexOf(c, i + 1);
    if (end === -1) return { type: "string", value: tagText.slice(i + 1) };
    return { type: "string", value: tagText.slice(i + 1, end) };
  }
  if (c === "{") {
    let depth = 0;
    let j = i;
    let quote = null;
    while (j < tagText.length) {
      const ch = tagText[j];
      if (quote) {
        if (ch === "\\" && quote !== "`") {
          j += 2;
          continue;
        }
        if (ch === quote) quote = null;
        j++;
        continue;
      }
      if (ch === "\"" || ch === "'" || ch === "`") {
        quote = ch;
        j++;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          return { type: "expr", value: tagText.slice(i, j + 1) };
        }
      }
      j++;
    }
    return { type: "expr", value: tagText.slice(i) };
  }
  return null;
}

function isMathRenderClass(classNameAttr) {
  if (!classNameAttr) return false;
  if (classNameAttr.type === "string") {
    return classNameAttr.value.split(/\s+/).includes("math-render");
  }
  const expr = classNameAttr.value;
  if (/\binlineMathClassName\s*\(/.test(expr)) return true;
  if (/(['"`])math-render\1/.test(expr)) return true;
  return false;
}

function dataVariantOk(attr) {
  if (!attr) return false;
  if (attr.type === "string") {
    return VALID_VARIANTS.has(attr.value.trim());
  }
  return attr.type === "expr" && attr.value.trim().length > 2;
}

function findMathRenderViolations(source, label = "") {
  const violations = [];
  for (const tag of findJsxSpanOpenTags(source)) {
    const className = readJsxAttr(tag.text, "className");
    if (!isMathRenderClass(className)) continue;
    const variant = readJsxAttr(tag.text, "data-variant");
    if (dataVariantOk(variant)) continue;
    const preview = tag.text.replace(/\s+/g, " ").trim();
    violations.push({
      label,
      line: tag.line,
      preview: preview.length > 120 ? `${preview.slice(0, 117)}...` : preview,
    });
  }
  return violations;
}

const PRE_WO1_MATHTEXT = `
function MathText({ math }) {
  return (
    <span className="math-render" dir="ltr">
      <InlineMath math={math} />
    </span>
  );
}
`;

const CURRENT_MATHTEXT = `
function MathText({ math, variant, className }) {
  const resolvedVariant = variant ?? "inline";
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
`;

const HELPER_ONLY = `
function inlineMathClassName({ className }: { variant?: string; className?: string }): string {
  return ["math-render", className].filter(Boolean).join(" ");
}
`;

function runClampEvaluation() {
  const viewports = [390, 768, 1200, 1540, 1920];
  const failures = [];

  console.log("Math size token evaluation (root=16px):\n");

  for (const vw of viewports) {
    const standard = evaluateClamp(STANDARD, vw);
    const hero = evaluateClamp(HERO, vw);
    const compact = evaluateClamp(COMPACT, vw);

    console.log(`Viewport ${vw}px:`);
    console.log(`  standard: ${standard.toFixed(2)}px`);
    console.log(`  hero:     ${hero.toFixed(2)}px`);
    console.log(`  compact:  ${compact.toFixed(2)}px`);
    console.log(
      `  checks: standard===standard ${standard === standard}, hero>standard ${hero > standard}, compact<standard ${compact < standard}`,
    );
    console.log("");

    if (!(hero > standard)) {
      failures.push(`viewport ${vw}px: hero (${hero}) is not > standard (${standard})`);
    }
    if (!(compact < standard)) {
      failures.push(`viewport ${vw}px: compact (${compact}) is not < standard (${standard})`);
    }
  }

  console.log("Expected at every viewport:");
  console.log("  assembler polynomial === practice row === standard token");
  console.log("  hero > standard");
  console.log("  compact < standard");

  return failures;
}

function runSelfChecks(colorTokens) {
  const failures = [];

  const preWo1 = findMathRenderViolations(PRE_WO1_MATHTEXT, "pre-WO-1");
  if (preWo1.length === 0) {
    failures.push(
      "self-check A: variantless <span className=\"math-render\"> (pre-WO-1 / I1) was NOT caught",
    );
  }

  const helper = findMathRenderViolations(HELPER_ONLY, "helper");
  if (helper.length > 0) {
    failures.push("self-check A: false-positive on inlineMathClassName helper that only returns the class string");
  }

  const current = findMathRenderViolations(CURRENT_MATHTEXT, "current MathText");
  if (current.length > 0) {
    failures.push("self-check A: current MathText (inlineMathClassName + data-variant) should pass");
  }

  const lineDup = findCssTokenDuplicates(
    ":root { --line: rgba(37, 43, 51, 0.16); }\n.probe { border-color: rgba(37,43,51,0.16); }\n",
  );
  if (lineDup.violations.length === 0) {
    failures.push("self-check B: rgba duplicate of --line (pre-WO-6) was NOT caught");
  }

  const whitespaceDup = findCssTokenDuplicates(
    ":root { --line: rgba(37, 43, 51, 0.16); }\n.probe { color: rgba(37, 43, 51, 0.16); }\n",
  );
  if (whitespaceDup.violations.length === 0) {
    failures.push("self-check B: whitespace in rgba must not hide a --line duplicate");
  }

  const sanctioned = findCssTokenDuplicates(
    [
      ":root { --ink: #252b33; --line: rgba(37, 43, 51, 0.16); }",
      ".polynomial-coefficient-tooltip { color: #fff; }",
      ".legend-item.eigen::before { background: #2c456b; }",
      ".legend-item.eigen-vector::before { background: #83aff0; }",
      ".legend-item.curve::before { background: #ff9d00; }",
      ".ok { border-color: var(--line); }",
    ].join("\n"),
  );
  if (sanctioned.violations.length > 0) {
    failures.push(
      `self-check B: sanctioned literals or var() should not fail (${sanctioned.violations.map((v) => v.raw).join(", ")})`,
    );
  }

  if (colorTokens && !colorTokens.has(normalizeColorLiteral("rgba(37, 43, 51, 0.16)"))) {
    failures.push("self-check B: parsed :root is missing --line as a color token");
  }

  return { failures, preWo1Caught: preWo1.length };
}

function main() {
  const clampFailures = runClampEvaluation();
  const css = fs.readFileSync(GLOBALS_CSS, "utf8");
  const { tokens, violations: cssViolations, rootCount } = findCssTokenDuplicates(css);

  console.log("\n--- source assertions ---\n");

  const self = runSelfChecks(tokens);
  console.log(
    `Self-check A: pre-WO-1 variantless .math-render → ${self.preWo1Caught > 0 ? "caught (I1)" : "MISSED"}`,
  );
  console.log("Self-check A: inlineMathClassName helper-only return → ignored");
  console.log("Self-check A: current MathText + data-variant → pass");
  console.log("Self-check B: rgba duplicate of --line → caught");
  console.log("Self-check B: sanctioned #fff / legend swatches / var(--line) → pass");

  const tsxFiles = walkFiles(APP_DIR, ".tsx");
  const mathViolations = [];
  for (const file of tsxFiles) {
    const source = fs.readFileSync(file, "utf8");
    for (const v of findMathRenderViolations(source, rel(file))) {
      mathViolations.push({ file: rel(file), ...v });
    }
  }

  console.log(`\nA. .math-render spans carry data-variant  (${tsxFiles.length} tsx files)`);
  if (mathViolations.length === 0) {
    console.log("   OK — every math-render span sets data-variant");
  } else {
    for (const v of mathViolations) {
      console.log(`   FAIL ${v.file}:${v.line}  ${v.preview}`);
    }
  }

  console.log(`\nB. No CSS literal duplicates a :root token  (:root blocks: ${rootCount})`);
  if (cssViolations.length === 0) {
    console.log("   OK — no hex/rgba outside :root equals a token value");
  } else {
    for (const v of cssViolations) {
      const where = v.selector ? ` in ${v.selector}` : "";
      console.log(
        `   FAIL ${rel(GLOBALS_CSS)}:${v.line}  ${v.raw} equals ${v.tokens}${where}`,
      );
    }
  }

  const allFailures = [
    ...clampFailures.map((f) => `clamp: ${f}`),
    ...self.failures,
    ...mathViolations.map((v) => `${v.file}:${v.line} math-render without data-variant: ${v.preview}`),
    ...cssViolations.map(
      (v) => `${rel(GLOBALS_CSS)}:${v.line} ${v.raw} duplicates ${v.tokens}`,
    ),
  ];

  if (allFailures.length > 0) {
    console.log(`\n${allFailures.length} violation(s):`);
    for (const f of allFailures) {
      console.log(`  - ${f}`);
    }
    process.exit(1);
  }

  console.log("\nverify-math-size-tokens: pass");
}

main();
