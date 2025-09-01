export async function installAuth(app) {
  // API key already supported in web-server; OIDC optional
  try {
    const { default: jose } = await import('jose');
    const issuer = process.env.OIDC_ISSUER;
    const clientId = process.env.OIDC_CLIENT_ID;
    if (!issuer || !clientId) return false;
    const jwks = jose.createRemoteJWKSet(new URL(issuer.replace(/\/?$/, '/') + '.well-known/jwks.json'));
    app.use(async (req, res, next) => {
      try {
        const auth = req.headers.authorization || '';
        if (!auth.startsWith('Bearer ')) return next();
        const token = auth.slice(7);
        const { payload } = await jose.jwtVerify(token, jwks, {
          issuer,
          audience: clientId
        });
        req.user = payload;
        next();
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }
    });
    return true;
  } catch {
    return false;
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    // Accept if no auth configured
    if (!process.env.OIDC_ISSUER) return next();
    const role = req.user?.role || req.user?.roles?.[0];
    if (roles.length === 0 || roles.includes(role)) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}

