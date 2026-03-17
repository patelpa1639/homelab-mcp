# homelab-mcp

A homelab assistant that connects your **Proxmox** infrastructure to **AI agents** via [MCP](https://modelcontextprotocol.io/), to **Telegram** for phone-based management in plain English, and provides a **real-time web dashboard** for visual monitoring.

```
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Claude Desktop  │  │   Telegram Bot   │  │  Web Dashboard  │  │   Codex CLI     │
│  / Codex / Any   │  │  (your phone)    │  │  (real-time UI) │  │  / Any MCP      │
│  MCP Client      │  │                  │  │                 │  │  Client         │
└────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘  └────────┬────────┘
         │  MCP protocol       │  grammy             │  HTTP/JSON         │
         └──────────┐  ┌───────┘            ┌────────┘            ┌───────┘
                    ▼  ▼                    ▼                     ▼
               ┌─────────────────────────────────────────┐
               │          Core Action Layer              │
               │        (src/core/actions.ts)            │
               └───────────────────┬─────────────────────┘
                                   │
                           ┌───────▼────────┐
                           │  Proxmox REST  │
                           │  API Client    │
                           └───────┬────────┘
                                   │
                           ┌───────▼────────┐
                           │  Proxmox VE    │
                           │  Cluster       │
                           └────────────────┘
```

**One shared core, three frontends.** The same action layer powers the MCP server (for AI agents), the Telegram bot (for your phone), and the web dashboard (for visual monitoring). No logic duplication.

## Features

- **Web Dashboard** — Real-time cluster monitoring with CPU/memory/disk gauges, VM status cards, storage overview, and recent tasks — zero dependencies, auto-refreshes every 10s
- **MCP Server** — 7 tools + 2 resources for AI agents to manage your homelab
- **Telegram Bot** — Slash commands + inline keyboards for quick mobile management
- **Natural Language** — Tell the bot what you want in plain English (powered by OpenAI or Anthropic)
- **VM Creation** — Spin up new QEMU VMs from ISOs with size presets (small/medium/large)
- **Container Creation** — Create LXC containers from popular templates (Ubuntu, Debian, Alpine, etc.) with auto-download
- **Remote Shell** — SSH into any VM/container directly from Telegram and run commands
- **Restart/Reboot** — Restart VMs and containers with confirmation
- **Confirmation Flows** — Destructive actions (start/stop/restart) require explicit confirmation
- **User Allowlist** — Restrict Telegram bot access to authorized users only
- **24/7 Systemd Service** — Run as a user service with auto-restart and memory limits
- **Self-Signed SSL** — Works with Proxmox's default self-signed certificates

## Quick Start

### Prerequisites

- Node.js 18+
- A Proxmox VE server with an API token ([how to create one](https://pve.proxmox.com/wiki/User_Management#pveum_tokens))

### Install

```bash
git clone https://github.com/patelpa1639/homelab-mcp.git
cd homelab-mcp
npm install
cp .env.example .env
# Edit .env with your Proxmox credentials
npm run build
```

### MCP Server (for Claude Desktop / Codex)

**Claude Desktop** — Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "homelab": {
      "command": "node",
      "args": ["/absolute/path/to/homelab-mcp/dist/index.js", "--mcp"],
      "env": {
        "PROXMOX_HOST": "192.168.1.100",
        "PROXMOX_TOKEN_ID": "user@pam!token-name",
        "PROXMOX_TOKEN_SECRET": "your-token-secret"
      }
    }
  }
}
```

**Codex CLI** — Add to `.codex/config.toml`:

```toml
[mcp_servers.homelab]
command = "node"
args = ["/absolute/path/to/homelab-mcp/dist/index.js", "--mcp"]

[mcp_servers.homelab.env]
PROXMOX_HOST = "192.168.1.100"
PROXMOX_TOKEN_ID = "user@pam!token-name"
PROXMOX_TOKEN_SECRET = "your-token-secret"
```

### Telegram Bot

1. Create a bot with [@BotFather](https://t.me/BotFather) on Telegram
2. Copy the bot token to your `.env` file
3. Get your Telegram user ID from [@userinfobot](https://t.me/userinfobot)
4. Add it to `TELEGRAM_ALLOWED_USERS` in `.env`
5. (Optional) Add `AI_API_KEY` for natural language support

```bash
npm run start:telegram
```

### Web Dashboard

The dashboard provides a real-time visual overview of your entire Proxmox cluster — nodes, VMs, containers, storage, and recent tasks — all in a single page that auto-refreshes every 10 seconds.

```bash
# Standalone
npm run dev:dashboard

# Or run alongside Telegram bot (default mode)
npm run dev
```

Then open `http://localhost:3000` in your browser. Configure the port with `DASHBOARD_PORT` in `.env`.

**What you get:**
- Cluster-wide CPU, memory, storage, and guest count at a glance
- Per-node ring gauges with uptime and core counts
- VM/container cards with live CPU, memory, disk, and network metrics
- Recent Proxmox tasks with status indicators
- Storage pool usage breakdown
- Fully responsive — works on mobile, tablet, and desktop
- Zero external dependencies — no React, no bundler, just a single self-contained HTML page served from Node.js

### Run 24/7 as a Systemd Service

```bash
# Create user service
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/homelab-telegram.service << 'EOF'
[Unit]
Description=Homelab MCP Telegram Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/path/to/homelab-mcp
ExecStart=/usr/bin/node dist/index.js --telegram
Restart=always
RestartSec=5
StartLimitIntervalSec=300
StartLimitBurst=10
WatchdogSec=120
MemoryMax=512M
EnvironmentFile=/path/to/homelab-mcp/.env
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
EOF

# Enable and start
systemctl --user daemon-reload
systemctl --user enable --now homelab-telegram.service

# Allow service to run without being logged in
loginctl enable-linger $USER
```

**Useful commands:**

| Action | Command |
|--------|---------|
| Check status | `systemctl --user status homelab-telegram` |
| View logs | `journalctl --user -u homelab-telegram -f` |
| Restart | `systemctl --user restart homelab-telegram` |
| Stop | `systemctl --user stop homelab-telegram` |

## Commands Reference

### Telegram Commands

| Command | Description |
|---------|-------------|
| `/status` | Cluster overview — all nodes and VMs |
| `/vms` | List all VMs and containers |
| `/vm <vmid>` | Detailed status of a specific VM |
| `/node <name>` | Resource stats for a node |
| `/start <vmid>` | Start a VM/CT (with confirmation) |
| `/stop <vmid>` | Stop a VM/CT (with confirmation) |
| `/restart <vmid>` | Restart a VM/CT (with confirmation) |
| `/create <name>` | Create a new QEMU VM (interactive flow) |
| `/container <name>` | Create a new LXC container (interactive flow) |
| `/isos` | List available ISO images |
| `/shell <ip> [user]` | SSH into a VM/CT from Telegram |
| `/exit` | Disconnect from shell session |
| `/logs <node> [query]` | Search syslog entries |
| `/help` | Show available commands |

### Remote Shell

Connect to any VM or container via SSH directly from Telegram:

```
/shell 192.168.1.50 root
```

Once connected, every message you send runs as a command on the remote machine. Output is returned in real-time. Type `/exit` to disconnect.

**Requirements:**
- SSH must be running on the target machine
- Your SSH public key must be authorized on the target
- The target IP must be reachable from the machine running the bot

### VM/Container Creation

**VMs** — `/create myvm` walks you through:
1. Pick an ISO image from your Proxmox storage
2. Choose a size preset (Small: 2 CPU/2GB/20GB, Medium: 4 CPU/4GB/50GB, Large: 8 CPU/8GB/100GB)
3. Confirm and create

**Containers** — `/container myct` walks you through:
1. Pick a template (Ubuntu, Debian, Alpine, Fedora, Rocky Linux, etc.)
2. Choose a size preset (Small: 1 CPU/512MB/8GB, Medium: 2 CPU/2GB/16GB, Large: 4 CPU/4GB/32GB)
3. Confirm — template auto-downloads if needed

### Natural Language

When AI is configured, type in plain English:

- *"show me all VMs"*
- *"whats running"*
- *"restart 100"*
- *"create a container called nginx"*
- *"spin up a VM called webserver"*
- *"how is node pve doing"*
- *"check logs for errors"*

### MCP Tools

| Tool | Description |
|------|-------------|
| `list_vms` | List all VMs and containers across all nodes |
| `get_vm_status` | Get detailed status of a VM by VMID |
| `list_nodes` | List all cluster nodes with resource usage |
| `get_node_stats` | Get CPU, memory, disk, network stats for a node |
| `start_vm` | Start a stopped VM or container |
| `stop_vm` | Stop a running VM or container |
| `search_logs` | Search syslog entries on a node |

### MCP Resources

| Resource | URI | Description |
|----------|-----|-------------|
| Cluster Status | `proxmox://cluster/status` | Full cluster overview |
| VM Inventory | `proxmox://vms/inventory` | JSON list of all VMs |

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROXMOX_HOST` | Yes | — | Proxmox server hostname or IP |
| `PROXMOX_PORT` | No | `8006` | Proxmox API port |
| `PROXMOX_TOKEN_ID` | Yes | — | API token ID (`user@realm!tokenid`) |
| `PROXMOX_TOKEN_SECRET` | Yes | — | API token secret |
| `PROXMOX_ALLOW_SELF_SIGNED` | No | `true` | Accept self-signed SSL certs |
| `TELEGRAM_BOT_TOKEN` | No | — | Telegram bot token from BotFather |
| `TELEGRAM_ALLOWED_USERS` | No | — | Comma-separated Telegram user IDs |
| `AI_PROVIDER` | No | `openai` | `openai` or `anthropic` |
| `AI_API_KEY` | No | — | API key for natural language routing |
| `AI_MODEL` | No | auto | Model override for AI provider |
| `DASHBOARD_PORT` | No | `3000` | Web dashboard port |

## Security Notes

- **API Tokens** — Use Proxmox API tokens with minimal required privileges. Never use root credentials in production.
- **User Allowlist** — Always set `TELEGRAM_ALLOWED_USERS`. Without it, anyone who finds your bot can control your infrastructure.
- **Shell Sessions** — The `/shell` command gives full SSH access. Only authorized Telegram users can use it, but be mindful of what commands you run.
- **Self-Signed SSL** — `PROXMOX_ALLOW_SELF_SIGNED=true` is convenient for homelabs but disables certificate verification.
- **Environment Variables** — Never commit your `.env` file. The `.gitignore` already excludes it.

## Development

```bash
npm run dev              # Run Telegram bot + Dashboard with tsx (hot reload)
npm run dev:mcp          # Run MCP server with tsx
npm run dev:telegram     # Run Telegram bot only
npm run dev:dashboard    # Run Dashboard only
npm run lint             # Type check
npm run build            # Compile TypeScript
npm run clean            # Remove build artifacts
```

## License

MIT
