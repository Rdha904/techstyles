@AGENTS.md

## Delegation policy

Claude Code is the primary orchestrator, responsible for understanding requirements, analyzing problems, planning the work, and reviewing results. Delegate complex implementation tasks and application-code changes to Codex through `codex-delegate`. Codex implements the changes and writes or updates the relevant tests.

- Before delegating, define a clear scope, acceptance criteria, and verification steps.
- After Codex finishes, inspect the diff and independently run the relevant checks. Send corrections back to Codex when needed.
- Claude Code may manage planning documents and project instructions itself.
- Delegation within an authorized task does not require separate permission.
- Preserve all task-specific restrictions, including read-only and commit/push limits.
