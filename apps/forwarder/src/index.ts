import express, { Request } from 'express';
import config from './config';
import { initDatabase } from './db/database';
import logger from './services/loggerService';
import configRouter from './routes/config';
import docsRouter from './routes/docs';
import messagesRouter from './routes/messages';
import webhookRouter from './routes/webhook';

// Initialize database on startup
initDatabase();

const app = express();

// Parse incoming JSON bodies and capture raw bytes for webhook signature verification
app.use(
  express.json({
    verify: (req: Request, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook routes (GET = verify, POST = receive messages)
app.use('/webhook', webhookRouter);

// Config routes (phone number update, etc.)
app.use('/config', configRouter);

// Message history routes
app.use('/messages', messagesRouter);

// API docs (Swagger UI)
app.use('/docs', docsRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start the server only when run directly (not imported in tests)
if (require.main === module) {
  initDatabase();
  app.listen(config.port, () => {
    logger.info(`🚀 WhatsApp Forwarder started on port ${config.port}`);
    logger.info(`📡 Webhook URL: http://localhost:${config.port}/webhook`);
    logger.info(`🔧 Config API: http://localhost:${config.port}/config/forward-number`);
    logger.info(`📊 Messages API: http://localhost:${config.port}/messages`);
    logger.info(`📖 API Docs: http://localhost:${config.port}/docs`);
    logger.info(`📊 Messages API: http://localhost:${config.port}/messages`);
    logger.info(
      config.keywordFilters.length > 0
        ? `🔍 Keyword filters active: [${config.keywordFilters.join(', ')}]`
        : '🔍 No keyword filters — forwarding ALL messages',
    );
  });
}

export default app;
