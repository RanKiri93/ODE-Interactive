/**
 * Verifies that shared math-size CSS tokens resolve consistently
 * for DisplayMath (.math-display) and practice formula rows (.math-formula-row).
 *
 * Run: node scripts/verify-math-size-tokens.mjs
 */

const STANDARD = "clamp(1.28rem, 1.55vw, 1.4rem)";
const HERO = "clamp(1.45rem, 2vw, 1.62rem)";
const COMPACT = "clamp(1rem, 1.1vw, 1.12rem)";

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

const viewports = [390, 768, 1200, 1540, 1920];

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
}

console.log("Expected at every viewport:");
console.log("  assembler polynomial === practice row === standard token");
console.log("  hero > standard");
console.log("  compact < standard");
