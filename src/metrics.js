export async function installMetrics(app) {
  try {
    const mod = await import('prom-client');
    const client = mod.default || mod;
    client.collectDefaultMetrics();
    app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', client.register.contentType);
        res.end(await client.register.metrics());
      } catch (e) {
        res.status(500).send(String(e.message || e));
      }
    });
    return true;
  } catch {
    return false;
  }
}

