import { z } from 'zod';

const configSchema = z.object({
  environment: z.enum(['development', 'production', 'test']).default('development'),
  databaseUrl: z.string(),
  redisUrl: z.string().default('redis://localhost:6379/0'),
  corsOrigins: z.string().default('http://localhost:3000'),
  apiV1Prefix: z.string().default('/api/v1'),
  projectName: z.string().default('SALLY Backend'),
  secretKey: z.string().default('sally-development-secret-key-minimum-32-chars'),

  // JWT Configuration
  jwt: z.object({
    accessSecret: z.string().default('sally-jwt-access-secret-change-in-production-min-32-chars'),
    refreshSecret: z.string().default('sally-jwt-refresh-secret-change-in-production-min-32-chars'),
    accessExpiry: z.string().default('15m'),
    refreshExpiry: z.string().default('7d'),
  }),

  // Auth Configuration
  auth: z.object({
    enableMockAuth: z.boolean().default(true),
    bcryptRounds: z.number().default(10),
  }),

  // HOS Constants
  maxDriveHours: z.number().default(11.0),
  maxDutyHours: z.number().default(14.0),
  requiredBreakMinutes: z.number().default(30),
  breakTriggerHours: z.number().default(8.0),
  minRestHours: z.number().default(10.0),
  sleeper_berth_split_long: z.number().default(8.0),
  sleeper_berth_split_short: z.number().default(2.0),
});

export type Configuration = z.infer<typeof configSchema>;

export default (): Configuration => {
  const raw = {
    environment: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL || 'postgresql://sally_user:sally_password@localhost:5432/sally',
    redisUrl: process.env.REDIS_URL,
    corsOrigins: process.env.CORS_ORIGINS,
    apiV1Prefix: process.env.API_V1_PREFIX,
    projectName: process.env.PROJECT_NAME,
    secretKey: process.env.SECRET_KEY,
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      accessExpiry: process.env.JWT_ACCESS_EXPIRY,
      refreshExpiry: process.env.JWT_REFRESH_EXPIRY,
    },
    auth: {
      enableMockAuth: process.env.ENABLE_MOCK_AUTH === 'true',
      bcryptRounds: process.env.BCRYPT_ROUNDS ? Number(process.env.BCRYPT_ROUNDS) : undefined,
    },
    maxDriveHours: process.env.MAX_DRIVE_HOURS ? Number(process.env.MAX_DRIVE_HOURS) : undefined,
    maxDutyHours: process.env.MAX_DUTY_HOURS ? Number(process.env.MAX_DUTY_HOURS) : undefined,
    requiredBreakMinutes: process.env.REQUIRED_BREAK_MINUTES ? Number(process.env.REQUIRED_BREAK_MINUTES) : undefined,
    breakTriggerHours: process.env.BREAK_TRIGGER_HOURS ? Number(process.env.BREAK_TRIGGER_HOURS) : undefined,
    minRestHours: process.env.MIN_REST_HOURS ? Number(process.env.MIN_REST_HOURS) : undefined,
    sleeper_berth_split_long: process.env.SLEEPER_BERTH_SPLIT_LONG ? Number(process.env.SLEEPER_BERTH_SPLIT_LONG) : undefined,
    sleeper_berth_split_short: process.env.SLEEPER_BERTH_SPLIT_SHORT ? Number(process.env.SLEEPER_BERTH_SPLIT_SHORT) : undefined,
  };

  // Remove undefined values so zod defaults kick in
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([_, v]) => v !== undefined)
  );

  return configSchema.parse(cleaned);
};
