import { config } from "../config.js";
import * as actions from "../core/actions.js";
import * as fmt from "./formatter.js";

const SYSTEM_PROMPT = `You are a homelab assistant that interprets natural language commands about Proxmox infrastructure.
Your job is to figure out what the user wants to do and return a JSON action.

Available actions:
- list_vms: List all virtual machines and containers. No parameters.
- get_vm_status: Get status of a specific VM. Parameters: { "vmid": <number> }
- list_nodes: List all cluster nodes. No parameters.
- get_node_stats: Get statistics for a node. Parameters: { "node": "<name>", "timeframe": "hour"|"day"|"week" }
- start_vm: Start a VM/container. Parameters: { "vmid": <number> }
- stop_vm: Stop a VM/container. Parameters: { "vmid": <number> }
- restart_vm: Restart/reboot a VM/container. Parameters: { "vmid": <number> }
- search_logs: Search syslog on a node. Parameters: { "node": "<name>", "query": "<text>", "limit": <number> }
- create_vm: Create a new virtual machine (QEMU). Parameters: { "name": "<vm-name>" }
- create_ct: Create a new LXC container. Parameters: { "name": "<container-name>" }
- list_isos: List available ISO images. No parameters.

Respond with ONLY a valid JSON object, no markdown, no backticks, no explanation:
{ "action": "<action_name>", "params": { ... } }

If you cannot determine the intent, respond with:
{ "action": "unknown", "params": {} }

Be flexible with user input — handle typos, casual language, abbreviations.

Examples:
- "show me all VMs" -> { "action": "list_vms", "params": {} }
- "whats running" -> { "action": "list_vms", "params": {} }
- "show vms" -> { "action": "list_vms", "params": {} }
- "list everything" -> { "action": "list_vms", "params": {} }
- "what's the status of VM 101?" -> { "action": "get_vm_status", "params": { "vmid": 101 } }
- "how is 100 doing" -> { "action": "get_vm_status", "params": { "vmid": 100 } }
- "how is node pve doing?" -> { "action": "get_node_stats", "params": { "node": "pve" } }
- "node stats" -> { "action": "list_nodes", "params": {} }
- "start container 200" -> { "action": "start_vm", "params": { "vmid": 200 } }
- "boot up 101" -> { "action": "start_vm", "params": { "vmid": 101 } }
- "turn on vm 100" -> { "action": "start_vm", "params": { "vmid": 100 } }
- "stop 101" -> { "action": "stop_vm", "params": { "vmid": 101 } }
- "shut down 100" -> { "action": "stop_vm", "params": { "vmid": 100 } }
- "kill vm 101" -> { "action": "stop_vm", "params": { "vmid": 101 } }
- "restart 100" -> { "action": "restart_vm", "params": { "vmid": 100 } }
- "reboot vm 101" -> { "action": "restart_vm", "params": { "vmid": 101 } }
- "reboot devlab" -> { "action": "restart_vm", "params": { "vmid": 100 } }
- "check logs on node1 for errors" -> { "action": "search_logs", "params": { "node": "node1", "query": "error" } }
- "what nodes do I have?" -> { "action": "list_nodes", "params": {} }
- "cluster status" -> { "action": "list_nodes", "params": {} }
- "spin up a VM called webserver" -> { "action": "create_vm", "params": { "name": "webserver" } }
- "make a new vm named testbox" -> { "action": "create_vm", "params": { "name": "testbox" } }
- "create a container called nginx" -> { "action": "create_ct", "params": { "name": "nginx" } }
- "new container redis" -> { "action": "create_ct", "params": { "name": "redis" } }
- "what ISOs do I have?" -> { "action": "list_isos", "params": {} }
- "show isos" -> { "action": "list_isos", "params": {} }
- "hi" -> { "action": "unknown", "params": {} }
- "hello" -> { "action": "unknown", "params": {} }`;

interface ParsedIntent {
  action: string;
  params: Record<string, unknown>;
}

async function callAI(message: string): Promise<ParsedIntent> {
  const provider = config.ai?.provider ?? "openai";
  const apiKey = config.ai?.apiKey;

  if (!apiKey) {
    throw new Error("AI_API_KEY not configured");
  }

  if (provider === "anthropic") {
    return callAnthropic(message, apiKey);
  }
  return callOpenAI(message, apiKey);
}

async function callOpenAI(message: string, apiKey: string): Promise<ParsedIntent> {
  const model = config.ai?.model ?? "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
      temperature: 0,
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${body.substring(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from OpenAI");

  return parseJSON(content);
}

async function callAnthropic(message: string, apiKey: string): Promise<ParsedIntent> {
  const model = config.ai?.model ?? "claude-haiku-4-5-20251001";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${body.substring(0, 200)}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  const content = data.content.find((c) => c.type === "text")?.text?.trim();
  if (!content) throw new Error("Empty response from Anthropic");

  return parseJSON(content);
}

/** Parse JSON from AI response, handling markdown code blocks */
function parseJSON(text: string): ParsedIntent {
  // Strip markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  // Strip any leading/trailing non-JSON text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON found in response: ${text.substring(0, 100)}`);
  }
  return JSON.parse(jsonMatch[0]) as ParsedIntent;
}

/** Process a natural language message and return a formatted response */
export async function processNaturalLanguage(message: string): Promise<string> {
  console.log(`[nl] Processing: "${message}"`);
  let intent: ParsedIntent;

  try {
    intent = await callAI(message);
    console.log(`[nl] Intent: ${JSON.stringify(intent)}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "AI error";
    console.error(`[nl] AI error: ${errMsg}`);
    return `Couldn't understand that. Try a command like /vms or /help.\n(${errMsg})`;
  }

  if (intent.action === "unknown") {
    return "I'm not sure what you're asking. Try /help to see available commands, or be more specific about what you'd like to do with your homelab.";
  }

  try {
    return await executeIntent(intent);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[nl] Action error: ${errMsg}`);
    return `Action failed: ${errMsg}`;
  }
}

async function executeIntent(intent: ParsedIntent): Promise<string> {
  const { action, params } = intent;

  switch (action) {
    case "list_vms": {
      const result = await actions.listVMs();
      return result.success ? fmt.formatVMList(result.data!) : fmt.formatError(result.error!);
    }
    case "get_vm_status": {
      const vmid = Number(params.vmid);
      if (isNaN(vmid)) return "Which VM? Give me a VMID number, e.g. 'status of 100'";
      const result = await actions.getVMStatus(vmid);
      return result.success ? fmt.formatVMStatus(result.data!) : fmt.formatError(result.error!);
    }
    case "list_nodes": {
      const result = await actions.listNodes();
      return result.success ? fmt.formatNodeList(result.data!) : fmt.formatError(result.error!);
    }
    case "get_node_stats": {
      const node = String(params.node ?? "");
      const timeframe = (params.timeframe as "hour" | "day" | "week") ?? "hour";
      const result = await actions.getNodeStats(node, timeframe);
      return result.success
        ? fmt.formatNodeStats(result.data!.node, result.data!.stats)
        : fmt.formatError(result.error!);
    }
    case "start_vm": {
      const vmid = Number(params.vmid);
      if (isNaN(vmid)) return "Which VM? Give me a VMID number, e.g. 'start 101'";
      return `To start VM ${vmid}, use /start ${vmid} (confirmation required).`;
    }
    case "stop_vm": {
      const vmid = Number(params.vmid);
      if (isNaN(vmid)) return "Which VM? Give me a VMID number, e.g. 'stop 101'";
      return `To stop VM ${vmid}, use /stop ${vmid} (confirmation required).`;
    }
    case "restart_vm": {
      const vmid = Number(params.vmid);
      if (isNaN(vmid)) return "Which VM? Give me a VMID number, e.g. 'restart 100'";
      return `To restart VM ${vmid}, use /restart ${vmid} (confirmation required).`;
    }
    case "search_logs": {
      const node = String(params.node ?? "");
      const query = params.query ? String(params.query) : undefined;
      const limit = params.limit ? Number(params.limit) : 50;
      const result = await actions.searchLogs(node, query, limit);
      return result.success ? fmt.formatLogs(result.data!, query) : fmt.formatError(result.error!);
    }
    case "create_vm": {
      const name = String(params.name ?? "").replace(/[^a-zA-Z0-9\-_.]/g, "");
      if (!name) return "What would you like to name the VM? Use /create <name> to get started.";
      return `To create VM "${name}", use /create ${name} \u2014 it'll walk you through picking an ISO and size.`;
    }
    case "create_ct": {
      const name = String(params.name ?? "").replace(/[^a-zA-Z0-9\-_.]/g, "");
      if (!name) return "What would you like to name the container? Use /container <name> to get started.";
      return `To create container "${name}", use /container ${name} \u2014 it'll walk you through picking a template and size.`;
    }
    case "list_isos": {
      const result = await actions.listISOs();
      if (!result.success) return fmt.formatError(result.error!);
      if (result.data!.length === 0) return "No ISO images found on your Proxmox storage.";
      const lines = result.data!.map((iso) => {
        const filename = iso.volid.split("/").pop() ?? iso.volid;
        const sizeMB = (iso.size / 1024 / 1024).toFixed(0);
        return `\u{1F4BF} ${filename} (${sizeMB} MB)`;
      });
      return `Available ISOs:\n\n${lines.join("\n")}`;
    }
    default:
      return `I understood you want to "${action}" but I'm not sure how to do that. Try /help.`;
  }
}
