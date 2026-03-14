// Augment the Express Request type to include the raw body buffer
// captured by the JSON middleware's `verify` option.
declare namespace Express {
  interface Request {
    rawBody?: Buffer;
  }
}
