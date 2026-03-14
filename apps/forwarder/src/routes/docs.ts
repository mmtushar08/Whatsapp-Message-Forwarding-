import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';

const router = Router();

// Load the OpenAPI YAML spec
const specPath = path.resolve(__dirname, '../openapi.yaml');
const spec = yaml.load(fs.readFileSync(specPath, 'utf8')) as object;

/**
 * GET /docs
 * Serves the Swagger UI for interactive API testing.
 */
router.use('/', swaggerUi.serve);
router.get(
  '/',
  swaggerUi.setup(spec, {
    customSiteTitle: 'WhatsApp Forwarder API',
    customCss: '.swagger-ui .topbar { background-color: #25D366; }',
    swaggerOptions: {
      persistAuthorization: true,
    },
  }),
);

/**
 * GET /docs/spec
 * Returns the raw OpenAPI JSON spec (useful for Postman import).
 */
router.get('/spec', (_req, res) => {
  res.json(spec);
});

export default router;
