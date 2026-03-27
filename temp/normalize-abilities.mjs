#!/usr/bin/env node
/**
 * normalize-abilities.mjs
 *
 * Reads temp/abilities.all.json, normalizes all tags, and writes
 * temp/abilities.lookup.json.
 *
 * Run from the repo root:
 *   node temp/normalize-abilities.mjs
 *
 * Tag normalization rules applied (in order):
 *   1. Lowercase and trim every tag
 *   2. Apply the CONSOLIDATION_MAP — merge synonyms into a canonical name
 *   3. Deduplicate within each entry
 *   4. Sort alphabetically within each entry
 *
 * After the first run, inspect the printed tag-frequency report and add
 * entries to CONSOLIDATION_MAP as needed, then re-run.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const INPUT  = join(__dir, "abilities.all.json");
const OUTPUT = join(__dir, "abilities.lookup.json");

// ---------------------------------------------------------------------------
// Consolidation map  —  key: raw (already lowercased) tag to replace
//                        value: canonical tag to use instead
//
// Add entries here after reviewing the tag-frequency report printed below.
// ---------------------------------------------------------------------------
/** @type {Record<string, string>} */
const CONSOLIDATION_MAP = {
  // examples (fill in after reviewing the frequency report):
  // "magical": "magic",
  // "phys":    "physical",
};

// ---------------------------------------------------------------------------
// Load source file
// ---------------------------------------------------------------------------
let rawText;
try {
  rawText = readFileSync(INPUT, "utf8");
} catch {
  console.error(`ERROR: Could not read ${INPUT}`);
  console.error("       Please commit temp/abilities.all.json first.");
  process.exit(1);
}

/** @type {Array<Record<string, unknown>>} */
const source = JSON.parse(rawText);

if (!Array.isArray(source)) {
  console.error("ERROR: abilities.all.json must be a JSON array at the top level.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Normalize
// ---------------------------------------------------------------------------
/** @type {Map<string, number>} */
const tagFrequency = new Map();

const normalized = source.map((entry) => {
  const rawTags = Array.isArray(entry.tags) ? entry.tags : [];

  const tags = [...new Set(
    rawTags
      .map((t) => {
        const lower = String(t).toLowerCase().trim();
        return CONSOLIDATION_MAP[lower] ?? lower;
      })
      .filter(Boolean),
  )].sort();

  for (const tag of tags) {
    tagFrequency.set(tag, (tagFrequency.get(tag) ?? 0) + 1);
  }

  return { ...entry, tags };
});

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
writeFileSync(OUTPUT, JSON.stringify(normalized, null, 2) + "\n", "utf8");

console.log(`✓ Wrote ${normalized.length} abilities to ${OUTPUT}`);

// ---------------------------------------------------------------------------
// Print tag-frequency report
// ---------------------------------------------------------------------------
const sorted = [...tagFrequency.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

console.log(`\nTag frequency report (${sorted.length} unique tags):\n`);
const colWidth = String(sorted[0]?.[1] ?? 0).length;
for (const [tag, count] of sorted) {
  console.log(`  ${String(count).padStart(colWidth)}×  ${tag}`);
}
console.log(
  "\nReview the list above and add consolidation entries to CONSOLIDATION_MAP",
  "in this script, then re-run.",
);
