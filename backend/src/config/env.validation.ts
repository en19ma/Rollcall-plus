import * as Joi from 'joi';

// Fail fast on boot if required configuration is missing or malformed, rather
// than starting up successfully and only breaking on the first request that
// needs the missing value (which is much harder to diagnose in production).
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(4000),

  DATABASE_URL: Joi.string().uri().required(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required().messages({
    'string.min': 'JWT_ACCESS_SECRET must be at least 16 characters — generate one with `openssl rand -hex 32`',
  }),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required().messages({
    'string.min': 'JWT_REFRESH_SECRET must be at least 16 characters — generate one with `openssl rand -hex 32`',
  }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  BCRYPT_SALT_ROUNDS: Joi.number().min(10).default(12),

  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  LOW_ATTENDANCE_THRESHOLD: Joi.number().default(75),
  ACCOUNT_LOCK_ATTEMPTS: Joi.number().default(5),
  ACCOUNT_LOCK_MINUTES: Joi.number().default(15),

  SWAGGER_USER: Joi.string().optional(),
  SWAGGER_PASSWORD: Joi.string().optional(),
})
  // In production, refuse to boot with the placeholder secrets from .env.example —
  // these exact strings have been shared publicly, so starting up with them
  // unchanged in a real deployment would be a live vulnerability, not a warning.
  .custom((value, helpers) => {
    const placeholders = ['change_this_access_secret', 'change_this_refresh_secret'];
    if (
      value.NODE_ENV === 'production' &&
      (placeholders.includes(value.JWT_ACCESS_SECRET) || placeholders.includes(value.JWT_REFRESH_SECRET))
    ) {
      return helpers.error('any.invalid');
    }
    return value;
  })
  .messages({
    'any.invalid':
      'Refusing to start in production with placeholder JWT secrets. Generate real ones with `openssl rand -hex 32` and set JWT_ACCESS_SECRET / JWT_REFRESH_SECRET.',
  });
