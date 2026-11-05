# CLAUDE.md — Kaffeelisten

All project rules live in `AGENTS.md`, which is canonical for every agent. Read it before touching any file.

@AGENTS.md

## Claude Code notes

- The `.claude/` folder is local session state; do not commit it.
- **Commercial, client and legal material lives in the private `kaffeelisten/playbook`
  repository, not here.** That includes the ITC1 relationship, pricing, compensation,
  the residence-permit position and the email archive. Do not re-add any of it to this
  repository — it is public.
- `docs/emails/` is gitignored. The email archive now lives in the playbook under
  `03-client/archive/`; the copies that were committed here have been removed.
- Use the built-in browser against the Vercel **preview** (staging data) or `npx vercel dev` to verify UI changes; never point local runs at production data.
