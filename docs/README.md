# Documentation Map

This directory holds the project harness and the `jdiff` product contract
derived from the input spec.

## Main Files

- `HARNESS.md`: how humans and agents collaborate.
- `FEATURE_INTAKE.md`: how prompts become tiny, normal, or high-risk work.
- `ARCHITECTURE.md`: architecture discovery and boundary rules.
- `TEST_MATRIX.md`: legacy proof map; current proof status is queried with
  `scripts/bin/harness-cli query matrix`.
- `HARNESS_BACKLOG.md`: legacy improvement list; current improvement records
  are stored with `scripts/bin/harness-cli backlog`.
- `GLOSSARY.md`: shared terms.

## Folders

- `product/`: current product truth — holds `jdiff-product-contract.md`.
- `stories/`: feature packets and backlog.
- `decisions/`: durable decisions and tradeoffs.
- `demo/`: concrete walkthroughs that show how the harness transforms input
  into agent-ready work.
- `templates/`: reusable spec-intake, story, plan, decision, and validation
  formats.

## Current State

`jdiff` is implemented: Rust `jdiff-core` + `jdiff-cli`, a Tauri v2 desktop
shell, and a JVM decompiler sidecar. These docs describe the product contract,
architecture, validation, and the agent harness that operate it. See
`../README.md` for the build and platform-validation commands and
`JDIFF_COMPLETION_AUDIT.md` for proof evidence.
