# Vendored engines

Behavior-preserving copies. A `// @ts-nocheck` line was inserted so the app typechecker does not reinterpret these files. Runtime logic is unchanged.

- SIA main: 669d46ce797a291260d269dd4fd53cdf3d6409d6
- SIA suno importer overlay (`feature/suno-owner-export-intake-001`): d8ee6f0facf41980523e4bb95a1d28d8a1223836 — `src/importers/suno.mjs`, `src/cli.mjs`, sample export, import test. Observation schema remains SIA main (includes `album`).
- story-dna `feat/relationship-passenger-002`: beab7fd5ab6f63de2a7a9332998c22bedf6b73ea

This interface does not replace those repositories.
