/** Proxmox API response wrapper */
export interface ProxmoxResponse<T> {
  data: T;
}

/** Node summary from GET /api2/json/nodes */
export interface ProxmoxNode {
  node: string;
  status: "online" | "offline" | "unknown";
  cpu: number;
  maxcpu: number;
  mem: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  uptime: number;
  ssl_fingerprint?: string;
  level?: string;
  id?: string;
  type?: string;
}

/** VM/CT summary from GET /api2/json/nodes/{node}/qemu or lxc */
export interface ProxmoxVM {
  vmid: number;
  name: string;
  status: "running" | "stopped" | "paused" | "suspended";
  type: "qemu" | "lxc";
  node: string;
  cpu: number;
  cpus: number;
  mem: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  uptime: number;
  netin: number;
  netout: number;
  pid?: number;
  template?: boolean;
}

/** Detailed VM status from GET /api2/json/nodes/{node}/qemu/{vmid}/status/current */
export interface ProxmoxVMStatus {
  vmid: number;
  name: string;
  status: "running" | "stopped" | "paused" | "suspended";
  qmpstatus?: string;
  cpu: number;
  cpus: number;
  mem: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  uptime: number;
  netin: number;
  netout: number;
  pid?: number;
  ha?: {
    managed: number;
  };
}

/** Node stats (rrddata) */
export interface ProxmoxNodeStats {
  cpu: number;
  memused: number;
  memtotal: number;
  swapused: number;
  swaptotal: number;
  rootused: number;
  roottotal: number;
  netin: number;
  netout: number;
  iowait: number;
  loadavg: number;
  time: number;
}

/** Syslog entry */
export interface ProxmoxLogEntry {
  n: number;
  t: string;
}

/** Task entry from the task log */
export interface ProxmoxTask {
  upid: string;
  node: string;
  pid: number;
  pstart: number;
  starttime: number;
  type: string;
  id?: string;
  user: string;
  status?: string;
  endtime?: number;
}

/** ISO image info */
export interface ProxmoxISO {
  volid: string;
  size: number;
  content: string;
  format: string;
}

/** Storage info */
export interface ProxmoxStorage {
  storage: string;
  type: string;
  content: string;
  enabled: number;
  active: number;
  avail: number;
  used: number;
  total: number;
}

/** VM creation options */
export interface CreateVMOptions {
  name: string;
  cores: number;
  memory: number; // in MB
  disk: number; // in GB
  iso?: string; // ISO volid
  node?: string; // defaults to first available node
  storage?: string; // defaults to local-lvm
}

/** Container template from aplinfo */
export interface ProxmoxTemplate {
  template: string;
  type: string;
  headline: string;
  package: string;
  section: string;
}

/** Container creation options */
export interface CreateCTOptions {
  name: string;
  cores: number;
  memory: number; // in MB
  disk: number; // in GB
  template: string; // template volid e.g. "local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst"
  password?: string;
  node?: string;
  storage?: string; // defaults to local-lvm
}

/** Action result wrapper */
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
