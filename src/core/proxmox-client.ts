import https from "node:https";
import { config } from "../config.js";
import type {
  ProxmoxResponse,
  ProxmoxNode,
  ProxmoxVM,
  ProxmoxVMStatus,
  ProxmoxNodeStats,
  ProxmoxLogEntry,
  ProxmoxTask,
  ProxmoxISO,
  ProxmoxStorage,
  ProxmoxTemplate,
  CreateVMOptions,
  CreateCTOptions,
} from "./types.js";

const agent = config.proxmox.allowSelfSignedCerts
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined;

const baseUrl = `https://${config.proxmox.host}:${config.proxmox.port}/api2/json`;

const headers: Record<string, string> = {
  Authorization: `PVEAPIToken=${config.proxmox.tokenId}=${config.proxmox.tokenSecret}`,
};

async function request<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const response = await nodeFetch(url, method, headers, body);
  return response as T;
}

function nodeFetch(
  url: string,
  method: string,
  reqHeaders: Record<string, string>,
  body?: Record<string, unknown>
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = body ? JSON.stringify(body) : undefined;

    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        ...reqHeaders,
        "Content-Type": "application/json",
        ...(postData ? { "Content-Length": Buffer.byteLength(postData) } : {}),
      },
      rejectUnauthorized: !config.proxmox.allowSelfSignedCerts,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(
            new Error(
              `Proxmox API error ${res.statusCode}: ${data.substring(0, 200)}`
            )
          );
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Invalid JSON response: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on("error", (err) =>
      reject(new Error(`Proxmox connection failed: ${err.message}`))
    );

    if (postData) req.write(postData);
    req.end();
  });
}

export const proxmox = {
  /** List all nodes */
  async getNodes(): Promise<ProxmoxNode[]> {
    const res = await request<ProxmoxResponse<ProxmoxNode[]>>("GET", "/nodes");
    return res.data;
  },

  /** Get all VMs (QEMU) across all nodes */
  async getVMs(): Promise<ProxmoxVM[]> {
    const nodes = await this.getNodes();
    const vms: ProxmoxVM[] = [];

    for (const node of nodes) {
      try {
        const qemuRes = await request<ProxmoxResponse<ProxmoxVM[]>>(
          "GET",
          `/nodes/${node.node}/qemu`
        );
        for (const vm of qemuRes.data) {
          vms.push({ ...vm, node: node.node, type: "qemu" });
        }
      } catch {
        // Node might be offline
      }

      try {
        const lxcRes = await request<ProxmoxResponse<ProxmoxVM[]>>(
          "GET",
          `/nodes/${node.node}/lxc`
        );
        for (const ct of lxcRes.data) {
          vms.push({ ...ct, node: ct.node || node.node, type: "lxc" });
        }
      } catch {
        // Node might be offline
      }
    }

    return vms;
  },

  /** Get VM status by VMID (searches all nodes) */
  async getVMStatus(vmid: number): Promise<{ vm: ProxmoxVMStatus; node: string; type: "qemu" | "lxc" } | null> {
    const nodes = await this.getNodes();

    for (const node of nodes) {
      // Try QEMU first
      try {
        const res = await request<ProxmoxResponse<ProxmoxVMStatus>>(
          "GET",
          `/nodes/${node.node}/qemu/${vmid}/status/current`
        );
        return { vm: res.data, node: node.node, type: "qemu" };
      } catch {
        // Not found on this node as QEMU
      }

      // Try LXC
      try {
        const res = await request<ProxmoxResponse<ProxmoxVMStatus>>(
          "GET",
          `/nodes/${node.node}/lxc/${vmid}/status/current`
        );
        return { vm: res.data, node: node.node, type: "lxc" };
      } catch {
        // Not found on this node as LXC
      }
    }

    return null;
  },

  /** Start a VM/CT */
  async startVM(vmid: number): Promise<string> {
    const found = await this.getVMStatus(vmid);
    if (!found) throw new Error(`VM/CT ${vmid} not found`);

    const res = await request<ProxmoxResponse<string>>(
      "POST",
      `/nodes/${found.node}/${found.type}/${vmid}/status/start`
    );
    return res.data;
  },

  /** Stop a VM/CT */
  async stopVM(vmid: number): Promise<string> {
    const found = await this.getVMStatus(vmid);
    if (!found) throw new Error(`VM/CT ${vmid} not found`);

    const res = await request<ProxmoxResponse<string>>(
      "POST",
      `/nodes/${found.node}/${found.type}/${vmid}/status/stop`
    );
    return res.data;
  },

  /** Reboot a VM/CT */
  async rebootVM(vmid: number): Promise<string> {
    const found = await this.getVMStatus(vmid);
    if (!found) throw new Error(`VM/CT ${vmid} not found`);

    const res = await request<ProxmoxResponse<string>>(
      "POST",
      `/nodes/${found.node}/${found.type}/${vmid}/status/reboot`
    );
    return res.data;
  },

  /** Get node RRD stats */
  async getNodeStats(
    node: string,
    timeframe: "hour" | "day" | "week" = "hour"
  ): Promise<ProxmoxNodeStats[]> {
    const res = await request<ProxmoxResponse<ProxmoxNodeStats[]>>(
      "GET",
      `/nodes/${node}/rrddata?timeframe=${timeframe}`
    );
    return res.data;
  },

  /** Get syslog entries */
  async getNodeSyslog(
    node: string,
    limit: number = 50,
    start?: number
  ): Promise<ProxmoxLogEntry[]> {
    let path = `/nodes/${node}/syslog?limit=${limit}`;
    if (start !== undefined) path += `&start=${start}`;
    const res = await request<ProxmoxResponse<ProxmoxLogEntry[]>>("GET", path);
    return res.data;
  },

  /** Get recent tasks */
  async getTasks(node?: string, limit: number = 20): Promise<ProxmoxTask[]> {
    const path = node
      ? `/nodes/${node}/tasks?limit=${limit}`
      : `/cluster/tasks?limit=${limit}`;
    const res = await request<ProxmoxResponse<ProxmoxTask[]>>("GET", path);
    return res.data;
  },

  /** List available ISO images */
  async getISOs(node: string, storage: string = "local"): Promise<ProxmoxISO[]> {
    const res = await request<ProxmoxResponse<ProxmoxISO[]>>(
      "GET",
      `/nodes/${node}/storage/${storage}/content?content=iso`
    );
    return res.data;
  },

  /** List available storage */
  async getStorage(node: string): Promise<ProxmoxStorage[]> {
    const res = await request<ProxmoxResponse<ProxmoxStorage[]>>(
      "GET",
      `/nodes/${node}/storage`
    );
    return res.data;
  },

  /** Get next available VMID */
  async getNextVMID(): Promise<number> {
    const res = await request<ProxmoxResponse<string>>("GET", "/cluster/nextid");
    return parseInt(res.data, 10);
  },

  /** Create a new VM */
  async createVM(opts: CreateVMOptions): Promise<{ vmid: number; taskId: string }> {
    const nodes = await this.getNodes();
    const node = opts.node ?? nodes[0]?.node;
    if (!node) throw new Error("No available nodes");

    const vmid = await this.getNextVMID();
    const storage = opts.storage ?? "local-lvm";

    const body: Record<string, unknown> = {
      vmid,
      name: opts.name,
      cores: opts.cores,
      memory: opts.memory,
      ostype: "l26", // Linux 2.6+ kernel
      scsihw: "virtio-scsi-single",
      scsi0: `${storage}:${opts.disk},iothread=1`,
      net0: "virtio,bridge=vmbr0",
      boot: "order=scsi0;ide2;net0",
    };

    if (opts.iso) {
      body.ide2 = `${opts.iso},media=cdrom`;
      body.boot = "order=ide2;scsi0;net0";
    }

    const res = await request<ProxmoxResponse<string>>(
      "POST",
      `/nodes/${node}/qemu`,
      body
    );

    return { vmid, taskId: res.data };
  },

  /** List available container templates from Proxmox appliance index */
  async getAvailableTemplates(node: string): Promise<ProxmoxTemplate[]> {
    const res = await request<ProxmoxResponse<ProxmoxTemplate[]>>(
      "GET",
      `/nodes/${node}/aplinfo`
    );
    return res.data.filter((t) => t.type === "lxc");
  },

  /** List downloaded container templates */
  async getDownloadedTemplates(node: string, storage: string = "local"): Promise<ProxmoxISO[]> {
    const res = await request<ProxmoxResponse<ProxmoxISO[]>>(
      "GET",
      `/nodes/${node}/storage/${storage}/content?content=vztmpl`
    );
    return res.data;
  },

  /** Download a container template */
  async downloadTemplate(node: string, storage: string, template: string): Promise<string> {
    const res = await request<ProxmoxResponse<string>>(
      "POST",
      `/nodes/${node}/aplinfo`,
      { storage, template }
    );
    return res.data;
  },

  /** Create a new LXC container */
  async createCT(opts: CreateCTOptions): Promise<{ vmid: number; taskId: string }> {
    const nodes = await this.getNodes();
    const node = opts.node ?? nodes[0]?.node;
    if (!node) throw new Error("No available nodes");

    const vmid = await this.getNextVMID();
    const storage = opts.storage ?? "local-lvm";

    const body: Record<string, unknown> = {
      vmid,
      hostname: opts.name,
      ostemplate: opts.template,
      cores: opts.cores,
      memory: opts.memory,
      swap: 512,
      rootfs: `${storage}:${opts.disk}`,
      net0: "name=eth0,bridge=vmbr0,ip=dhcp",
      unprivileged: 1,
      start: 0,
    };

    if (opts.password) {
      body.password = opts.password;
    }

    const res = await request<ProxmoxResponse<string>>(
      "POST",
      `/nodes/${node}/lxc`,
      body
    );

    return { vmid, taskId: res.data };
  },
};
