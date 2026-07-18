import { EPS } from "../constants";

export function normalizeNumber(value: number): number {
  if (Math.abs(value) < EPS) {
    return 0;
  }
  return value;
}

export function numbersEqual(a: number, b: number): boolean {
  return Math.abs(normalizeNumber(a) - normalizeNumber(b)) < EPS;
}

export function formatNumber(value: number): string {
  const normalized = normalizeNumber(value);
  if (Math.abs(normalized - Math.round(normalized)) < EPS) {
    return String(Math.round(normalized));
  }
  return String(Math.round(normalized * 1000) / 1000);
}

export function formatSignedNumber(value: number, isFirst: boolean): string {
  const absolute = formatNumber(Math.abs(value));
  if (isFirst) {
    return value < 0 ? `-${absolute}` : absolute;
  }
  return value < 0 ? `-${absolute}` : `+${absolute}`;
}
