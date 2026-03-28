import type { RollResult, Check } from "#dice";
import { t, type Locale } from "#i18n";

function evaluateCheck(total: number, check: Check): boolean {
  switch (check.operator) {
    case "<":
      return total < check.threshold;
    case "<=":
      return total <= check.threshold;
    case ">":
      return total > check.threshold;
    case ">=":
      return total >= check.threshold;
  }
}

export function formatRoll(
  result: RollResult,
  locale: Locale,
  check?: Check,
): string {
  const parts = result.rolls.map(String);
  if (result.modifier > 0) parts.push(`*${result.modifier}*`);
  else if (result.modifier < 0) parts.push(String(result.modifier));
  const breakdown = parts.join(" + ");
  if (!check) return breakdown;
  const pass = evaluateCheck(result.total, check);
  return `${pass ? t(locale, "roll.success") : t(locale, "roll.failure")} ${breakdown}`;
}

export function formatRollReply(
  expression: string,
  results: RollResult[],
  locale: Locale,
  check?: Check,
): string {
  const breakdowns = results.map((r) => formatRoll(r, locale, check));
  const totals = results.map((r) => r.total);
  return `${t(locale, "roll.rolling", { expr: expression })}\n-# ${breakdowns.join(";\n-# ")}\n${t(locale, "roll.result")} ${totals.join(", ")}`;
}
