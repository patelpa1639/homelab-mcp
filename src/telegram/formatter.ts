import type { ProxmoxVM, ProxmoxVMStatus, ProxmoxNode, ProxmoxNodeStats, ProxmoxLogEntry } from "../core/types.js";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function statusEmoji(status: string): string {
  switch (status) {
    case "running":
    case "online":
      return "\u{1F7E2}";
    case "stopped":
    case "offline":
      return "\u{1F534}";
    case "paused":
    case "suspended":
      return "\u{1F7E1}";
    default:
      return "\u26AA";
  }
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** Format VM list for Telegram */
export function formatVMList(vms: ProxmoxVM[]): string {
  if (vms.length === 0) return "No VMs or containers found.";

  const lines = vms.map((vm) => {
    const emoji = statusEmoji(vm.status);
    const mem = `${formatBytes(vm.mem)}/${formatBytes(vm.maxmem)}`;
    return `${emoji} \`${vm.vmid}\` *${escapeMarkdown(vm.name)}*\n   ${escapeMarkdown(vm.type.toUpperCase())} on ${escapeMarkdown(vm.node)} \u2022 CPU \`${formatPercent(vm.cpu)}\` \u2022 Mem \`${mem}\``;
  });

  return `\u{1F5A5} *VMs & Containers* \\(${vms.length}\\)\n\n${lines.join("\n\n")}`;
}

/** Format VM status for Telegram */
export function formatVMStatus(vm: ProxmoxVMStatus & { node: string; type: string }): string {
  const emoji = statusEmoji(vm.status);
  const memPct = vm.maxmem > 0 ? formatPercent(vm.mem / vm.maxmem) : "N/A";

  return [
    `${emoji} *${escapeMarkdown(vm.name)}* (\`${vm.vmid}\`)`,
    ``,
    `\u{1F4CB} *Details*`,
    `   Type: \`${vm.type.toUpperCase()}\``,
    `   Node: \`${vm.node}\``,
    `   Status: \`${vm.status}\``,
    ``,
    `\u{1F4CA} *Resources*`,
    `   CPU: \`${formatPercent(vm.cpu)}\` of ${vm.cpus} core\\(s\\)`,
    `   Memory: \`${formatBytes(vm.mem)}\` / \`${formatBytes(vm.maxmem)}\` \\(${escapeMarkdown(memPct)}\\)`,
    `   Disk: \`${formatBytes(vm.disk)}\` / \`${formatBytes(vm.maxdisk)}\``,
    `   Net In: \`${formatBytes(vm.netin)}\``,
    `   Net Out: \`${formatBytes(vm.netout)}\``,
    ``,
    `\u23F1 Uptime: \`${vm.status === "running" ? formatUptime(vm.uptime) : "N/A"}\``,
  ].join("\n");
}

/** Format node list for Telegram */
export function formatNodeList(nodes: ProxmoxNode[]): string {
  if (nodes.length === 0) return "No nodes found.";

  const lines = nodes.map((node) => {
    const emoji = statusEmoji(node.status);
    const memPct = node.maxmem > 0 ? formatPercent(node.mem / node.maxmem) : "N/A";
    return [
      `${emoji} *${escapeMarkdown(node.node)}*`,
      `   CPU: \`${formatPercent(node.cpu)}\` of ${node.maxcpu} cores`,
      `   Mem: \`${formatBytes(node.mem)}\` / \`${formatBytes(node.maxmem)}\` \\(${escapeMarkdown(memPct)}\\)`,
      `   Disk: \`${formatBytes(node.disk)}\` / \`${formatBytes(node.maxdisk)}\``,
      `   Uptime: \`${formatUptime(node.uptime)}\``,
    ].join("\n");
  });

  return `\u{1F3E0} *Cluster Nodes* \\(${nodes.length}\\)\n\n${lines.join("\n\n")}`;
}

/** Format node stats for Telegram */
export function formatNodeStats(node: string, stats: ProxmoxNodeStats | null): string {
  if (!stats) return `No stats available for node \`${node}\`.`;

  const memPct = stats.memtotal > 0 ? formatPercent(stats.memused / stats.memtotal) : "N/A";

  return [
    `\u{1F4CA} *Node Stats:* \`${escapeMarkdown(node)}\``,
    ``,
    `   CPU: \`${formatPercent(stats.cpu)}\``,
    `   Memory: \`${formatBytes(stats.memused)}\` / \`${formatBytes(stats.memtotal)}\` \\(${escapeMarkdown(memPct)}\\)`,
    `   Swap: \`${formatBytes(stats.swapused)}\` / \`${formatBytes(stats.swaptotal)}\``,
    `   Root: \`${formatBytes(stats.rootused)}\` / \`${formatBytes(stats.roottotal)}\``,
    `   Net In: \`${formatBytes(stats.netin)}\``,
    `   Net Out: \`${formatBytes(stats.netout)}\``,
    `   IO Wait: \`${formatPercent(stats.iowait)}\``,
    `   Load: \`${stats.loadavg.toFixed(2)}\``,
  ].join("\n");
}

/** Format log entries for Telegram */
export function formatLogs(logs: ProxmoxLogEntry[], query?: string): string {
  if (logs.length === 0) {
    return query ? `No log entries matching "${escapeMarkdown(query)}".` : "No log entries found.";
  }

  const header = query
    ? `\u{1F50D} *Logs matching* "${escapeMarkdown(query)}" \\(${logs.length}\\)`
    : `\u{1F4DC} *Recent Logs* \\(${logs.length}\\)`;

  // Truncate to avoid Telegram message limit (4096 chars)
  let body = "";
  for (const entry of logs) {
    const line = `\`${escapeMarkdown(entry.t)}\`\n`;
    if (body.length + line.length + header.length > 3800) {
      body += "\n_...truncated_";
      break;
    }
    body += line;
  }

  return `${header}\n\n${body}`;
}

/** Format a success message */
export function formatSuccess(message: string): string {
  return `\u2705 ${message}`;
}

/** Format an error message */
export function formatError(message: string): string {
  return `\u274C ${message}`;
}

/** Escape special Markdown V2 characters */
function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

export { escapeMarkdown };
