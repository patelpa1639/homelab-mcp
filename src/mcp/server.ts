import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as actions from "../core/actions.js";
import {
  formatVMListForLLM,
  formatVMStatusForLLM,
  formatNodeListForLLM,
  formatNodeStatsForLLM,
  formatLogsForLLM,
} from "../core/formatters.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "homelab-mcp",
    version: "0.1.0",
  });

  // --- Tools ---

  server.tool(
    "list_vms",
    "List all virtual machines and containers across all Proxmox nodes. Returns VMID, name, status, resource usage, and which node each VM runs on.",
    {},
    async () => {
      const result = await actions.listVMs();
      if (!result.success) {
        return { content: [{ type: "text", text: result.error! }], isError: true };
      }
      return { content: [{ type: "text", text: formatVMListForLLM(result.data!) }] };
    }
  );

  server.tool(
    "get_vm_status",
    "Get detailed status of a specific VM or container by its VMID. Returns CPU, memory, disk, network usage, and uptime.",
    { vmid: z.number().describe("The numeric VMID of the VM or container") },
    async ({ vmid }) => {
      const result = await actions.getVMStatus(vmid);
      if (!result.success) {
        return { content: [{ type: "text", text: result.error! }], isError: true };
      }
      return { content: [{ type: "text", text: formatVMStatusForLLM(result.data!) }] };
    }
  );

  server.tool(
    "list_nodes",
    "List all nodes in the Proxmox cluster with their status and resource usage.",
    {},
    async () => {
      const result = await actions.listNodes();
      if (!result.success) {
        return { content: [{ type: "text", text: result.error! }], isError: true };
      }
      return { content: [{ type: "text", text: formatNodeListForLLM(result.data!) }] };
    }
  );

  server.tool(
    "get_node_stats",
    "Get detailed resource statistics for a specific Proxmox node including CPU, memory, swap, disk, network, and IO metrics.",
    {
      node: z.string().describe("The node name (e.g., 'pve', 'node1')"),
      timeframe: z
        .enum(["hour", "day", "week"])
        .optional()
        .describe("Time range for stats. Default: hour"),
    },
    async ({ node, timeframe }) => {
      const result = await actions.getNodeStats(node, timeframe ?? "hour");
      if (!result.success) {
        return { content: [{ type: "text", text: result.error! }], isError: true };
      }
      return {
        content: [{ type: "text", text: formatNodeStatsForLLM(result.data!.node, result.data!.stats) }],
      };
    }
  );

  server.tool(
    "start_vm",
    "Start a stopped VM or container. Requires the numeric VMID. The VM will be found automatically across all nodes.",
    { vmid: z.number().describe("The numeric VMID of the VM or container to start") },
    async ({ vmid }) => {
      const result = await actions.startVM(vmid);
      if (!result.success) {
        return { content: [{ type: "text", text: result.error! }], isError: true };
      }
      return { content: [{ type: "text", text: result.data! }] };
    }
  );

  server.tool(
    "stop_vm",
    "Stop a running VM or container. Requires the numeric VMID. The VM will be found automatically across all nodes.",
    { vmid: z.number().describe("The numeric VMID of the VM or container to stop") },
    async ({ vmid }) => {
      const result = await actions.stopVM(vmid);
      if (!result.success) {
        return { content: [{ type: "text", text: result.error! }], isError: true };
      }
      return { content: [{ type: "text", text: result.data! }] };
    }
  );

  server.tool(
    "search_logs",
    "Search syslog entries on a specific node. Optionally filter by a search query string. Returns matching log lines.",
    {
      node: z.string().describe("The node name to search logs on"),
      query: z.string().optional().describe("Text to search for in log entries"),
      limit: z
        .number()
        .optional()
        .describe("Maximum number of log entries to return. Default: 50"),
    },
    async ({ node, query, limit }) => {
      const result = await actions.searchLogs(node, query, limit ?? 50);
      if (!result.success) {
        return { content: [{ type: "text", text: result.error! }], isError: true };
      }
      return { content: [{ type: "text", text: formatLogsForLLM(result.data!, query) }] };
    }
  );

  // --- Resources ---

  server.resource(
    "cluster_status",
    "proxmox://cluster/status",
    {
      description:
        "Current cluster overview: all nodes and VMs with their status and resource usage",
      mimeType: "text/plain",
    },
    async (uri) => {
      const nodesResult = await actions.listNodes();
      const vmsResult = await actions.listVMs();

      let text = "";
      if (nodesResult.success) {
        text += formatNodeListForLLM(nodesResult.data!) + "\n\n";
      } else {
        text += `Nodes: ${nodesResult.error}\n\n`;
      }
      if (vmsResult.success) {
        text += formatVMListForLLM(vmsResult.data!);
      } else {
        text += `VMs: ${vmsResult.error}`;
      }

      return { contents: [{ uri: uri.href, text, mimeType: "text/plain" }] };
    }
  );

  server.resource(
    "vm_inventory",
    "proxmox://vms/inventory",
    {
      description: "List of all VMs and containers with basic info",
      mimeType: "application/json",
    },
    async (uri) => {
      const result = await actions.listVMs();
      const data = result.success ? result.data : { error: result.error };
      return {
        contents: [
          { uri: uri.href, text: JSON.stringify(data, null, 2), mimeType: "application/json" },
        ],
      };
    }
  );

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
