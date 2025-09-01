export function installPolicy(app) {
  // simple in-memory policy; can be replaced with OPA
  const policy = {
    allowedTools: (process.env.POLICY_ALLOWED_TOOLS || 'analyze,modify,create,search,explain,log,wait').split(',').map(s => s.trim()),
    allowedDomains: (process.env.POLICY_ALLOWED_DOMAINS || '').split(',').map(s => s.trim()).filter(Boolean),
    maxDepth: parseInt(process.env.POLICY_MAX_CRAWL_DEPTH || '3', 10)
  };
  app.locals.policy = policy;
  app.get('/api/policy', (req, res) => res.json(policy));
  app.post('/api/policy', (req, res) => {
    Object.assign(policy, req.body || {});
    res.json(policy);
  });
}

export function enforceToolPolicy(tool) {
  return (req, res, next) => {
    const policy = req.app.locals.policy;
    if (policy && policy.allowedTools && !policy.allowedTools.includes(tool)) {
      return res.status(403).json({ error: `Tool '${tool}' is not allowed by policy` });
    }
    next();
  };
}

