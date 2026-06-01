export type DeploymentMode = "test" | "internal" | "external";
export type AuthProvider = "sso" | "email";

export interface AppConfig {
  deploymentMode: DeploymentMode;
  databaseUrl: string;
  authProvider: AuthProvider;
  ssoClientId?: string;
  ssoClientSecret?: string;
  ssoIssuerUrl?: string;
  emailFromAddress?: string;
  emailServiceApiKey?: string;
  adminEmails: string[];
  sessionDurationDays: number;
  maxPlayersPerGroup: number;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getEnvRequired(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getConfig(): AppConfig {
  const deploymentMode = getEnvOrDefault("DEPLOYMENT_MODE", "test") as DeploymentMode;
  const authProvider = getEnvOrDefault("AUTH_PROVIDER", "email") as AuthProvider;

  return {
    deploymentMode,
    databaseUrl: getEnvOrDefault("DATABASE_URL", "file:./data/predictor.db"),
    authProvider,
    ssoClientId: process.env.SSO_CLIENT_ID,
    ssoClientSecret: process.env.SSO_CLIENT_SECRET,
    ssoIssuerUrl: process.env.SSO_ISSUER_URL,
    emailFromAddress: process.env.EMAIL_FROM_ADDRESS,
    emailServiceApiKey: process.env.EMAIL_SERVICE_API_KEY,
    adminEmails: (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    sessionDurationDays: parseInt(getEnvOrDefault("SESSION_DURATION_DAYS", "7"), 10),
    maxPlayersPerGroup: parseInt(getEnvOrDefault("MAX_PLAYERS_PER_GROUP", "50"), 10),
  };
}
