import { v4 as uuidv4 } from 'uuid';

export function installLogger(app) {
  app.use((req, res, next) => {
    const start = Date.now();
    req.id = req.headers['x-request-id'] || uuidv4();
    res.setHeader('x-request-id', req.id);
    const done = () => {
      res.removeListener('finish', done);
      res.removeListener('close', done);
      const log = {
        type: 'request',
        id: req.id,
        ts: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - start
      };
      console.log(JSON.stringify(log));
    };
    res.on('finish', done);
    res.on('close', done);
    next();
  });
}

