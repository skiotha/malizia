// ── Types ──────────────────────────────────────────────

export type Locale = "en" | "ru";

// ── String tables ──────────────────────────────────────

const strings: Record<Locale, Record<string, string>> = {
  en: {
    "roll.invalid":
      "Invalid dice expression: `{expr}`. Expected format: `NdS+M` (e.g. `2d6+3`, `d20`)",
    "roll.rolling": "-# **Rolling {expr}:**",
    "roll.result": "**Result:**",
    "roll.success": "Success!",
    "roll.failure": "Failure!",
    "lookup.notFound": 'No results found for "{query}".',
    "lookup.abilityNotFound": "No ability or spell found.",
    "lookup.share": "Share",
    "character.lookingUp": "Looking up character: {name}",
    "tier.novice": "Novice",
    "tier.adept": "Adept",
    "tier.master": "Master",
    "error.command": "Something went wrong running that command.",
    "error.component": "Something went wrong.",
  },
  ru: {
    "roll.invalid":
      "Неверное выражение: `{expr}`. Формат: `NdS+M` (напр. `2d6+3`, `d20`)",
    "roll.rolling": "-# **Бросок {expr}:**",
    "roll.result": "**Результат:**",
    "roll.success": "Успех!",
    "roll.failure": "Провал!",
    "lookup.notFound": "Результаты для «{query}» не найдены.",
    "lookup.abilityNotFound": "Ни способность, ни заклинание не были найдены.",
    "lookup.share": "Поделиться",
    "character.lookingUp": "Поиск персонажа: {name}",
    "tier.novice": "Новичок",
    "tier.adept": "Адепт",
    "tier.master": "Мастер",
    "error.command": "Что-то пошло не так при выполнении команды.",
    "error.component": "Что-то пошло не так.",
  },
};

// ── Locale resolution ──────────────────────────────────

export function resolveLocale(
  guildLocale?: string,
  userLocale?: string,
): Locale {
  for (const raw of [userLocale, guildLocale]) {
    if (raw?.startsWith("ru")) return "ru";
    if (raw?.startsWith("en")) return "en";
  }
  return "en";
}

// ── Translation helper ─────────────────────────────────

export function t(
  locale: Locale,
  key: string,
  params?: Record<string, string>,
): string {
  let text = strings[locale][key] ?? strings.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, v);
    }
  }
  return text;
}
