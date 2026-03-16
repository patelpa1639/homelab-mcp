import { proxmox } from "./proxmox-client.js";
import type { ActionResult, ProxmoxVM, ProxmoxVMStatus, ProxmoxNode, ProxmoxNodeStats, ProxmoxLogEntry, ProxmoxISO, ProxmoxTemplate, CreateVMOptions, CreateCTOptions } from "./types.js";

/** List all VMs and containers across all nodes */
export async function listVMs(): Promise<ActionResult<ProxmoxVM[]>> {
  try {
    const vms = await proxmox.getVMs();
    return { success: true, data: vms };
  } catch (err) {
    return { success: false, error: `Failed to list VMs: ${errorMessage(err)}` };
  }
}

/** Get detailed status of a specific VM/CT by VMID */
export async function getVMStatus(vmid: number): Promise<ActionResult<ProxmoxVMStatus & { node: string; type: string }>> {
  try {
    const result = await proxmox.getVMStatus(vmid);
    if (!result) {
      return { success: false, error: `VM/CT ${vmid} not found on any node` };
    }
    return { success: true, data: { ...result.vm, node: result.node, type: result.type } };
  } catch (err) {
    return { success: false, error: `Failed to get VM status: ${errorMessage(err)}` };
  }
}

/** List all cluster nodes */
export async function listNodes(): Promise<ActionResult<ProxmoxNode[]>> {
  try {
    const nodes = await proxmox.getNodes();
    return { success: true, data: nodes };
  } catch (err) {
    return { success: false, error: `Failed to list nodes: ${errorMessage(err)}` };
  }
}

/** Get detailed stats for a specific node */
export async function getNodeStats(
  node: string,
  timeframe: "hour" | "day" | "week" = "hour"
): Promise<ActionResult<{ node: string; stats: ProxmoxNodeStats | null }>> {
  try {
    const stats = await proxmox.getNodeStats(node, timeframe);
    // Return the most recent data point
    const latest = stats.length > 0 ? stats[stats.length - 1] : null;
    return { success: true, data: { node, stats: latest } };
  } catch (err) {
    return { success: false, error: `Failed to get node stats: ${errorMessage(err)}` };
  }
}

/** Start a VM/CT */
export async function startVM(vmid: number): Promise<ActionResult<string>> {
  try {
    const upid = await proxmox.startVM(vmid);
    return { success: true, data: `VM/CT ${vmid} start initiated (task: ${upid})` };
  } catch (err) {
    return { success: false, error: `Failed to start VM ${vmid}: ${errorMessage(err)}` };
  }
}

/** Stop a VM/CT */
export async function stopVM(vmid: number): Promise<ActionResult<string>> {
  try {
    const upid = await proxmox.stopVM(vmid);
    return { success: true, data: `VM/CT ${vmid} stop initiated (task: ${upid})` };
  } catch (err) {
    return { success: false, error: `Failed to stop VM ${vmid}: ${errorMessage(err)}` };
  }
}

/** Restart a VM/CT */
export async function restartVM(vmid: number): Promise<ActionResult<string>> {
  try {
    const upid = await proxmox.rebootVM(vmid);
    return { success: true, data: `VM/CT ${vmid} restart initiated (task: ${upid})` };
  } catch (err) {
    return { success: false, error: `Failed to restart VM ${vmid}: ${errorMessage(err)}` };
  }
}

/** Search node syslog for entries matching a query */
export async function searchLogs(
  node: string,
  query?: string,
  limit: number = 50
): Promise<ActionResult<ProxmoxLogEntry[]>> {
  try {
    const logs = await proxmox.getNodeSyslog(node, Math.min(limit, 500));
    const filtered = query
      ? logs.filter((entry) => entry.t.toLowerCase().includes(query.toLowerCase()))
      : logs;
    return { success: true, data: filtered };
  } catch (err) {
    return { success: false, error: `Failed to search logs: ${errorMessage(err)}` };
  }
}

/** List available ISO images */
export async function listISOs(): Promise<ActionResult<ProxmoxISO[]>> {
  try {
    const nodes = await proxmox.getNodes();
    const node = nodes[0]?.node;
    if (!node) return { success: false, error: "No available nodes" };
    const isos = await proxmox.getISOs(node);
    return { success: true, data: isos };
  } catch (err) {
    return { success: false, error: `Failed to list ISOs: ${errorMessage(err)}` };
  }
}

/** Create a new VM */
export async function createVM(opts: CreateVMOptions): Promise<ActionResult<{ vmid: number; taskId: string }>> {
  try {
    const result = await proxmox.createVM(opts);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: `Failed to create VM: ${errorMessage(err)}` };
  }
}

/** List available container templates (downloadable) */
export async function listTemplates(): Promise<ActionResult<ProxmoxTemplate[]>> {
  try {
    const nodes = await proxmox.getNodes();
    const node = nodes[0]?.node;
    if (!node) return { success: false, error: "No available nodes" };
    const templates = await proxmox.getAvailableTemplates(node);
    return { success: true, data: templates };
  } catch (err) {
    return { success: false, error: `Failed to list templates: ${errorMessage(err)}` };
  }
}

/** List downloaded container templates */
export async function listDownloadedTemplates(): Promise<ActionResult<ProxmoxISO[]>> {
  try {
    const nodes = await proxmox.getNodes();
    const node = nodes[0]?.node;
    if (!node) return { success: false, error: "No available nodes" };
    const templates = await proxmox.getDownloadedTemplates(node);
    return { success: true, data: templates };
  } catch (err) {
    return { success: false, error: `Failed to list downloaded templates: ${errorMessage(err)}` };
  }
}

/** Download a container template */
export async function downloadTemplate(template: string): Promise<ActionResult<string>> {
  try {
    const nodes = await proxmox.getNodes();
    const node = nodes[0]?.node;
    if (!node) return { success: false, error: "No available nodes" };
    const taskId = await proxmox.downloadTemplate(node, "local", template);
    return { success: true, data: taskId };
  } catch (err) {
    return { success: false, error: `Failed to download template: ${errorMessage(err)}` };
  }
}

/** Create a new LXC container */
export async function createCT(opts: CreateCTOptions): Promise<ActionResult<{ vmid: number; taskId: string }>> {
  try {
    const result = await proxmox.createCT(opts);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: `Failed to create container: ${errorMessage(err)}` };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
