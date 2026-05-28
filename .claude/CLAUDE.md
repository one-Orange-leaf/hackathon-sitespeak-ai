# Global Claude Code Defaults — Tony / G.U.M.

## Third-party skill safety (non-negotiable)
- NEVER copy a skill into ~/.claude/skills/ or any project SKILLS/ folder without
  running `cc-audit check <path>` first.
- NEVER run install scripts (install.sh, setup.sh, etc.) from any cloned skill repo
  without reading the script contents manually first.
- Stage all cloned skill repos in ~/skill-staging/ — never clone directly into
  ~/.claude/ or any active project.
- After any `git pull` on a skill repo, re-audit before using updated skills.
  Treat updates from any repo, including trusted ones, as untrusted until cc-audit confirms clean.
- If cc-audit returns FAIL on any file: do not install. Stop and investigate.
- WARN results: read the reason. Ask Tony before proceeding.
- Only copy from anthropics/ subfolder in VoltAgent repo without additional review.
  All other community skills require cc-audit PASS first.

## Mechanical scanners
- Every project repo runs secret scanning in pre-commit hook and in CI.
  Tool choice may vary (Gitleaks, TruffleHog, GitGuardian); presence is non-negotiable.
- A repo without a secret-scan hook is incomplete. Add one before any other work proceeds.
- Every project repo runs language-appropriate static analysis in pre-commit hook and in CI.
  The category is imperative; the specific tool is a project-level decision.
- Sensible starting defaults: `gosec` for Go, `cargo audit` plus `clippy` for Rust,
  `eslint-plugin-security` for JavaScript/TypeScript. Add `Semgrep` (community edition)
  when the project uses multiple languages.
- Project-level CLAUDE.md names the actual tool chosen and the reason if it differs from default.
- Scanner output is treated like test output: a failing scanner blocks commit just as a failing test would.
- Bypassing a scanner requires explicit justification. Never the default.
- Scanner findings on AI-generated code receive the same scrutiny as findings on human-written code.
- Free, local tools are the default. Paid SaaS scanners are not adopted at current scale.

## Commit prefix vocabulary
- Projects that adopt commit prefix taxonomy use these meanings consistently:
  `policy:` for project-policy-document substantive changes, `meta:` for
  CLAUDE.md substantive changes, `security:` for security-hardening work,
  `docs:` for typos and trivial edits, `feature:` and `fix:` standard.
- The taxonomy is optional per-project. Projects adopting it inherit these
  meanings; projects skipping it use whatever convention they choose.
- The taxonomy has audit-trail teeth only in repos under formal edit
  discipline (e.g., G.U.M. policy §10). In other repos it is a convention.

## cc-audit false positive guidance
The ONLY legitimate false positive pattern identified so far:
- Unit test files inside a security scanner's own `tests/` directory
  (e.g. alirezarezvani/skill-tester/tests/) that contain intentionally
  bad code to verify the scanner catches it.
- How to confirm it is a false positive: the file path contains `tests/`,
  the repo is a security tool, AND the flagged code is inside a string
  literal being passed to a detection function — not executed directly.
- All three conditions must be true simultaneously. If any one is absent: treat as real.
- Everything else: treat FAIL as real until proven otherwise.
- When in doubt, skip the skill entirely. No skill is worth a compromised machine.

## Language policy
- Each project's active language stack is declared in that project's CLAUDE.md.
- Never assume a language carries over from another project or session.
- When a project uses multiple languages: define which language owns which layer
  before writing any code — documented in that project's CLAUDE.md.
- Each new language added to any project requires all three of the following:
  1. Language map updated in project CLAUDE.md
  2. Language-specific engineering skill installed and cc-audited first
  3. Language-specific security linter added to that project's rules
- Never mix languages within a layer without a documented architectural decision.

## Available skills
- `alirezarezvani/documentation`          — document generation, technical writing
- `alirezarezvani/c-level-advisor`        — strategic advisory, G.U.M. decisions
- `alirezarezvani/commands`               — custom slash commands in Claude Code
- `alirezarezvani/skill-security-auditor` — audit any SKILL.md before installing
- `alirezarezvani/skill-tester`           — quality scoring for skills
- `alirezarezvani/pr-review-expert`       — code review, PR analysis (Zone01 + chatbot)
- `voltagent/awesome-agent-skills`        — 1000+ official org skills
                                            (Anthropic, Stripe, Vercel, Figma, Cloudflare)
- Update this section whenever a new skill library is installed.

## Visual verification
- Claude in Chrome extension is intentionally NOT installed — prompt injection risk
  outweighs the benefit for current workflow.
- Terminal verification: paste command output directly into chat as proof of state.
- VS Code verification: manual screenshot via Cmd+Shift+4, pasted into chat.
- Browser UI verification: manual screenshot via Cmd+Shift+4.
- Development milestones: save screenshots to docs/screenshots/YYYY-MM-DD-[description].png
- Screenshots are evidence. If it doesn't show expected state, task is not complete.

## Working style
- Plan mode for any task with 3+ steps or architectural decisions.
  Write detailed specs upfront to reduce ambiguity. Use plan mode for verification too.
- If something goes sideways mid-execution: STOP and replan. Don't push through.
- Fix bugs autonomously when given a report. Point at logs, errors, failing tests — resolve them.
- Never mark a task complete without demonstrating it works.
  Run tests, check logs, diff behavior between main and your changes when relevant.
- For any project beyond a throwaway script, name the threat model in `tasks/todo.md` before code:
  trust boundaries (where untrusted input enters), data sensitivity (per §2 of G.U.M. policy
  even for non-G.U.M. projects), secret topology (where each secret lives, who reads it, rotation),
  blast radius if a credential leaks.
- Three to five bullets, not a separate document.
- Skipping the threat model commits to design choices that may not survive contact with it.

## Subagent strategy
- Use subagents liberally to keep the main context window clean.
- One task per subagent — focused execution only.
- Offload research, exploration, and parallel analysis to subagents.
- For complex problems, throw more compute at it via subagents.

## Task management
- Plan first: write plan to `tasks/todo.md` with checkable items.
- Check in before starting implementation.
- Mark items complete as you go. Add review section when done.
- High-level summary of changes at each step.

## Quality bar
- Ask "would a staff engineer approve this?" before presenting work.
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "knowing everything I know now, implement the elegant solution."
- Skip elegance check for simple obvious fixes — don't over-engineer.
- Find root causes. No temporary fixes. Every change touches minimum code necessary.
- Treat every diff written by Claude at the same review bar as a junior-engineer PR.
  AI-generated code is untrusted input until reviewed.
- When reviewing AI-generated code, specifically check for: removed validation,
  weakened auth checks, broadened access controls, disabled error handling,
  "temporary" workarounds that silence runtime errors instead of fixing root causes.
- Static analysis catches mechanical defects. Review catches semantic ones.
  Both are required for AI-generated code, not either-or.

## Self-improvement
- After any correction: update `tasks/lessons.md` with the pattern.
- Write a rule that prevents the same mistake from recurring.
- Review lessons.md at the start of each session for the active project.

## Cost awareness
- Default to the most token-efficient approach.
- Scoped file reads over broad directory scans.
- Flag any action that could unexpectedly increase API spend.