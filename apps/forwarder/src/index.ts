import express from 'express';
import config from './config';
import logger from './services/loggerService';
import configRouter from './routes/config';
import webhookRouter from './routes/webhook';

const app = express();

// Parse incoming JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook routes (GET = verify, POST = receive messages)
app.use('/webhook', webhookRouter);

// Config routes (phone number update, etc.)
app.use('/config', configRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start the server
app.listen(config.port, () => {
  logger.info(`🚀 WhatsApp Forwarder started on port ${config.port}`);
  logger.info(`📡 Webhook URL: http://localhost:${config.port}/webhook`);
  logger.info(`🔧 Config API: http://localhost:${config.port}/config/forward-number`);
  logger.info(
    config.keywordFilters.length > 0
      ? `🔍 Keyword filters active: [${config.keywordFilters.join(', ')}]`
      : '🔍 No keyword filters — forwarding ALL messages',
  );
});

export default app;
