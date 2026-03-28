import cors from 'cors';
import express, { Request } from 'express';
import path from 'path';
import config from './config';
import { initDatabase } from './db/database';
import logger from './services/loggerService';
import appRouter from './routes/app';
import authRouter from './routes/auth';
import configRouter from './routes/config';
import docsRouter from './routes/docs';
import messagesRouter from './routes/messages';
import webhookRouter from './routes/webhook';

initDatabase();

const app = express();
const publicDir = path.resolve(__dirname, 'public');
const corsOrigin = process.env['CORS_ORIGIN'] ?? '*';

if (corsOrigin === '*') {
  logger.warn('CORS_ORIGIN is not set - allowing all origins. Set CORS_ORIGIN in production.');
}

app.use(
  cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PATCH'],
  }),
);

app.use(
  express.json({
    verify: (req: Request, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(publicDir));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use('/webhook', webhookRouter);
app.use('/auth', authRouter);
app.use('/app', appRouter);
app.use('/config', configRouter);
app.use('/messages', messagesRouter);
app.use('/docs', docsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (require.main === module) {
  initDatabase();
  app.listen(config.port, () => {
    logger.info(`WhatsApp Forwarder started on port ${config.port}`);
    logger.info(`Dashboard: http://localhost:${config.port}/`);
    logger.info(`Auth API: http://localhost:${config.port}/auth`);
    logger.info(`Workspace API: http://localhost:${config.port}/app/workspace`);
    logger.info(`Webhook URL: http://localhost:${config.port}/webhook`);
    logger.info(`Config API: http://localhost:${config.port}/config/settings`);
    logger.info(`Messages API: http://localhost:${config.port}/messages`);
    logger.info(`API Docs: http://localhost:${config.port}/docs`);
  });
}

export default app;
