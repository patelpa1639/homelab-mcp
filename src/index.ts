#!/usr/bin/env node

import { startMcpServer } from "./mcp/server.js";
import { startTelegramBot } from "./telegram/bot.js";
import { startDashboard } from "./dashboard/server.js";

const args = process.argv.slice(2);
const mcpOnly = args.includes("--mcp");
const telegramOnly = args.includes("--telegram");
const dashboardOnly = args.includes("--dashboard");

async function main(): Promise<void> {
  console.log("[homelab-mcp] Starting...");

  if (mcpOnly) {
    console.log("[homelab-mcp] Mode: MCP server only");
    await startMcpServer();
    return;
  }

  if (dashboardOnly) {
    console.log("[homelab-mcp] Mode: Dashboard only");
    await startDashboard();
    return;
  }

  if (telegramOnly) {
    console.log("[homelab-mcp] Mode: Telegram bot only");
    await startTelegramBot();
    return;
  }

  // Default: run Telegram bot + Dashboard
  console.log("[homelab-mcp] Mode: Telegram bot + Dashboard");
  console.log("[homelab-mcp] Note: MCP server runs separately via 'homelab-mcp --mcp'");
  await startDashboard();
  await startTelegramBot();
}

main().catch((err) => {
  console.error("[homelab-mcp] Fatal error:", err);
  process.exit(1);
});
