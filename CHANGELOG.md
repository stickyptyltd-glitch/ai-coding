# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-08-29

- Add GitHub Actions CI (Node 18 and 20) to run lint and tests.
- Enforce Node engines via `.npmrc` (`engine-strict=true`) and `package.json` (`>=18 <21`).
- Configure ESLint with recommended rules and test overrides; fix all lint errors.
- Resolve duplicate export/method issues in `src/agent.js`; clean unused vars/imports across codebase.
- Fix Cheerio clone usage in `src/web-scraper.js`; tighten switch-case scoping.
- Security: remove `node-speech-to-text` (unused) and add `overrides` for vulnerable transitive deps; `npm audit` now reports 0 vulnerabilities.
- Keep tests green (2/2) and lint clean.

## [1.0.0] - 2025-08-29

- Initial release.

