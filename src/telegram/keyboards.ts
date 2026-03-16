import { InlineKeyboard } from "grammy";
import type { ProxmoxISO } from "../core/types.js";

/** Create a confirmation keyboard for starting a VM */
export function startConfirmKeyboard(vmid: number, vmName?: string): InlineKeyboard {
  const label = vmName ? `${vmName} (${vmid})` : `VM ${vmid}`;
  return new InlineKeyboard()
    .text(`\u2705 Yes, start ${label}`, `confirm_start_${vmid}`)
    .text("\u274C Cancel", `cancel_action`);
}

/** Create a confirmation keyboard for stopping a VM */
export function stopConfirmKeyboard(vmid: number, vmName?: string): InlineKeyboard {
  const label = vmName ? `${vmName} (${vmid})` : `VM ${vmid}`;
  return new InlineKeyboard()
    .text(`\u{1F6D1} Yes, stop ${label}`, `confirm_stop_${vmid}`)
    .text("\u274C Cancel", `cancel_action`);
}

/** Create a confirmation keyboard for restarting a VM */
export function restartConfirmKeyboard(vmid: number, vmName?: string): InlineKeyboard {
  const label = vmName ? `${vmName} (${vmid})` : `VM ${vmid}`;
  return new InlineKeyboard()
    .text(`\u{1F504} Yes, restart ${label}`, `confirm_restart_${vmid}`)
    .text("\u274C Cancel", `cancel_action`);
}

/** Size presets for VM creation */
export const VM_PRESETS = {
  small: { cores: 2, memory: 2048, disk: 20, label: "Small (2 CPU, 2GB RAM, 20GB)" },
  medium: { cores: 4, memory: 4096, disk: 50, label: "Medium (4 CPU, 4GB RAM, 50GB)" },
  large: { cores: 8, memory: 8192, disk: 100, label: "Large (8 CPU, 8GB RAM, 100GB)" },
} as const;

/** Keyboard for choosing VM size */
export function createVMSizeKeyboard(name: string, iso: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  kb.text(`\u{1F7E2} ${VM_PRESETS.small.label}`, `create_size_small_${name}_${iso}`).row();
  kb.text(`\u{1F7E1} ${VM_PRESETS.medium.label}`, `create_size_medium_${name}_${iso}`).row();
  kb.text(`\u{1F534} ${VM_PRESETS.large.label}`, `create_size_large_${name}_${iso}`).row();
  kb.text("\u274C Cancel", "cancel_action");
  return kb;
}

/** Keyboard for choosing ISO */
export function createVMISOKeyboard(name: string, isos: ProxmoxISO[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const iso of isos) {
    const filename = iso.volid.split("/").pop() ?? iso.volid;
    // Shorten display name
    const display = filename.replace(".iso", "").substring(0, 40);
    kb.text(`\u{1F4BF} ${display}`, `create_iso_${name}_${iso.volid}`).row();
  }
  kb.text("\u{1F6AB} No ISO (blank disk)", `create_iso_${name}_none`).row();
  kb.text("\u274C Cancel", "cancel_action");
  return kb;
}

/** Confirmation keyboard for VM creation */
export function createVMConfirmKeyboard(name: string, size: string, iso: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("\u2705 Create it!", `confirm_create_${name}_${size}_${iso}`)
    .text("\u274C Cancel", "cancel_action");
}

/** Size presets for containers (lighter than VMs) */
export const CT_PRESETS = {
  small: { cores: 1, memory: 512, disk: 8, label: "Small (1 CPU, 512MB RAM, 8GB)" },
  medium: { cores: 2, memory: 2048, disk: 16, label: "Medium (2 CPU, 2GB RAM, 16GB)" },
  large: { cores: 4, memory: 4096, disk: 32, label: "Large (4 CPU, 4GB RAM, 32GB)" },
} as const;

/** Popular container templates for quick picking */
export const POPULAR_TEMPLATES = [
  { name: "Ubuntu 24.04", template: "ubuntu-24.04-standard_24.04-2_amd64.tar.zst" },
  { name: "Ubuntu 22.04", template: "ubuntu-22.04-standard_22.04-1_amd64.tar.zst" },
  { name: "Debian 12", template: "debian-12-standard_12.12-1_amd64.tar.zst" },
  { name: "Debian 13", template: "debian-13-standard_13.1-2_amd64.tar.zst" },
  { name: "Alpine 3.23", template: "alpine-3.23-default_20260116_amd64.tar.xz" },
  { name: "Fedora 43", template: "fedora-43-default_20260115_amd64.tar.xz" },
  { name: "Rocky Linux 9", template: "rockylinux-9-default_20240912_amd64.tar.xz" },
  { name: "AlmaLinux 9", template: "almalinux-9-default_20240911_amd64.tar.xz" },
] as const;

/** Keyboard for choosing container template */
export function createCTTemplateKeyboard(name: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const t of POPULAR_TEMPLATES) {
    kb.text(`\u{1F4E6} ${t.name}`, `ct_tpl_${name}_${t.template}`).row();
  }
  kb.text("\u274C Cancel", "cancel_action");
  return kb;
}

/** Keyboard for choosing container size */
export function createCTSizeKeyboard(name: string, template: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  kb.text(`\u{1F7E2} ${CT_PRESETS.small.label}`, `ct_size_small_${name}_${template}`).row();
  kb.text(`\u{1F7E1} ${CT_PRESETS.medium.label}`, `ct_size_medium_${name}_${template}`).row();
  kb.text(`\u{1F534} ${CT_PRESETS.large.label}`, `ct_size_large_${name}_${template}`).row();
  kb.text("\u274C Cancel", "cancel_action");
  return kb;
}

/** Confirmation keyboard for container creation */
export function createCTConfirmKeyboard(name: string, size: string, template: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("\u2705 Create it!", `confirm_ct_${name}_${size}_${template}`)
    .text("\u274C Cancel", "cancel_action");
}
