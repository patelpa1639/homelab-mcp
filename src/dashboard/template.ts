export function getDashboardHTML(): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Homelab</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg-base: #09090b;
  --bg-raised: #111113;
  --bg-surface: #18181b;
  --bg-hover: #1f1f23;
  --bg-active: #27272a;
  --border-subtle: rgba(255,255,255,0.04);
  --border-default: rgba(255,255,255,0.07);
  --border-hover: rgba(255,255,255,0.12);
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-tertiary: #52525b;
  --text-quaternary: #3f3f46;
  --indigo: #818cf8;
  --indigo-bright: #a5b4fc;
  --indigo-dim: rgba(129,140,248,0.12);
  --indigo-glow: rgba(129,140,248,0.25);
  --emerald: #34d399;
  --emerald-dim: rgba(52,211,153,0.12);
  --emerald-glow: rgba(52,211,153,0.3);
  --rose: #fb7185;
  --rose-dim: rgba(251,113,133,0.12);
  --amber: #fbbf24;
  --amber-dim: rgba(251,191,36,0.12);
  --sky: #38bdf8;
  --sky-dim: rgba(56,189,248,0.12);
  --violet: #a78bfa;
  --violet-dim: rgba(167,139,250,0.12);
  --r: 14px;
  --r-sm: 10px;
  --r-xs: 6px;
  --font: 'Inter', -apple-system, system-ui, sans-serif;
  --mono: 'JetBrains Mono', monospace;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

html { font-size: 14px; }
body {
  font-family: var(--font);
  background: var(--bg-base);
  color: var(--text-secondary);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Layout ─────────────────────────────────────────── */
.shell { display: flex; min-height: 100vh; }

/* ── Sidebar ────────────────────────────────────────── */
.sidebar {
  width: 240px;
  border-right: 1px solid var(--border-subtle);
  background: var(--bg-base);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 50;
}
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px;
  margin-bottom: 32px;
}
.sidebar-logo {
  width: 34px; height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--indigo), #6366f1);
  display: grid; place-items: center;
  box-shadow: 0 0 20px var(--indigo-glow), inset 0 1px 0 rgba(255,255,255,0.15);
}
.sidebar-logo svg { width: 18px; height: 18px; color: #fff; }
.sidebar-title { font-size: 15px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.3px; }
.sidebar-subtitle { font-size: 11px; color: var(--text-tertiary); margin-top: 1px; }

.sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.nav-label { font-size: 10px; font-weight: 600; color: var(--text-quaternary); text-transform: uppercase; letter-spacing: 1px; padding: 16px 8px 6px; }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px;
  border-radius: var(--r-sm);
  font-size: 13px; font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s var(--ease);
  border: 1px solid transparent;
}
.nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
.nav-item.active {
  background: var(--indigo-dim);
  color: var(--indigo-bright);
  border-color: rgba(129,140,248,0.08);
}
.nav-item svg { width: 16px; height: 16px; opacity: 0.6; flex-shrink: 0; }
.nav-item.active svg { opacity: 1; }

.sidebar-footer {
  border-top: 1px solid var(--border-subtle);
  padding-top: 16px;
  margin-top: 16px;
}
.sidebar-status {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px;
  border-radius: var(--r-sm);
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
}
.status-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--emerald);
  box-shadow: 0 0 8px var(--emerald-glow);
  animation: statusPulse 3s ease-in-out infinite;
}
.status-dot.offline { background: var(--rose); box-shadow: none; animation: none; }
@keyframes statusPulse {
  0%,100% { opacity: 1; } 50% { opacity: 0.4; }
}
.status-text { font-size: 12px; color: var(--text-secondary); }
.status-time { font-size: 11px; color: var(--text-tertiary); margin-left: auto; }

/* ── Main ───────────────────────────────────────────── */
.main { flex: 1; margin-left: 240px; padding: 28px 32px; }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}
.page-title { font-size: 20px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.5px; }
.page-desc { font-size: 13px; color: var(--text-tertiary); margin-top: 2px; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 12px;
  border-radius: 99px;
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.2px;
}
.badge-green { background: var(--emerald-dim); color: var(--emerald); }
.badge-amber { background: var(--amber-dim); color: var(--amber); }
.badge-rose { background: var(--rose-dim); color: var(--rose); }

/* ── Stat Cards ─────────────────────────────────────── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}
.stat-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r);
  padding: 20px;
  position: relative;
  overflow: hidden;
  transition: all 0.25s var(--ease);
}
.stat-card:hover { border-color: var(--border-hover); transform: translateY(-1px); }
.stat-card::before {
  content: '';
  position: absolute;
  top: 0; left: 20px; right: 20px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
}
.stat-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.stat-label { font-size: 12px; font-weight: 500; color: var(--text-tertiary); }
.stat-icon-wrap {
  width: 32px; height: 32px;
  border-radius: 8px;
  display: grid; place-items: center;
}
.stat-icon-wrap svg { width: 16px; height: 16px; }
.stat-icon-wrap.cpu { background: var(--indigo-dim); color: var(--indigo); }
.stat-icon-wrap.mem { background: var(--emerald-dim); color: var(--emerald); }
.stat-icon-wrap.disk { background: var(--sky-dim); color: var(--sky); }
.stat-icon-wrap.vm { background: var(--amber-dim); color: var(--amber); }
.stat-val {
  font-size: 30px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -1.5px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.stat-unit { font-size: 14px; font-weight: 500; color: var(--text-tertiary); margin-left: 2px; }
.stat-detail { font-size: 12px; color: var(--text-tertiary); margin-top: 8px; font-variant-numeric: tabular-nums; }
.stat-bar { height: 3px; background: var(--bg-active); border-radius: 99px; margin-top: 14px; overflow: hidden; }
.stat-bar-fill { height: 100%; border-radius: 99px; transition: width 1.2s var(--ease-out); }

/* ── Section ────────────────────────────────────────── */
.section { margin-bottom: 24px; }
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.section-title {
  font-size: 14px; font-weight: 600; color: var(--text-primary);
  display: flex; align-items: center; gap: 8px;
}
.section-count {
  font-size: 11px; font-weight: 500; color: var(--text-tertiary);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  padding: 1px 8px;
  border-radius: 99px;
}

/* ── Node Cards ─────────────────────────────────────── */
.node-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 14px; }
.node-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r);
  padding: 22px;
  transition: all 0.25s var(--ease);
  position: relative;
}
.node-card:hover { border-color: var(--border-hover); }
.node-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.node-card-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.node-card-meta { font-size: 12px; color: var(--text-tertiary); margin-top: 3px; display: flex; align-items: center; gap: 6px; }
.node-card-status {
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.node-card-status.online { background: var(--emerald-dim); color: var(--emerald); }
.node-card-status.offline { background: var(--rose-dim); color: var(--rose); }

.node-gauges { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.gauge-block { text-align: center; }
.gauge-title { font-size: 11px; font-weight: 500; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
.gauge-svg-wrap { position: relative; width: 90px; height: 90px; margin: 0 auto 6px; }
.gauge-svg-wrap svg { width: 90px; height: 90px; transform: rotate(-90deg); }
.gauge-svg-wrap circle { fill: none; stroke-linecap: round; }
.gauge-svg-wrap .track { stroke: var(--bg-active); stroke-width: 6; }
.gauge-svg-wrap .value { stroke-width: 6; transition: stroke-dashoffset 1.5s var(--ease-out), stroke 0.6s var(--ease); filter: drop-shadow(0 0 4px var(--gauge-glow, transparent)); }
.gauge-pct {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%,-50%);
  font-size: 18px; font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.gauge-pct-unit { font-size: 11px; font-weight: 500; color: var(--text-tertiary); }
.gauge-sub { font-size: 11px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }

/* ── VM Cards Grid ──────────────────────────────────── */
.vm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 12px; }
.vm-card {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r);
  padding: 18px 20px;
  transition: all 0.25s var(--ease);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.vm-card:hover { border-color: var(--border-hover); background: var(--bg-surface); }
.vm-card-top { display: flex; align-items: flex-start; justify-content: space-between; }
.vm-card-name { font-size: 14px; font-weight: 600; color: var(--text-primary); line-height: 1.3; }
.vm-card-id { font-family: var(--mono); font-size: 11px; color: var(--text-quaternary); margin-top: 2px; }
.vm-card-badges { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
.vm-badge {
  padding: 3px 8px;
  border-radius: var(--r-xs);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.vm-badge.qemu { background: var(--indigo-dim); color: var(--indigo); }
.vm-badge.lxc { background: var(--violet-dim); color: var(--violet); }
.vm-status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px;
  border-radius: 99px;
  font-size: 10px; font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.vm-status-pill.running { background: var(--emerald-dim); color: var(--emerald); }
.vm-status-pill.stopped { background: var(--bg-active); color: var(--text-tertiary); }
.vm-status-pill.paused { background: var(--amber-dim); color: var(--amber); }
.vm-sdot {
  width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
}
.vm-status-pill.running .vm-sdot { background: var(--emerald); box-shadow: 0 0 6px var(--emerald-glow); }
.vm-status-pill.stopped .vm-sdot { background: var(--text-quaternary); }
.vm-status-pill.paused .vm-sdot { background: var(--amber); }

.vm-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.vm-metric {}
.vm-metric-label { font-size: 10px; color: var(--text-quaternary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
.vm-metric-bar { height: 3px; background: var(--bg-active); border-radius: 99px; overflow: hidden; margin-bottom: 3px; }
.vm-metric-bar-fill { height: 100%; border-radius: 99px; transition: width 1s var(--ease-out); min-width: 1px; }
.vm-metric-val { font-size: 11px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }

.vm-card-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid var(--border-subtle);
  font-size: 11px;
  color: var(--text-quaternary);
}
.vm-card-footer-item { display: flex; align-items: center; gap: 4px; }
.vm-card-footer svg { width: 12px; height: 12px; opacity: 0.5; }

/* ── Bottom Panels ──────────────────────────────────── */
.panels-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.panel {
  background: var(--bg-raised);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r);
  overflow: hidden;
}
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border-subtle);
}
.panel-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.panel-body { padding: 4px 0; max-height: 340px; overflow-y: auto; }
.panel-body::-webkit-scrollbar { width: 4px; }
.panel-body::-webkit-scrollbar-track { background: transparent; }
.panel-body::-webkit-scrollbar-thumb { background: var(--bg-active); border-radius: 99px; }

.task-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 20px;
  transition: background 0.15s;
}
.task-row:hover { background: var(--bg-surface); }
.task-type-pill {
  font-family: var(--mono);
  font-size: 10px; font-weight: 500;
  padding: 3px 8px;
  border-radius: var(--r-xs);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--indigo);
  min-width: 64px;
  text-align: center;
}
.task-detail { flex: 1; min-width: 0; }
.task-detail-id { font-size: 12px; color: var(--text-secondary); }
.task-detail-user { font-size: 11px; color: var(--text-quaternary); }
.task-time { font-size: 11px; color: var(--text-quaternary); white-space: nowrap; }
.task-result {
  font-size: 10px; font-weight: 600;
  padding: 2px 8px;
  border-radius: 99px;
  white-space: nowrap;
}
.task-result.ok { background: var(--emerald-dim); color: var(--emerald); }
.task-result.err { background: var(--rose-dim); color: var(--rose); }
.task-result.run { background: var(--amber-dim); color: var(--amber); }

.storage-row {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 20px;
  transition: background 0.15s;
}
.storage-row:hover { background: var(--bg-surface); }
.storage-icon-wrap {
  width: 34px; height: 34px;
  border-radius: 8px;
  background: var(--sky-dim);
  display: grid; place-items: center;
  flex-shrink: 0;
}
.storage-icon-wrap svg { width: 16px; height: 16px; color: var(--sky); }
.storage-detail { flex: 1; min-width: 0; }
.storage-name { font-size: 13px; font-weight: 500; color: var(--text-primary); }
.storage-meta { font-size: 11px; color: var(--text-quaternary); margin-top: 1px; }
.storage-bar-wrap { margin-top: 8px; }
.storage-bar { height: 3px; background: var(--bg-active); border-radius: 99px; overflow: hidden; }
.storage-bar-fill { height: 100%; border-radius: 99px; transition: width 1s var(--ease-out); }
.storage-pct { font-size: 13px; font-weight: 600; color: var(--text-secondary); white-space: nowrap; margin-left: 12px; font-variant-numeric: tabular-nums; }

/* ── Loading ────────────────────────────────────────── */
.loading-wrap {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; flex-direction: column; gap: 20px;
}
.loading-spinner {
  width: 28px; height: 28px;
  border: 2.5px solid var(--bg-active);
  border-top-color: var(--indigo);
  border-radius: 50%;
  animation: lspin 0.7s linear infinite;
}
@keyframes lspin { to { transform: rotate(360deg); } }
.loading-label { font-size: 13px; color: var(--text-tertiary); }

.empty-state { text-align: center; padding: 40px 20px; color: var(--text-quaternary); font-size: 13px; }
.error-banner {
  background: var(--rose-dim);
  border: 1px solid rgba(251,113,133,0.15);
  border-radius: var(--r-sm);
  padding: 12px 16px;
  color: var(--rose);
  font-size: 13px;
  margin-bottom: 20px;
}

/* ── Anim ───────────────────────────────────────────── */
.enter { animation: enter 0.4s var(--ease-out) both; }
@keyframes enter { from { opacity: 0; transform: translateY(6px); } }

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 900px) {
  .sidebar { display: none; }
  .main { margin-left: 0; }
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .panels-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .main { padding: 20px 16px; }
  .stat-grid { grid-template-columns: 1fr 1fr; }
  .node-grid { grid-template-columns: 1fr; }
  .vm-grid { grid-template-columns: 1fr; }
  .vm-metrics { grid-template-columns: 1fr 1fr; }
}
</style>
</head>
<body>
<div id="root">
  <div class="loading-wrap">
    <div class="loading-spinner"></div>
    <div class="loading-label">Connecting to Proxmox</div>
  </div>
</div>

<script>
const S = { nodes:[], vms:[], tasks:[], storage:[], ts:null, err:null, view:'overview' };
const TICK = 10000;

/* ── Icons (inline SVG paths) ──────────────────────── */
const I = {
  server: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><circle cx="6" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="6" cy="18" r="1" fill="currentColor" stroke="none"/></svg>',
  cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg>',
  mem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 19v2M10 19v2M14 19v2M18 19v2"/><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M3 11h18"/></svg>',
  hdd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  network: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
};

/* ── Helpers ────────────────────────────────────────── */
function fb(b,d=1){if(!b&&b!==0)return'\\u2014';const u=['B','KB','MB','GB','TB'];let i=0,v=b;while(v>=1024&&i<u.length-1){v/=1024;i++;}return v.toFixed(d)+' '+u[i];}
function fu(s){if(!s)return'\\u2014';const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return d>0?d+'d '+h+'h':h>0?h+'h '+m+'m':m+'m';}
function pct(u,t){return t?Math.round(u/t*100):0;}
function gc(p){return p>=90?'var(--rose)':p>=70?'var(--amber)':'var(--emerald)';}
function gg(p){return p>=90?'rgba(251,113,133,0.4)':p>=70?'rgba(251,191,36,0.3)':'rgba(52,211,153,0.3)';}
function ta(ts){if(!ts)return'';const d=Math.floor((Date.now()-ts)/1000);return d<60?d+'s ago':d<3600?Math.floor(d/60)+'m ago':d<86400?Math.floor(d/3600)+'h ago':Math.floor(d/86400)+'d ago';}
function ft(e){if(!e)return'\\u2014';return new Date(e*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML;}

/* ── Ring Gauge SVG ─────────────────────────────────── */
function ring(p,color,glow){
  const r=38,c=2*Math.PI*r,off=c-(p/100)*c;
  return '<div class="gauge-svg-wrap" style="--gauge-glow:'+glow+'"><svg viewBox="0 0 90 90"><circle class="track" cx="45" cy="45" r="'+r+'"/><circle class="value" cx="45" cy="45" r="'+r+'" stroke="'+color+'" stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'"/></svg><div class="gauge-pct">'+p+'<span class="gauge-pct-unit">%</span></div></div>';
}

/* ── Data fetch ─────────────────────────────────────── */
async function load(){
  try{
    const[cl,tk,st]=await Promise.all([
      fetch('/api/cluster').then(r=>r.json()),
      fetch('/api/tasks').then(r=>r.json()),
      fetch('/api/storage').then(r=>r.json()),
    ]);
    S.nodes=cl.nodes?.data??[];
    S.vms=cl.vms?.data??[];
    S.tasks=tk?.data??[];
    S.storage=st?.data??[];
    S.ts=Date.now();
    S.err=null;
  }catch(e){S.err=e.message;}
  draw();
}

/* ── Render ─────────────────────────────────────────── */
function draw(){
  const root=document.getElementById('root');
  if(S.err&&!S.nodes.length){root.innerHTML='<div class="loading-wrap"><div class="error-banner">'+esc(S.err)+'</div></div>';return;}

  const ns=S.nodes,vs=S.vms,ts=S.tasks,st=S.storage;
  const totCpu=ns.reduce((a,n)=>a+(n.maxcpu||0),0);
  const useCpu=ns.reduce((a,n)=>a+((n.cpu||0)*(n.maxcpu||0)),0);
  const cpuP=totCpu?Math.round(useCpu/totCpu*100):0;
  const totMem=ns.reduce((a,n)=>a+(n.maxmem||0),0);
  const useMem=ns.reduce((a,n)=>a+(n.mem||0),0);
  const memP=totMem?Math.round(useMem/totMem*100):0;
  const totDsk=ns.reduce((a,n)=>a+(n.maxdisk||0),0);
  const useDsk=ns.reduce((a,n)=>a+(n.disk||0),0);
  const dskP=totDsk?Math.round(useDsk/totDsk*100):0;
  const runV=vs.filter(v=>v.status==='running').length;
  const online=ns.some(n=>n.status==='online');

  let h='<div class="shell">';

  /* ── Sidebar ── */
  h+='<nav class="sidebar">';
  h+='<div class="sidebar-brand"><div class="sidebar-logo">'+I.server+'</div><div><div class="sidebar-title">Homelab</div><div class="sidebar-subtitle">Proxmox Dashboard</div></div></div>';
  h+='<div class="sidebar-nav">';
  h+='<div class="nav-label">Monitor</div>';
  h+='<div class="nav-item active">'+I.home+' Overview</div>';
  h+='<div class="nav-item">'+I.server+' Nodes</div>';
  h+='<div class="nav-item">'+I.box+' Guests</div>';
  h+='<div class="nav-item">'+I.layers+' Storage</div>';
  h+='<div class="nav-label">System</div>';
  h+='<div class="nav-item">'+I.activity+' Tasks</div>';
  h+='<div class="nav-item">'+I.network+' Network</div>';
  h+='</div>';
  h+='<div class="sidebar-footer"><div class="sidebar-status"><div class="status-dot'+(online?'':' offline')+'"></div><div class="status-text">'+(online?'Connected':'Offline')+'</div><div class="status-time">'+(S.ts?ta(S.ts):'')+'</div></div></div>';
  h+='</nav>';

  /* ── Main ── */
  h+='<main class="main">';

  h+='<div class="page-header enter"><div><div class="page-title">Overview</div><div class="page-desc">Real-time cluster health at a glance</div></div>';
  h+='<div class="header-actions"><div class="badge badge-green">'+runV+' running</div>';
  if(vs.length-runV>0) h+='<div class="badge badge-amber">'+(vs.length-runV)+' stopped</div>';
  h+='</div></div>';

  /* ── Stat cards ── */
  h+='<div class="stat-grid enter" style="animation-delay:.05s">';

  h+='<div class="stat-card"><div class="stat-top"><div class="stat-label">CPU Usage</div><div class="stat-icon-wrap cpu">'+I.cpu+'</div></div>';
  h+='<div class="stat-val">'+cpuP+'<span class="stat-unit">%</span></div>';
  h+='<div class="stat-detail">'+useCpu.toFixed(1)+' / '+totCpu+' cores allocated</div>';
  h+='<div class="stat-bar"><div class="stat-bar-fill" style="width:'+cpuP+'%;background:'+gc(cpuP)+'"></div></div></div>';

  h+='<div class="stat-card"><div class="stat-top"><div class="stat-label">Memory</div><div class="stat-icon-wrap mem">'+I.mem+'</div></div>';
  h+='<div class="stat-val">'+memP+'<span class="stat-unit">%</span></div>';
  h+='<div class="stat-detail">'+fb(useMem)+' / '+fb(totMem)+'</div>';
  h+='<div class="stat-bar"><div class="stat-bar-fill" style="width:'+memP+'%;background:'+gc(memP)+'"></div></div></div>';

  h+='<div class="stat-card"><div class="stat-top"><div class="stat-label">Storage</div><div class="stat-icon-wrap disk">'+I.hdd+'</div></div>';
  h+='<div class="stat-val">'+dskP+'<span class="stat-unit">%</span></div>';
  h+='<div class="stat-detail">'+fb(useDsk)+' / '+fb(totDsk)+'</div>';
  h+='<div class="stat-bar"><div class="stat-bar-fill" style="width:'+dskP+'%;background:'+gc(dskP)+'"></div></div></div>';

  h+='<div class="stat-card"><div class="stat-top"><div class="stat-label">Guests</div><div class="stat-icon-wrap vm">'+I.box+'</div></div>';
  h+='<div class="stat-val">'+runV+'<span class="stat-unit"> / '+vs.length+'</span></div>';
  h+='<div class="stat-detail">'+vs.filter(v=>v.type==='qemu').length+' VMs, '+vs.filter(v=>v.type==='lxc').length+' containers</div>';
  h+='<div class="stat-bar"><div class="stat-bar-fill" style="width:'+(vs.length?Math.round(runV/vs.length*100):0)+'%;background:var(--emerald)"></div></div></div>';

  h+='</div>';

  /* ── Nodes ── */
  h+='<div class="section enter" style="animation-delay:.1s"><div class="section-header"><div class="section-title">Nodes <span class="section-count">'+ns.length+'</span></div></div>';
  h+='<div class="node-grid">';
  for(const n of ns){
    const cp=n.maxcpu?Math.round((n.cpu||0)*100):0;
    const mp=pct(n.mem,n.maxmem);
    const dp=pct(n.disk,n.maxdisk);
    h+='<div class="node-card"><div class="node-card-header"><div><div class="node-card-name">'+esc(n.node)+'</div>';
    h+='<div class="node-card-meta">'+I.clock+' '+(n.uptime?fu(n.uptime):'down')+' &middot; '+(n.maxcpu||0)+' cores</div></div>';
    h+='<div class="node-card-status '+n.status+'">'+n.status+'</div></div>';
    h+='<div class="node-gauges">';
    h+='<div class="gauge-block"><div class="gauge-title">CPU</div>'+ring(cp,gc(cp),gg(cp))+'<div class="gauge-sub">'+(n.maxcpu||0)+' cores</div></div>';
    h+='<div class="gauge-block"><div class="gauge-title">Memory</div>'+ring(mp,gc(mp),gg(mp))+'<div class="gauge-sub">'+fb(n.mem)+' / '+fb(n.maxmem)+'</div></div>';
    h+='<div class="gauge-block"><div class="gauge-title">Disk</div>'+ring(dp,gc(dp),gg(dp))+'<div class="gauge-sub">'+fb(n.disk)+' / '+fb(n.maxdisk)+'</div></div>';
    h+='</div></div>';
  }
  h+='</div></div>';

  /* ── VMs ── */
  h+='<div class="section enter" style="animation-delay:.15s"><div class="section-header"><div class="section-title">Guests <span class="section-count">'+vs.length+'</span></div></div>';
  h+='<div class="vm-grid">';
  const sorted=[...vs].sort((a,b)=>{if(a.status==='running'&&b.status!=='running')return -1;if(a.status!=='running'&&b.status==='running')return 1;return(a.name||'').localeCompare(b.name||'');});
  for(const v of sorted){
    const cp=v.status==='running'?Math.round((v.cpu||0)*100):0;
    const mp=pct(v.mem,v.maxmem);
    const dp=pct(v.disk,v.maxdisk);
    h+='<div class="vm-card">';
    h+='<div class="vm-card-top"><div><div class="vm-card-name">'+esc(v.name||'unnamed')+'</div><div class="vm-card-id">ID '+v.vmid+'</div></div>';
    h+='<div class="vm-card-badges"><span class="vm-badge '+v.type+'">'+v.type+'</span>';
    h+='<span class="vm-status-pill '+v.status+'"><span class="vm-sdot"></span>'+v.status+'</span></div></div>';
    h+='<div class="vm-metrics">';
    h+='<div class="vm-metric"><div class="vm-metric-label">CPU</div><div class="vm-metric-bar"><div class="vm-metric-bar-fill" style="width:'+Math.max(cp,1)+'%;background:'+gc(cp)+'"></div></div><div class="vm-metric-val">'+cp+'% of '+(v.cpus||'?')+' cores</div></div>';
    h+='<div class="vm-metric"><div class="vm-metric-label">Memory</div><div class="vm-metric-bar"><div class="vm-metric-bar-fill" style="width:'+Math.max(mp,1)+'%;background:'+gc(mp)+'"></div></div><div class="vm-metric-val">'+fb(v.mem)+' / '+fb(v.maxmem)+'</div></div>';
    h+='<div class="vm-metric"><div class="vm-metric-label">Disk</div><div class="vm-metric-bar"><div class="vm-metric-bar-fill" style="width:'+Math.max(dp,1)+'%;background:'+gc(dp)+'"></div></div><div class="vm-metric-val">'+fb(v.disk)+' / '+fb(v.maxdisk)+'</div></div>';
    if(v.status==='running'){
      h+='<div class="vm-metric"><div class="vm-metric-label">Network</div><div class="vm-metric-bar"><div class="vm-metric-bar-fill" style="width:100%;background:var(--sky);opacity:0.3"></div></div><div class="vm-metric-val">'+I.up+' '+fb(v.netout,0)+' '+I.down+' '+fb(v.netin,0)+'</div></div>';
    } else {
      h+='<div class="vm-metric"><div class="vm-metric-label">Network</div><div class="vm-metric-bar"><div class="vm-metric-bar-fill" style="width:1%;background:var(--bg-active)"></div></div><div class="vm-metric-val">\\u2014</div></div>';
    }
    h+='</div>';
    h+='<div class="vm-card-footer"><div class="vm-card-footer-item">'+I.server+' '+esc(v.node)+'</div><div class="vm-card-footer-item">'+I.clock+' '+(v.uptime?fu(v.uptime):'\\u2014')+'</div></div>';
    h+='</div>';
  }
  h+='</div></div>';

  /* ── Bottom panels ── */
  h+='<div class="panels-grid enter" style="animation-delay:.2s">';

  // Tasks
  h+='<div class="panel"><div class="panel-header"><div class="panel-title">Recent Tasks</div><span class="section-count">'+ts.length+'</span></div><div class="panel-body">';
  if(!ts.length) h+='<div class="empty-state">No recent tasks</div>';
  for(const t of ts.slice(0,15)){
    const rs=t.status==='OK'||t.status?.startsWith('OK')?'ok':(t.status?'err':'run');
    h+='<div class="task-row"><div class="task-type-pill">'+(t.type||'?')+'</div><div class="task-detail"><div class="task-detail-id">'+esc(t.id||t.node||'')+'</div><div class="task-detail-user">'+esc(t.user||'')+'</div></div><div class="task-time">'+ft(t.starttime)+'</div><div class="task-result '+rs+'">'+(t.status||'running')+'</div></div>';
  }
  h+='</div></div>';

  // Storage
  h+='<div class="panel"><div class="panel-header"><div class="panel-title">Storage</div><span class="section-count">'+st.length+'</span></div><div class="panel-body">';
  if(!st.length) h+='<div class="empty-state">No storage info</div>';
  for(const s of st){
    const sp=pct(s.used,s.total);
    h+='<div class="storage-row"><div class="storage-icon-wrap">'+I.hdd+'</div><div class="storage-detail"><div class="storage-name">'+esc(s.storage)+'</div><div class="storage-meta">'+esc(s.type)+' &middot; '+(s.content||'').replace(/,/g,', ')+'</div><div class="storage-bar-wrap"><div class="storage-bar"><div class="storage-bar-fill" style="width:'+sp+'%;background:'+gc(sp)+'"></div></div></div></div><div class="storage-pct">'+sp+'%</div><div style="font-size:11px;color:var(--text-quaternary);white-space:nowrap;margin-left:4px">'+fb(s.used)+' / '+fb(s.total)+'</div></div>';
  }
  h+='</div></div>';

  h+='</div>'; // panels-grid
  h+='</main></div>'; // main + shell

  root.innerHTML=h;
}

load();
setInterval(load,TICK);
</script>
</body>
</html>`;
}
