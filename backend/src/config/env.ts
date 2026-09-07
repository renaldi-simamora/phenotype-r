import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '8000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',

  JWT_SECRET: process.env.JWT_SECRET || '',

  /** Base URL of the external Python ML Service (server-to-server) */
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://localhost:5000',

  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
} as const;

/** Validate required env vars at startup */
export function validateEnv(): void {
  const required: (keyof typeof env)[] = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ML_SERVICE_URL',
  ];
  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
