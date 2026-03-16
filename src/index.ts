#!/usr/bin/env node

import { startMcpServer } from "./mcp/server.js";
import { startTelegramBot } from "./telegram/bot.js";

const args = process.argv.slice(2);
const mcpOnly = args.includes("--mcp");
const telegramOnly = args.includes("--telegram");

async function main(): Promise<void> {
  console.log("[homelab-mcp] Starting...");

  if (mcpOnly) {
    console.log("[homelab-mcp] Mode: MCP server only");
    await startMcpServer();
    return;
  }

  if (telegramOnly) {
    console.log("[homelab-mcp] Mode: Telegram bot only");
    await startTelegramBot();
    return;
  }

  // Default: run both (Telegram in foreground, MCP requires stdio so it gets its own process)
  console.log("[homelab-mcp] Mode: Telegram bot");
  console.log("[homelab-mcp] Note: MCP server runs separately via 'homelab-mcp --mcp'");
  await startTelegramBot();
}

main().catch((err) => {
  console.error("[homelab-mcp] Fatal error:", err);
  process.exit(1);
});
