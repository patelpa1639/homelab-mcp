import { Bot, type Context } from "grammy";
import { config } from "../config.js";
import * as commands from "./commands.js";
import * as actions from "../core/actions.js";
import * as fmt from "./formatter.js";
import { VM_PRESETS, CT_PRESETS, createVMSizeKeyboard, createVMConfirmKeyboard, createCTSizeKeyboard, createCTConfirmKeyboard } from "./keyboards.js";
import { processNaturalLanguage } from "./natural-language.js";
import { getSession, startSession, endSession, execSSH, formatOutput } from "./shell.js";

/** Send a message with MarkdownV2, falling back to plain text if formatting fails */
async function safeSendMarkdown(ctx: Context, text: string): Promise<void> {
  try {
    await ctx.api.sendMessage(ctx.chat!.id, text, { parse_mode: "MarkdownV2" });
  } catch {
    const plain = text
      .replace(/\\([_*\[\]()~`>#+\-=|{}.!\\])/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/_([^_]+)_/g, "$1");
    await ctx.api.sendMessage(ctx.chat!.id, plain);
  }
}

/** Wrap a command handler so MarkdownV2 errors fall back to plain text */
function safeCommand(handler: (ctx: Context) => Promise<void>): (ctx: Context) => Promise<void> {
  return async (ctx: Context) => {
    const originalReply = ctx.reply.bind(ctx);
    ctx.reply = async (text: string, other?: Record<string, unknown>) => {
      if (other?.parse_mode === "MarkdownV2") {
        try {
          return await originalReply(text, other);
        } catch {
          const plain = text
            .replace(/\\([_*\[\]()~`>#+\-=|{}.!\\])/g, "$1")
            .replace(/\*([^*]+)\*/g, "$1")
            .replace(/`([^`]+)`/g, "$1")
            .replace(/_([^_]+)_/g, "$1");
          return await originalReply(plain);
        }
      }
      return await originalReply(text, other);
    };
    await handler(ctx);
  };
}

export function createTelegramBot(): Bot {
  const token = config.telegram?.botToken;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is required to run the Telegram bot");
  }

  const bot = new Bot(token);
  const allowedUsers = config.telegram?.allowedUsers ?? [];

  // --- Security middleware: user allowlist ---
  if (allowedUsers.length > 0) {
    bot.use(async (ctx, next) => {
      const userId = ctx.from?.id?.toString();
      if (!userId || !allowedUsers.includes(userId)) {
        console.log(`[telegram] Rejected message from unauthorized user: ${userId ?? "unknown"}`);
        await ctx.reply("\u{1F6AB} You are not authorized to use this bot.");
        return;
      }
      await next();
    });
  }

  // --- Command handlers (all wrapped with MarkdownV2 fallback) ---
  bot.command("help", safeCommand(commands.helpCommand));
  bot.command("start", safeCommand(async (ctx) => {
    const args = ctx.message?.text?.split(/\s+/).slice(1) ?? [];
    if (args.length > 0 && /^\d+$/.test(args[0])) {
      ctx.message!.text = `/startvm ${args[0]}`;
      await commands.startCommand(ctx);
    } else {
      await commands.helpCommand(ctx);
    }
  }));
  bot.command("status", safeCommand(commands.statusCommand));
  bot.command("vms", safeCommand(commands.vmsCommand));
  bot.command("vm", safeCommand(commands.vmCommand));
  bot.command("node", safeCommand(commands.nodeCommand));
  bot.command("startvm", safeCommand(commands.startCommand));
  bot.command("stop", safeCommand(commands.stopCommand));
  bot.command("restart", safeCommand(commands.restartCommand));
  bot.command("logs", safeCommand(commands.logsCommand));
  bot.command("create", safeCommand(commands.createCommand));
  bot.command("container", safeCommand(commands.containerCommand));
  bot.command("isos", safeCommand(commands.isosCommand));

  // --- Shell session commands ---
  bot.command("shell", async (ctx) => {
    const args = ctx.message?.text?.split(/\s+/).slice(1) ?? [];
    if (args.length === 0) {
      await ctx.reply(
        "\u{1F4BB} Remote Shell\n\n" +
        "Usage:\n" +
        "  /shell <ip> [user]  \u2014 connect to a VM/CT by IP\n" +
        "  /shell <vmid> <ip> [user]  \u2014 connect (VMID for reference)\n\n" +
        "Examples:\n" +
        "  /shell 192.168.1.50\n" +
        "  /shell 101 192.168.1.50 root\n\n" +
        "Once connected, any message you send runs as a command.\n" +
        "Use /exit to disconnect."
      );
      return;
    }

    // Check for existing session
    const existing = getSession(ctx.chat!.id);
    if (existing) {
      await ctx.reply(
        `\u26A0\uFE0F Already connected to ${existing.user}@${existing.host} (VM ${existing.vmid})\n` +
        `Type /exit first to disconnect.`
      );
      return;
    }

    // Parse args: /shell <ip> [user] OR /shell <vmid> <ip> [user]
    let vmid = 0;
    let host: string;
    let user = "root";

    if (/^\d+$/.test(args[0]) && args.length >= 2 && args[1].includes(".")) {
      // /shell <vmid> <ip> [user]
      vmid = parseInt(args[0], 10);
      host = args[1];
      if (args[2]) user = args[2];
    } else if (args[0].includes(".")) {
      // /shell <ip> [user]
      host = args[0];
      if (args[1]) user = args[1];
    } else {
      await ctx.reply(
        "\u274C Please provide an IP address.\n\n" +
        "Usage: /shell <ip> [user]\n" +
        "Example: /shell 192.168.1.50 root"
      );
      return;
    }

    // Test connection
    await ctx.reply(`\u{1F50C} Connecting to ${user}@${host}...`);
    const test = await execSSH(host, "hostname && whoami", user, 15000);

    if (test.exitCode !== 0 && test.exitCode !== null) {
      await ctx.reply(
        `\u274C Connection failed:\n\`\`\`\n${test.stderr || test.stdout || "Connection timed out"}\n\`\`\`\n\n` +
        "Make sure:\n" +
        "1. SSH is running on the target\n" +
        `2. ${user}'s SSH key is authorized\n` +
        `3. The IP ${host} is reachable`
      );
      return;
    }

    const session = startSession(ctx.chat!.id, vmid, host, user);
    const hostname = test.stdout.split("\n")[0]?.trim() || host;

    await ctx.reply(
      `\u2705 Connected to ${user}@${hostname} (${host})\n\n` +
      `\u{1F4BB} Shell session active \u2014 type any command:\n` +
      `  Example: ls -la /\n` +
      `  Example: df -h\n` +
      `  Example: apt update\n\n` +
      `Type /exit to disconnect.`
    );
  });

  bot.command("exit", async (ctx) => {
    const session = getSession(ctx.chat!.id);
    if (!session) {
      await ctx.reply("No active shell session.");
      return;
    }
    endSession(ctx.chat!.id);
    const duration = Math.floor((Date.now() - session.startedAt) / 1000);
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    await ctx.reply(
      `\u{1F50C} Disconnected from ${session.user}@${session.host}\n` +
      `Session duration: ${mins}m ${secs}s`
    );
  });

  // --- Callback query handlers for inline keyboards ---
  bot.callbackQuery(/^confirm_start_(\d+)$/, async (ctx) => {
    const vmid = parseInt(ctx.match![1], 10);
    await ctx.answerCallbackQuery({ text: "Starting..." });
    const result = await actions.startVM(vmid);
    const text = result.success ? fmt.formatSuccess(result.data!) : fmt.formatError(result.error!);
    await ctx.editMessageText(text);
  });

  bot.callbackQuery(/^confirm_stop_(\d+)$/, async (ctx) => {
    const vmid = parseInt(ctx.match![1], 10);
    await ctx.answerCallbackQuery({ text: "Stopping..." });
    const result = await actions.stopVM(vmid);
    const text = result.success ? fmt.formatSuccess(result.data!) : fmt.formatError(result.error!);
    await ctx.editMessageText(text);
  });

  bot.callbackQuery(/^confirm_restart_(\d+)$/, async (ctx) => {
    const vmid = parseInt(ctx.match![1], 10);
    await ctx.answerCallbackQuery({ text: "Restarting..." });
    const result = await actions.restartVM(vmid);
    const text = result.success ? fmt.formatSuccess(result.data!) : fmt.formatError(result.error!);
    await ctx.editMessageText(text);
  });

  bot.callbackQuery("cancel_action", async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Cancelled" });
    await ctx.editMessageText("Action cancelled.");
  });

  // --- VM Creation flow callbacks ---

  // Step 1: User picked an ISO -> show size presets
  bot.callbackQuery(/^create_iso_(.+?)_(local:.+|none)$/, async (ctx) => {
    const name = ctx.match![1];
    const iso = ctx.match![2];
    await ctx.answerCallbackQuery();
    const isoLabel = iso === "none" ? "No ISO" : iso.split("/").pop();
    await ctx.editMessageText(
      `\u{1F680} Creating VM "${name}"\n\u{1F4BF} ISO: ${isoLabel}\n\nPick a size:`,
      { reply_markup: createVMSizeKeyboard(name, iso) }
    );
  });

  // Step 2: User picked a size -> show confirmation
  bot.callbackQuery(/^create_size_(small|medium|large)_(.+?)_(local:.+|none)$/, async (ctx) => {
    const size = ctx.match![1] as keyof typeof VM_PRESETS;
    const name = ctx.match![2];
    const iso = ctx.match![3];
    const preset = VM_PRESETS[size];
    await ctx.answerCallbackQuery();

    const isoLabel = iso === "none" ? "No ISO" : iso.split("/").pop();
    const summary = [
      `\u{1F680} *Create VM Summary*`,
      ``,
      `  Name: ${name}`,
      `  ISO: ${isoLabel}`,
      `  CPU: ${preset.cores} cores`,
      `  RAM: ${preset.memory / 1024} GB`,
      `  Disk: ${preset.disk} GB on local\\-lvm`,
      ``,
      `Confirm?`,
    ].join("\n");

    try {
      await ctx.editMessageText(summary, {
        parse_mode: "MarkdownV2",
        reply_markup: createVMConfirmKeyboard(name, size, iso),
      });
    } catch {
      const plain = `\u{1F680} Create VM Summary\n\n  Name: ${name}\n  ISO: ${isoLabel}\n  CPU: ${preset.cores} cores\n  RAM: ${preset.memory / 1024} GB\n  Disk: ${preset.disk} GB on local-lvm\n\nConfirm?`;
      await ctx.editMessageText(plain, {
        reply_markup: createVMConfirmKeyboard(name, size, iso),
      });
    }
  });

  // Step 3: User confirmed -> create the VM
  bot.callbackQuery(/^confirm_create_(.+?)_(small|medium|large)_(local:.+|none)$/, async (ctx) => {
    const name = ctx.match![1];
    const size = ctx.match![2] as keyof typeof VM_PRESETS;
    const iso = ctx.match![3];
    const preset = VM_PRESETS[size];

    await ctx.answerCallbackQuery({ text: "Creating VM..." });
    await ctx.editMessageText("\u23F3 Creating VM... this may take a moment.");

    const result = await actions.createVM({
      name,
      cores: preset.cores,
      memory: preset.memory,
      disk: preset.disk,
      iso: iso === "none" ? undefined : iso,
      storage: "local-lvm",
    });

    if (result.success) {
      await ctx.editMessageText(
        `\u2705 VM "${name}" created!\n\n` +
        `  VMID: ${result.data!.vmid}\n` +
        `  CPU: ${preset.cores} cores\n` +
        `  RAM: ${preset.memory / 1024} GB\n` +
        `  Disk: ${preset.disk} GB\n\n` +
        `Use /start ${result.data!.vmid} to boot it up!`
      );
    } else {
      await ctx.editMessageText(`\u274C Failed to create VM: ${result.error}`);
    }
  });

  // --- Container Creation flow callbacks ---

  // Step 1: User picked a template -> show size presets
  bot.callbackQuery(/^ct_tpl_(.+?)_(.+\.tar\..+)$/, async (ctx) => {
    const name = ctx.match![1];
    const template = ctx.match![2];
    await ctx.answerCallbackQuery();

    // Check if template is already downloaded
    const downloaded = await actions.listDownloadedTemplates();
    const alreadyDownloaded = downloaded.success && downloaded.data!.some(
      (t) => t.volid.includes(template)
    );

    const templateDisplay = template.split("_")[0].replace(/-/g, " ");
    let msg = `\u{1F4E6} Container "${name}"\n\u{1F4CB} Template: ${templateDisplay}`;
    if (!alreadyDownloaded) {
      msg += `\n\u{2139}\uFE0F Template will be downloaded automatically`;
    }
    msg += `\n\nPick a size:`;

    await ctx.editMessageText(msg, {
      reply_markup: createCTSizeKeyboard(name, template),
    });
  });

  // Step 2: User picked a size -> show confirmation
  bot.callbackQuery(/^ct_size_(small|medium|large)_(.+?)_(.+\.tar\..+)$/, async (ctx) => {
    const size = ctx.match![1] as keyof typeof CT_PRESETS;
    const name = ctx.match![2];
    const template = ctx.match![3];
    const preset = CT_PRESETS[size];
    await ctx.answerCallbackQuery();

    const templateDisplay = template.split("_")[0].replace(/-/g, " ");
    const summary = [
      `\u{1F4E6} Create Container Summary`,
      ``,
      `  Name: ${name}`,
      `  Template: ${templateDisplay}`,
      `  CPU: ${preset.cores} core(s)`,
      `  RAM: ${preset.memory >= 1024 ? (preset.memory / 1024) + " GB" : preset.memory + " MB"}`,
      `  Disk: ${preset.disk} GB on local-lvm`,
      `  Network: DHCP on vmbr0`,
      `  Unprivileged: Yes`,
      ``,
      `Confirm?`,
    ].join("\n");

    await ctx.editMessageText(summary, {
      reply_markup: createCTConfirmKeyboard(name, size, template),
    });
  });

  // Step 3: User confirmed -> download template if needed and create container
  bot.callbackQuery(/^confirm_ct_(.+?)_(small|medium|large)_(.+\.tar\..+)$/, async (ctx) => {
    const name = ctx.match![1];
    const size = ctx.match![2] as keyof typeof CT_PRESETS;
    const template = ctx.match![3];
    const preset = CT_PRESETS[size];

    await ctx.answerCallbackQuery({ text: "Creating container..." });

    // Check if template needs downloading
    const downloaded = await actions.listDownloadedTemplates();
    const alreadyDownloaded = downloaded.success && downloaded.data!.some(
      (t) => t.volid.includes(template)
    );

    if (!alreadyDownloaded) {
      await ctx.editMessageText("\u{2B07}\uFE0F Downloading template... this may take a minute.");
      const dlResult = await actions.downloadTemplate(template);
      if (!dlResult.success) {
        await ctx.editMessageText(`\u274C Failed to download template: ${dlResult.error}`);
        return;
      }
      // Wait for download to complete
      await new Promise((r) => setTimeout(r, 15000));
    }

    await ctx.editMessageText("\u23F3 Creating container... this may take a moment.");

    const templateVolid = `local:vztmpl/${template}`;
    const result = await actions.createCT({
      name,
      cores: preset.cores,
      memory: preset.memory,
      disk: preset.disk,
      template: templateVolid,
      password: "changeme123",
      storage: "local-lvm",
    });

    if (result.success) {
      await ctx.editMessageText(
        `\u2705 Container "${name}" created!\n\n` +
        `  VMID: ${result.data!.vmid}\n` +
        `  CPU: ${preset.cores} core(s)\n` +
        `  RAM: ${preset.memory >= 1024 ? (preset.memory / 1024) + " GB" : preset.memory + " MB"}\n` +
        `  Disk: ${preset.disk} GB\n` +
        `  Root password: changeme123\n\n` +
        `Use /start ${result.data!.vmid} to boot it up!\n` +
        `\u26A0\uFE0F Change the root password after first login.`
      );
    } else {
      await ctx.editMessageText(`\u274C Failed to create container: ${result.error}`);
    }
  });

  // --- Natural language handler + shell session (catch-all for text messages) ---
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;

    // If there's an active shell session, run the command via SSH
    const session = getSession(ctx.chat!.id);
    if (session) {
      // Don't intercept commands
      if (text.startsWith("/")) return;

      console.log(`[shell] ${session.user}@${session.host}: ${text}`);
      const result = await execSSH(session.host, text, session.user);
      const output = formatOutput(result);

      try {
        await ctx.reply(output, { parse_mode: "MarkdownV2" });
      } catch {
        // Fallback: send as plain text
        const plain = output
          .replace(/```\n?/g, "")
          .replace(/\\([_*\[\]()~`>#+\-=|{}.!\\])/g, "$1");
        await ctx.reply(plain);
      }
      return;
    }

    // No shell session — use natural language
    if (!config.ai?.apiKey) {
      await ctx.reply(
        "I can understand plain English, but AI is not configured. Use commands instead \u2014 type /help."
      );
      return;
    }

    const response = await processNaturalLanguage(text);
    await safeSendMarkdown(ctx, response);
  });

  return bot;
}

export async function startTelegramBot(): Promise<void> {
  const bot = createTelegramBot();

  bot.catch((err) => {
    console.error("[telegram] Bot error:", err);
  });

  console.log("[telegram] Bot starting...");
  await bot.start({
    onStart: () => console.log("[telegram] Bot is running"),
  });
}
