import http from "node:http";
import { config } from "../config.js";
import { listNodes, listVMs, getNodeStats, getVMStatus } from "../core/actions.js";
import { proxmox } from "../core/proxmox-client.js";
import { getDashboardHTML } from "./template.js";

const PORT = config.dashboard?.port ?? 3000;

function json(res: http.ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function html(res: http.ServerResponse, body: string): void {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

async function handleAPI(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<boolean> {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path === "/api/cluster") {
    const [nodesResult, vmsResult] = await Promise.all([listNodes(), listVMs()]);
    json(res, { nodes: nodesResult, vms: vmsResult });
    return true;
  }

  if (path === "/api/nodes") {
    const result = await listNodes();
    json(res, result);
    return true;
  }

  if (path.startsWith("/api/nodes/") && path.endsWith("/stats")) {
    const nodeName = path.split("/")[3];
    const timeframe = (url.searchParams.get("timeframe") as "hour" | "day" | "week") ?? "hour";
    const result = await getNodeStats(nodeName, timeframe);
    json(res, result);
    return true;
  }

  if (path.startsWith("/api/nodes/") && path.endsWith("/stats/history")) {
    const nodeName = path.split("/")[3];
    const timeframe = (url.searchParams.get("timeframe") as "hour" | "day" | "week") ?? "hour";
    try {
      const stats = await proxmox.getNodeStats(nodeName, timeframe);
      json(res, { success: true, data: stats });
    } catch (err) {
      json(res, { success: false, error: String(err) }, 500);
    }
    return true;
  }

  if (path === "/api/vms") {
    const result = await listVMs();
    json(res, result);
    return true;
  }

  if (path.startsWith("/api/vms/")) {
    const vmid = parseInt(path.split("/")[3], 10);
    if (!isNaN(vmid)) {
      const result = await getVMStatus(vmid);
      json(res, result);
      return true;
    }
  }

  if (path === "/api/tasks") {
    try {
      const tasks = await proxmox.getTasks(undefined, 30);
      json(res, { success: true, data: tasks });
    } catch (err) {
      json(res, { success: false, error: String(err) }, 500);
    }
    return true;
  }

  if (path === "/api/storage") {
    try {
      const nodes = await proxmox.getNodes();
      const node = nodes[0]?.node;
      if (!node) {
        json(res, { success: false, error: "No nodes available" }, 500);
        return true;
      }
      const storage = await proxmox.getStorage(node);
      json(res, { success: true, data: storage });
    } catch (err) {
      json(res, { success: false, error: String(err) }, 500);
    }
    return true;
  }

  return false;
}

export async function startDashboard(): Promise<void> {
  const server = http.createServer(async (req, res) => {
    try {
      const handled = await handleAPI(req, res);
      if (handled) return;

      // Serve dashboard HTML for all non-API routes
      const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
      if (url.pathname === "/" || url.pathname === "/index.html") {
        html(res, getDashboardHTML());
        return;
      }

      // 404
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    } catch (err) {
      console.error("[dashboard] Request error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });

  server.listen(PORT, () => {
    console.log(`[homelab-mcp] Dashboard running at http://localhost:${PORT}`);
  });
}
