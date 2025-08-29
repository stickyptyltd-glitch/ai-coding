# Licensing & Activation (Dev Setup)

## Generate Keys (RSA)
- `npm run security:keys` → writes `keys/private.pem` and `keys/public.pem`.
- Keep `private.pem` secret; commit only `public.pem` if needed.

## Issue a License Token
- RSA (recommended):
  - `npm run security:sign -- --key=keys/private.pem --sub=user@example.com --expDays=90`
- HMAC (fallback):
  - `npm run security:sign -- --secret=$YOUR_SECRET --sub=user@example.com --expDays=90`

The command prints a token like `header.payload.signature` (base64url).

## App Configuration
Set these in `.env`:
- `LICENSE_REQUIRED=true`
- For RSA: set `LICENSE_PUBLIC_KEY` to the PEM content of `public.pem`
- For HMAC: set `LICENSE_SECRET` to your shared secret
- `LICENSE_KEY=<the token printed above>`

## Anti‑Tamper Manifest
- Generate: `npm run security:manifest` → creates `MANIFEST.json`
- Enforce: set `TAMPER_CHECK=true` (and `TAMPER_STRICT=true` to fail on mismatch)

## Automated Rotation (GitHub Actions)
- Add repository secret `LICENSE_PRIVATE_KEY_PEM` containing your RSA private key (PEM).
- Workflow: `.github/workflows/rotate-license.yml` rotates and publishes `LICENSE_KEY`:
  - On schedule (weekly) and `workflow_dispatch`.
  - Updates an Environment secret named `LICENSE_KEY` for the specified environment (default `production`).
  - Also updates repository secret `LICENSE_KEY` as fallback.
- You can trigger manually with inputs (env, days, subject, audience, issuer).
