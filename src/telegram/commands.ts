import type { Context } from "grammy";
import * as actions from "../core/actions.js";
import * as fmt from "./formatter.js";
import { startConfirmKeyboard, stopConfirmKeyboard, restartConfirmKeyboard, createVMISOKeyboard, createCTTemplateKeyboard } from "./keyboards.js";

/** /help — Show available commands */
export async function helpCommand(ctx: Context): Promise<void> {
  const text = [
    "\u{1F916} *Homelab MCP Bot*",
    "",
    "*Commands:*",
    "  /status \\- Cluster overview",
    "  /vms \\- List all VMs and containers",
    "  /vm `<vmid>` \\- Detailed VM status",
    "  /node `<name>` \\- Node statistics",
    "  /start `<vmid>` \\- Start a VM/CT",
    "  /stop `<vmid>` \\- Stop a VM/CT",
    "  /restart `<vmid>` \\- Restart a VM/CT",
    "  /create `<name>` \\- Create a new VM",
    "  /container `<name>` \\- Create a new LXC container",
    "  /isos \\- List available ISO images",
    "  /logs `<node>` `[query]` \\- Search logs",
    "",
    "*Remote Shell:*",
    "  /shell `<ip>` `[user]` \\- SSH into a VM/CT",
    "  /exit \\- Disconnect from shell",
    "",
    "  /help \\- Show this message",
    "",
    "Or just type in plain English:",
    '_"Show me all running VMs"_',
    '_"Spin up a new Ubuntu VM called webserver"_',
    '_"What\u2019s the CPU usage on pve?"_',
  ].join("\n");
  await ctx.reply(text, { parse_mode: "MarkdownV2" });
}

/** /status — Cluster overview (nodes + VMs) */
export async function statusCommand(ctx: Context): Promise<void> {
  const [nodesResult, vmsResult] = await Promise.all([
    actions.listNodes(),
    actions.listVMs(),
  ]);

  let text = "";
  if (nodesResult.success) {
    text += fmt.formatNodeList(nodesResult.data!) + "\n\n";
  } else {
    text += fmt.formatError(nodesResult.error!) + "\n\n";
  }
  if (vmsResult.success) {
    text += fmt.formatVMList(vmsResult.data!);
  } else {
    text += fmt.formatError(vmsResult.error!);
  }

  await ctx.reply(text, { parse_mode: "MarkdownV2" });
}

/** /vms — List all VMs */
export async function vmsCommand(ctx: Context): Promise<void> {
  const result = await actions.listVMs();
  if (!result.success) {
    await ctx.reply(fmt.formatError(result.error!));
    return;
  }
  await ctx.reply(fmt.formatVMList(result.data!), { parse_mode: "MarkdownV2" });
}

/** /vm <vmid> — Get VM status */
export async function vmCommand(ctx: Context): Promise<void> {
  const args = ctx.message?.text?.split(/\s+/).slice(1) ?? [];
  if (args.length === 0) {
    await ctx.reply(fmt.formatError("Usage: /vm <vmid>"));
    return;
  }

  const vmid = parseInt(args[0], 10);
  if (isNaN(vmid)) {
    await ctx.reply(fmt.formatError("Invalid VMID. Must be a number."));
    return;
  }

  const result = await actions.getVMStatus(vmid);
  if (!result.success) {
    await ctx.reply(fmt.formatError(result.error!));
    return;
  }
  await ctx.reply(fmt.formatVMStatus(result.data!), { parse_mode: "MarkdownV2" });
}

/** /node <name> — Get node stats */
export async function nodeCommand(ctx: Context): Promise<void> {
  const args = ctx.message?.text?.split(/\s+/).slice(1) ?? [];
  if (args.length === 0) {
    await ctx.reply(fmt.formatError("Usage: /node <name>"));
    return;
  }

  const result = await actions.getNodeStats(args[0]);
  if (!result.success) {
    await ctx.reply(fmt.formatError(result.error!));
    return;
  }
  await ctx.reply(fmt.formatNodeStats(result.data!.node, result.data!.stats), {
    parse_mode: "MarkdownV2",
  });
}

/** /start <vmid> — Start VM with confirmation */
export async function startCommand(ctx: Context): Promise<void> {
  const args = ctx.message?.text?.split(/\s+/).slice(1) ?? [];
  if (args.length === 0) {
    await ctx.reply(fmt.formatError("Usage: /start <vmid>"));
    return;
  }

  const vmid = parseInt(args[0], 10);
  if (isNaN(vmid)) {
    await ctx.reply(fmt.formatError("Invalid VMID. Must be a number."));
    return;
  }

  // Look up the VM name for a better confirmation message
  const status = await actions.getVMStatus(vmid);
  const vmName = status.success ? status.data!.name : undefined;

  await ctx.reply(`Start VM \`${vmid}\`${vmName ? ` (${fmt.escapeMarkdown(vmName)})` : ""}?`, {
    parse_mode: "MarkdownV2",
    reply_markup: startConfirmKeyboard(vmid, vmName),
  });
}

/** /stop <vmid> — Stop VM with confirmation */
export async function stopCommand(ctx: Context): Promise<void> {
  const args = ctx.message?.text?.split(/\s+/).slice(1) ?? [];
  if (args.length === 0) {
    await ctx.reply(fmt.formatError("Usage: /stop <vmid>"));
    return;
  }

  const vmid = parseInt(args[0], 10);
  if (isNaN(vmid)) {
    await ctx.reply(fmt.formatError("Invalid VMID. Must be a number."));
    return;
  }

  const status = await actions.getVMStatus(vmid);
  const vmName = status.success ? status.data!.name : undefined;

  await ctx.reply(`Stop VM \`${vmid}\`${vmName ? ` (${fmt.escapeMarkdown(vmName)})` : ""}?`, {
    parse_mode: "MarkdownV2",
    reply_markup: stopConfirmKeyboard(vmid, vmName),
  });
}

/** /restart <vmid> — Restart VM with confirmation */
export async function restartCommand(ctx: Context): Promise<void> {
  const args = ctx.message?.text?.split(/\s+/).slice(1) ?? [];
  if (args.length === 0) {
    await ctx.reply(fmt.formatError("Usage: /restart <vmid>"));
    return;
  }

  const vmid = parseInt(args[0], 10);
  if (isNaN(vmid)) {
    await ctx.reply(fmt.formatError("Invalid VMID. Must be a number."));
    return;
  }

  const status = await actions.getVMStatus(vmid);
  const vmName = status.success ? status.data!.name : undefined;

  await ctx.reply(`Restart VM \`${vmid}\`${vmName ? ` (${fmt.escapeMarkdown(vmName)})` : ""}?`, {
    parse_mode: "MarkdownV2",
    reply_markup: restartConfirmKeyboard(vmid, vmName),
  });
}

/** /logs <node> [query] — Search logs */
export async function logsCommand(ctx: Context): Promise<void> {
  const args = ctx.message?.text?.split(/\s+/).slice(1) ?? [];
  if (args.length === 0) {
    await ctx.reply(fmt.formatError("Usage: /logs <node> [search query]"));
    return;
  }

  const node = args[0];
  const query = args.length > 1 ? args.slice(1).join(" ") : undefined;

  const result = await actions.searchLogs(node, query);
  if (!result.success) {
    await ctx.reply(fmt.formatError(result.error!));
    return;
  }
  await ctx.reply(fmt.formatLogs(result.data!, query), { parse_mode: "MarkdownV2" });
}

/** /isos — List available ISO images */
export async function isosCommand(ctx: Context): Promise<void> {
  const result = await actions.listISOs();
  if (!result.success) {
    await ctx.reply(fmt.formatError(result.error!));
    return;
  }
  const isos = result.data!;
  if (isos.length === 0) {
    await ctx.reply("No ISO images found. Upload ISOs to your Proxmox local storage.");
    return;
  }
  const lines = isos.map((iso) => {
    const filename = iso.volid.split("/").pop() ?? iso.volid;
    const sizeMB = (iso.size / 1024 / 1024).toFixed(0);
    return `\u{1F4BF} \`${fmt.escapeMarkdown(filename)}\` \\(${sizeMB} MB\\)`;
  });
  await ctx.reply(`*Available ISOs:*\n\n${lines.join("\n")}`, { parse_mode: "MarkdownV2" });
}

/** /create <name> — Start VM creation flow */
export async function createCommand(ctx: Context): Promise<void> {
  const args = ctx.message?.text?.split(/\s+/).slice(1) ?? [];
  if (args.length === 0) {
    await ctx.reply(fmt.formatError("Usage: /create <vm-name>\n\nExample: /create webserver"));
    return;
  }

  const name = args[0].replace(/[^a-zA-Z0-9\-_.]/g, ""); // sanitize
  if (!name) {
    await ctx.reply(fmt.formatError("Invalid VM name. Use letters, numbers, hyphens, dots."));
    return;
  }

  // Fetch ISOs and show picker
  const result = await actions.listISOs();
  if (!result.success) {
    await ctx.reply(fmt.formatError(result.error!));
    return;
  }

  const isos = result.data!;
  await ctx.reply(
    `\u{1F680} Creating VM *${fmt.escapeMarkdown(name)}*\n\nPick an ISO to boot from:`,
    {
      parse_mode: "MarkdownV2",
      reply_markup: createVMISOKeyboard(name, isos),
    }
  );
}

/** /container <name> — Start container creation flow */
export async function containerCommand(ctx: Context): Promise<void> {
  const args = ctx.message?.text?.split(/\s+/).slice(1) ?? [];
  if (args.length === 0) {
    await ctx.reply(fmt.formatError("Usage: /container <name>\n\nExample: /container nginx-proxy"));
    return;
  }

  const name = args[0].replace(/[^a-zA-Z0-9\-_.]/g, "");
  if (!name) {
    await ctx.reply(fmt.formatError("Invalid container name. Use letters, numbers, hyphens, dots."));
    return;
  }

  await ctx.reply(
    `\u{1F4E6} Creating container *${fmt.escapeMarkdown(name)}*\n\nPick a template:`,
    {
      parse_mode: "MarkdownV2",
      reply_markup: createCTTemplateKeyboard(name),
    }
  );
}
