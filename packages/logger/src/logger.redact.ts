export const REDACT_PATHS = [
  // Authentication
  "password",
  "currentPassword",
  "newPassword",
  "passwordHash",

  "accessToken",
  "refreshToken",
  "idToken",
  "token",
  "secret",
  "clientSecret",
  "apiKey",

  // Authorization
  "authorization",
  "cookie",
  "set-cookie",

  // Nested request data
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["set-cookie"]',

  "req.body.password",
  "req.body.currentPassword",
  "req.body.newPassword",
  "req.body.accessToken",
  "req.body.refreshToken",

  // Common nested structures
  "headers.authorization",
  "headers.cookie",
  'headers["set-cookie"]',

  "body.password",
  "body.currentPassword",
  "body.newPassword",
  "body.accessToken",
  "body.refreshToken",

  "credentials.password",
  "credentials.accessToken",
  "credentials.refreshToken",

  // Arrays of objects
  "*.password",
  "*.accessToken",
  "*.refreshToken",

  'req.headers["x-api-key"]',
  'req.headers["x-access-token"]',

  "data.password",
  "data.accessToken",
  "data.refreshToken",

  "user.password",
  "user.passwordHash",
  "user.accessToken",
  "user.refreshToken",

  "payload.password",
  "payload.accessToken",
  "payload.refreshToken",
] as const;
