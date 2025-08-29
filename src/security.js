export async function applySecurity(app) {
  // Helmet (optional)
  try {
    const helmetMod = await import('helmet');
    const helmet = helmetMod.default || helmetMod;
    app.use(helmet({
      contentSecurityPolicy: false
    }));
  } catch {
    // helmet not installed; skip
  }

  // Basic rate limiting (optional)
  try {
    const rateLimitMod = await import('express-rate-limit');
    const rateLimit = rateLimitMod.default || rateLimitMod;
    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false
    });
    app.use(limiter);
  } catch {
    // express-rate-limit not installed; skip
  }

  // Compression (optional)
  try {
    const compressionMod = await import('compression');
    const compression = compressionMod.default || compressionMod;
    app.use(compression());
  } catch {
    // compression not installed; skip
  }
}
