export {};

declare module 'express-serve-static-core' {
  interface Request {
    rawBody?: Buffer;
    auth?: {
      userId: string;
      sessionTokenHash: string;
    };
  }
}
