import { validateLicenseEnv } from './license.js';
import { verifyManifest } from './anti-tamper.js';

export async function installMetrics(app) {
  try {
    const mod = await import('prom-client');
    const client = mod.default || mod;
    client.collectDefaultMetrics();

    // Custom gauges for alerting
    const licenseValid = new client.Gauge({ name: 'agent_license_valid', help: '1 when license valid or not required, else 0' });
    const tamperOk = new client.Gauge({ name: 'agent_tamper_ok', help: '1 when tamper check disabled or manifest OK, else 0' });
    const healthStrictOk = new client.Gauge({ name: 'agent_health_strict_ok', help: '1 when strict health would pass (license+tamper), else 0' });

    const refreshGauges = () => {
      try {
        const required = String(process.env.LICENSE_REQUIRED || '').toLowerCase() === 'true';
        const lic = validateLicenseEnv();
        const tEnabled = String(process.env.TAMPER_CHECK || '').toLowerCase() === 'true';
        const t = tEnabled ? verifyManifest() : { ok: true };
        const lOk = !required || lic.valid === true;
        const tOk = !tEnabled || t.ok === true;
        licenseValid.set(lOk ? 1 : 0);
        tamperOk.set(tOk ? 1 : 0);
        healthStrictOk.set(lOk && tOk ? 1 : 0);
      } catch {
        // In case of unexpected errors, avoid throwing from the metrics loop
      }
    }

    // Initial fill + periodic refresh
    refreshGauges();
    const intervalMs = Number(process.env.METRICS_REFRESH_MS || 30000);
    setInterval(refreshGauges, Math.max(5000, intervalMs)).unref();

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
