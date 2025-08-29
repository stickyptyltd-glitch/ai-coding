# ADR 0001: Adopt License Activation & Anti‑Tamper

Date: 2025-08-29

## Status
Accepted

## Context
We need a lightweight, enforceable activation system and tamper detection to protect IP while keeping local development and CI flows simple. The solution must integrate with Node.js ESM, work in CLI and web server, and be automatable in GitHub.

## Decision
- Implement RSA/HMAC signed tokens validated at startup (`src/license.js`).
- Enforce via `LICENSE_REQUIRED=true`; verify with `LICENSE_PUBLIC_KEY_PATH` or `LICENSE_SECRET` and `LICENSE_KEY`.
- Add anti‑tamper manifest (`MANIFEST.json`) and checks (`src/anti-tamper.js`) toggled by `TAMPER_CHECK`/`TAMPER_STRICT`.
- Provide tooling: keygen, sign, rotate, manifest (`scripts/*`), and a weekly GitHub Actions rotation workflow.

## Consequences
- Startup fails on invalid/expired tokens or tamper (strict mode), improving IP protection.
- Minimal developer friction: dev keys and short‑lived tokens are easy to issue; CI rotates tokens automatically.
- Operational: requires secure storage of private key (repo secret) and process for revocation/rotation.
