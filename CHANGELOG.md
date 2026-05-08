# Changelog

All notable changes to Kaffeelisten will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Initial repo scaffold with Vite + React + TypeScript + Tailwind
- Supabase schema: companies, members, items, transactions, transactions_archive
- Dev seed data for ITC1 campus
- Member-facing logging flow (select company → member → item → confirm)
- Admin panel with PIN protection
- Monthly report email via Resend
- PWA manifest and service worker (offline shell)
- CI workflow (lint + typecheck on PR)
- Monthly report cron workflow (last day of month, 23:00 CET)
- GitHub issue templates

---

<!-- Releases will be added below as tags are cut -->
