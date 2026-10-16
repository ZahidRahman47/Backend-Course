//validates environment variables once at startup.
//a missing or wrong variable crashes the app immediately with a clear message,
//instead of failing later on the first request that needs it.
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5001),
    DATABASE_URL: z.url("DATABASE_URL must be a valid connection string."),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters."),
    JWT_EXPIRES_IN: z.string().default("7d"),
    //comma separated list of frontends allowed to call the API
    CORS_ORIGINS: z
        .string()
        .default("http://localhost:3000,http://localhost:5173")
        .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)),
    //set to 1 when running behind one proxy (nginx, render, heroku) so req.ip is the real client ip
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment variables:");
    for (const issue of parsed.error.issues) {
        console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
