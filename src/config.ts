import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const configSchema = z.object({
  // Proxmox
  proxmox: z.object({
    host: z.string().min(1, "PROXMOX_HOST is required"),
    port: z.coerce.number().default(8006),
    tokenId: z.string().min(1, "PROXMOX_TOKEN_ID is required"),
    tokenSecret: z.string().min(1, "PROXMOX_TOKEN_SECRET is required"),
    allowSelfSignedCerts: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),
  }),

  // Telegram (optional)
  telegram: z
    .object({
      botToken: z.string().min(1).optional(),
      allowedUsers: z
        .string()
        .optional()
        .transform((v) => (v ? v.split(",").map((id) => id.trim()) : [])),
    })
    .optional(),

  // AI provider for natural language routing (optional)
  ai: z
    .object({
      provider: z.enum(["openai", "anthropic"]).default("openai"),
      apiKey: z.string().min(1).optional(),
      model: z.string().optional(),
    })
    .optional(),

  // Dashboard (optional)
  dashboard: z
    .object({
      port: z.coerce.number().default(3000),
    })
    .optional(),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const raw = {
    proxmox: {
      host: process.env.PROXMOX_HOST ?? "",
      port: process.env.PROXMOX_PORT ?? "8006",
      tokenId: process.env.PROXMOX_TOKEN_ID ?? "",
      tokenSecret: process.env.PROXMOX_TOKEN_SECRET ?? "",
      allowSelfSignedCerts: process.env.PROXMOX_ALLOW_SELF_SIGNED ?? "true",
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      allowedUsers: process.env.TELEGRAM_ALLOWED_USERS,
    },
    ai: {
      provider: process.env.AI_PROVIDER ?? "openai",
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL,
    },
    dashboard: {
      port: process.env.DASHBOARD_PORT ?? "3000",
    },
  };

  return configSchema.parse(raw);
}

export const config = loadConfig();
