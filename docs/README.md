# `docs/` — agent working output

Durable artifacts produced by the specialist agents. **This is the handoff surface between
Cursor and opencode:** a plan written here in one tool is picked up by the other, so
switching environments mid-task costs only the conversation, not the thinking.

| Directory | Written by | Contents |
| --- | --- | --- |
| `plans/` | `activity-planner` | Feasibility analyses and implementation plans |
| `question-families/` | `question-designer` | Specifications for families of randomized exercises |
| `reviews/` | `design-review` | Consistency audits and the work orders they produce |

Naming: kebab-case, one file per topic, and reviews prefixed with a date —
`plans/uniform-convergence-lab.md`, `question-families/power-series-radius.md`,
`reviews/2026-09-02-math-rendering.md`.

A review is the outstanding-work list until its orders are executed. Tick orders off in
place rather than deleting them, so the next audit can see what was already known.

These are working documents, not published material. Delete them once the work has landed
and `ARCHITECTURE.md` reflects it.
