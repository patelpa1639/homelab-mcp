import { spawn } from "node:child_process";

/** Active shell sessions keyed by Telegram chat ID */
const sessions = new Map<number, ShellSession>();

interface ShellSession {
  vmid: number;
  host: string;
  user: string;
  startedAt: number;
}

/** Get the active session for a chat */
export function getSession(chatId: number): ShellSession | undefined {
  return sessions.get(chatId);
}

/** Start a shell session */
export function startSession(chatId: number, vmid: number, host: string, user: string = "root"): ShellSession {
  const session: ShellSession = { vmid, host, user, startedAt: Date.now() };
  sessions.set(chatId, session);
  return session;
}

/** End a shell session */
export function endSession(chatId: number): boolean {
  return sessions.delete(chatId);
}

/** Execute a command on a remote host via SSH */
export async function execSSH(
  host: string,
  command: string,
  user: string = "root",
  timeoutMs: number = 30000
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let resolved = false;

    const proc = spawn("ssh", [
      "-o", "StrictHostKeyChecking=no",
      "-o", "UserKnownHostsFile=/dev/null",
      "-o", `ConnectTimeout=10`,
      "-o", "LogLevel=ERROR",
      `${user}@${host}`,
      command,
    ], {
      timeout: timeoutMs,
    });

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
      // Cap output to prevent memory issues
      if (stdout.length > 10000) {
        stdout = stdout.substring(0, 10000);
        proc.kill();
      }
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
      if (stderr.length > 5000) {
        stderr = stderr.substring(0, 5000);
      }
    });

    proc.on("close", (code) => {
      if (!resolved) {
        resolved = true;
        resolve({ stdout, stderr, exitCode: code });
      }
    });

    proc.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        resolve({ stdout: "", stderr: err.message, exitCode: 1 });
      }
    });

    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill();
        resolve({ stdout, stderr: stderr + "\n(command timed out)", exitCode: 124 });
      }
    }, timeoutMs);
  });
}

/** Format SSH output for Telegram (truncate to fit message limit) */
export function formatOutput(result: { stdout: string; stderr: string; exitCode: number | null }): string {
  const MAX_LEN = 3800; // Leave room for formatting
  let output = "";

  if (result.stdout) {
    output += result.stdout;
  }
  if (result.stderr) {
    if (output) output += "\n";
    output += result.stderr;
  }
  if (!output.trim()) {
    output = "(no output)";
  }

  // Truncate if too long
  if (output.length > MAX_LEN) {
    output = output.substring(0, MAX_LEN) + "\n... (truncated)";
  }

  const exitInfo = result.exitCode !== null && result.exitCode !== 0
    ? `\n\u{1F534} Exit code: ${result.exitCode}`
    : "";

  return `\`\`\`\n${output}\n\`\`\`${exitInfo}`;
}
