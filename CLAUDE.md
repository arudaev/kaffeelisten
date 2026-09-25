# CLAUDE.md — Kaffeelisten

All project rules live in `AGENTS.md`, which is canonical for every agent. Read it before touching any file.

@AGENTS.md

## Claude Code notes

- The `.claude/` folder is local session state; do not commit it.
- `docs/emails/` holds private email-chain PDFs; never commit it.
- Use the built-in browser against the Vercel **preview** (staging data) or `npx vercel dev` to verify UI changes; never point local runs at production data.
