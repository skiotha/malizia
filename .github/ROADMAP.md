# Malizia — Roadmap

> Summary. For the full detailed plan, see [`docs/roadmap.md`](../docs/roadmap.md).

| Phase | Goal                               | Status      |
| ----- | ---------------------------------- | ----------- |
| **0** | Documentation & Decisions          | ✱ Current   |
| **1** | Character Lookup (read-only)       | Not started |
| **2** | Identity & Write Operations        | Not started |
| **3** | DM Commands                        | Not started |
| **4** | RP Sessions                        | Not started |
| **5** | Polish & Hardening                 | Not started |

## Key Documents

- [Architecture](../docs/architecture.md) — system overview, layers, data flow
- [Data Contracts](../docs/data-contracts.md) — character data shapes, API usage
- [Design Decisions](../docs/decisions/) — ADR files (001–002)

## Dependencies

| Bot Phase | Requires from Website                | Website Phase |
| --------- | ------------------------------------ | ------------- |
| Phase 1   | Nothing (direct file reads)          | —             |
| Phase 2   | `discordId` in character schema      | Phase 2 / 6   |
