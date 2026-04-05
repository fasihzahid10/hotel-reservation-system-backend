type Env = {
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  FRONTEND_URL: string;
  COOKIE_NAME: string;
  COOKIE_SECURE: boolean;
  /** Public base URL of this API (no trailing slash). Used for PayTabs return/callback URLs. */
  API_PUBLIC_URL: string;
  PAYTABS_SERVER_KEY: string;
  PAYTABS_PROFILE_ID: string;
  PAYTABS_API_BASE: string;
  PAYTABS_CURRENCY: string;
};

export function validateEnv(config: Record<string, unknown>): Env {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL', 'COOKIE_NAME'];

  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    PORT: Number(config.PORT ?? 4000),
    DATABASE_URL: String(config.DATABASE_URL),
    JWT_SECRET: String(config.JWT_SECRET),
    JWT_EXPIRES_IN: String(config.JWT_EXPIRES_IN ?? '12h'),
    FRONTEND_URL: String(config.FRONTEND_URL),
    COOKIE_NAME: String(config.COOKIE_NAME),
    COOKIE_SECURE: String(config.COOKIE_SECURE ?? 'false') === 'true',
    API_PUBLIC_URL: String(config.API_PUBLIC_URL ?? ''),
    PAYTABS_SERVER_KEY: String(config.PAYTABS_SERVER_KEY ?? ''),
    PAYTABS_PROFILE_ID: String(config.PAYTABS_PROFILE_ID ?? ''),
    PAYTABS_API_BASE: String(config.PAYTABS_API_BASE ?? 'https://secure.paytabs.sa'),
    PAYTABS_CURRENCY: String(config.PAYTABS_CURRENCY ?? 'SAR'),
  };
}
