ADR 0003: AuthN/Z & Policy
==========================

Decision
--------
- AuthN: OIDC (OAuth2) with provider adapters
- AuthZ: Role-based (RBAC) + scoped API tokens
- Policy: OPA/Gate rules for restricting tools, external domains, cost budgets

Plan
----
- Add OIDC callback endpoints and session store
- Enforce RBAC on file ops and job actions
- Policy checks on chain execution

