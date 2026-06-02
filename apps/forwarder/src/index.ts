import cors from 'cors';
import express, { Request } from 'express';
import path from 'path';
import config from './config';
import { getDatabase, initDatabase } from './db/database';
import { isEmailConfigured } from './services/emailService';
import logger from './services/loggerService';
import { requestIdMiddleware } from './middleware/requestId';
import appRouter from './routes/app';
import authRouter from './routes/auth';
import billingRouter from './routes/billing';
import configRouter from './routes/config';
import docsRouter from './routes/docs';
import messagesRouter from './routes/messages';
import webhookRouter from './routes/webhook';

const app = express();
const publicDir = path.resolve(__dirname, 'public');
const corsOrigin = process.env['CORS_ORIGIN'] ?? '*';

if (corsOrigin === '*') {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('CORS_ORIGIN must be set to a specific origin in production. Set CORS_ORIGIN in your environment.');
  }
  logger.warn('CORS_ORIGIN is not set - allowing all origins. Set CORS_ORIGIN in production.');
}

app.use(requestIdMiddleware);

app.use(
  cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: '100kb',
    verify: (req: Request, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.get('/health', (_req, res) => {
  try {
    getDatabase().prepare('SELECT 1').get();
    res.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable', timestamp: new Date().toISOString() });
  }
});

app.get('/health/smtp', (_req, res) => {
  res.json({ smtpConfigured: isEmailConfigured() });
});

app.use(express.static(publicDir));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use('/webhook', webhookRouter);
app.use('/auth', authRouter);
app.use('/app', appRouter);
app.use('/billing', billingRouter);
app.use('/config', configRouter);
app.use('/messages', messagesRouter);
app.use('/docs', docsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (require.main === module) {
  initDatabase();
  const server = app.listen(config.port, () => {
    logger.info(`WhatsApp Forwarder started on port ${config.port}`);
    logger.info(`Dashboard: http://localhost:${config.port}/`);
    logger.info(`Auth API: http://localhost:${config.port}/auth`);
    logger.info(`Workspace API: http://localhost:${config.port}/app/workspace`);
    logger.info(`Webhook URL: http://localhost:${config.port}/webhook`);
    logger.info(`Config API: http://localhost:${config.port}/config/settings`);
    logger.info(`Messages API: http://localhost:${config.port}/messages`);
    logger.info(`API Docs: http://localhost:${config.port}/docs`);
  });

  function gracefulShutdown(signal: string) {
    logger.info(`Received ${signal}. Closing HTTP server...`);
    server.close(() => {
      logger.info('HTTP server closed. Exiting.');
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn('Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;
