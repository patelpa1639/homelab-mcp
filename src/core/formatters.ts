import type { ProxmoxVM, ProxmoxVMStatus, ProxmoxNode, ProxmoxNodeStats, ProxmoxLogEntry } from "./types.js";

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

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** Format VM list for LLM consumption */
export function formatVMListForLLM(vms: ProxmoxVM[]): string {
  if (vms.length === 0) return "No VMs or containers found.";

  const lines = vms.map((vm) => {
    return [
      `VMID: ${vm.vmid}`,
      `Name: ${vm.name}`,
      `Type: ${vm.type.toUpperCase()}`,
      `Status: ${vm.status}`,
      `Node: ${vm.node}`,
      `CPU: ${formatPercent(vm.cpu)} of ${vm.cpus} cores`,
      `Memory: ${formatBytes(vm.mem)} / ${formatBytes(vm.maxmem)}`,
      `Uptime: ${vm.status === "running" ? formatUptime(vm.uptime) : "N/A"}`,
    ].join(" | ");
  });

  return `Found ${vms.length} VM(s)/container(s):\n\n${lines.join("\n")}`;
}

/** Format VM status for LLM consumption */
export function formatVMStatusForLLM(vm: ProxmoxVMStatus & { node: string; type: string }): string {
  return [
    `VM/CT Status Report`,
    `---`,
    `VMID: ${vm.vmid}`,
    `Name: ${vm.name}`,
    `Type: ${vm.type.toUpperCase()}`,
    `Node: ${vm.node}`,
    `Status: ${vm.status}`,
    `CPU Usage: ${formatPercent(vm.cpu)} of ${vm.cpus} core(s)`,
    `Memory: ${formatBytes(vm.mem)} / ${formatBytes(vm.maxmem)} (${formatPercent(vm.mem / vm.maxmem)})`,
    `Disk: ${formatBytes(vm.disk)} / ${formatBytes(vm.maxdisk)}`,
    `Network In: ${formatBytes(vm.netin)}`,
    `Network Out: ${formatBytes(vm.netout)}`,
    `Uptime: ${vm.status === "running" ? formatUptime(vm.uptime) : "N/A"}`,
    ...(vm.pid ? [`PID: ${vm.pid}`] : []),
  ].join("\n");
}

/** Format node list for LLM consumption */
export function formatNodeListForLLM(nodes: ProxmoxNode[]): string {
  if (nodes.length === 0) return "No nodes found.";

  const lines = nodes.map((node) => {
    return [
      `Node: ${node.node}`,
      `Status: ${node.status}`,
      `CPU: ${formatPercent(node.cpu)} of ${node.maxcpu} cores`,
      `Memory: ${formatBytes(node.mem)} / ${formatBytes(node.maxmem)}`,
      `Disk: ${formatBytes(node.disk)} / ${formatBytes(node.maxdisk)}`,
      `Uptime: ${formatUptime(node.uptime)}`,
    ].join(" | ");
  });

  return `Found ${nodes.length} node(s):\n\n${lines.join("\n")}`;
}

/** Format node stats for LLM consumption */
export function formatNodeStatsForLLM(node: string, stats: ProxmoxNodeStats | null): string {
  if (!stats) return `No stats available for node ${node}.`;

  return [
    `Node Stats: ${node}`,
    `---`,
    `CPU Usage: ${formatPercent(stats.cpu)}`,
    `Memory: ${formatBytes(stats.memused)} / ${formatBytes(stats.memtotal)} (${formatPercent(stats.memused / stats.memtotal)})`,
    `Swap: ${formatBytes(stats.swapused)} / ${formatBytes(stats.swaptotal)}`,
    `Root Disk: ${formatBytes(stats.rootused)} / ${formatBytes(stats.roottotal)}`,
    `Network In: ${formatBytes(stats.netin)}`,
    `Network Out: ${formatBytes(stats.netout)}`,
    `IO Wait: ${formatPercent(stats.iowait)}`,
    `Load Average: ${stats.loadavg.toFixed(2)}`,
  ].join("\n");
}

/** Format log entries for LLM consumption */
export function formatLogsForLLM(logs: ProxmoxLogEntry[], query?: string): string {
  if (logs.length === 0) {
    return query ? `No log entries matching "${query}".` : "No log entries found.";
  }

  const header = query
    ? `Found ${logs.length} log entries matching "${query}":`
    : `Showing ${logs.length} log entries:`;

  return `${header}\n\n${logs.map((entry) => entry.t).join("\n")}`;
}

// Re-export helpers for Telegram formatter
export { formatBytes, formatUptime, formatPercent };
