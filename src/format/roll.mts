import type { RollResult, Check } from "#dice";

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

export function formatRoll(result: RollResult, check?: Check): string {
  const parts = result.rolls.map(String);
  if (result.modifier > 0) parts.push(`*${result.modifier}*`);
  else if (result.modifier < 0) parts.push(String(result.modifier));
  const breakdown = parts.join(" + ");
  if (!check) return breakdown;
  const pass = evaluateCheck(result.total, check);
  return `${pass ? "Success!" : "Failure!"} ${breakdown}`;
}

export function formatRollReply(
  expression: string,
  results: RollResult[],
  check?: Check,
): string {
  const breakdowns = results.map((r) => formatRoll(r, check));
  const totals = results.map((r) => r.total);
  return `-# **Rolling ${expression}:**\n-# ${breakdowns.join(";\n-# ")}\n**Result:** ${totals.join(", ")}`;
}
