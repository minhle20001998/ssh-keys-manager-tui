import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { homedir, hostname, userInfo } from "node:os";
import { join, basename } from "node:path";
import { promisify } from "node:util";
import type { SshKey } from "../types.js";

const execFileAsync = promisify(execFile);

const SSH_DIR = join(homedir(), ".ssh");

const KNOWN_NON_KEY_FILES = new Set([
  "config",
  "known_hosts",
  "known_hosts.old",
  "authorized_keys",
  "authorized_keys2",
  "authorized_keys.old",
  "environment",
  "rc",
]);

function isKeyCandidate(name: string): boolean {
  if (KNOWN_NON_KEY_FILES.has(name)) return false;
  if (name.startsWith(".")) return false;
  if (name.endsWith(".pub")) return false;
  if (name.endsWith(".old") || name.endsWith(".bak")) return false;
  if (name.endsWith("~")) return false;
  return true;
}

export async function isAgentRunning(): Promise<boolean> {
  return process.env.SSH_AUTH_SOCK !== undefined && process.env.SSH_AUTH_SOCK !== "";
}

function keyTypeFromName(name: string): string {
  if (name.includes("ed25519_sk")) return "ED25519-SK";
  if (name.includes("ed25519")) return "ED25519";
  if (name.includes("ecdsa_sk")) return "ECDSA-SK";
  if (name.includes("ecdsa")) return "ECDSA";
  if (name.includes("dsa")) return "DSA";
  if (name.includes("rsa")) return "RSA";
  return "unknown";
}

export async function listKeys(): Promise<SshKey[]> {
  try {
    await fs.access(SSH_DIR);
  } catch {
    return [];
  }

  let activePaths = new Set<string>();
  try {
    activePaths = new Set(await listAgentKeyPaths());
  } catch {
    // agent not running or no keys
  }

  const entries = await fs.readdir(SSH_DIR, { withFileTypes: true });
  const keyMap = new Map<string, string>();

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.endsWith(".pub")) {
      const base = entry.name.slice(0, -4);
      keyMap.set(base, entry.name);
    }
  }

  const keys: SshKey[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (!isKeyCandidate(name)) continue;

    const pubName = keyMap.get(name);
    if (!pubName) continue;

    const privatePath = join(SSH_DIR, name);
    const publicPath = join(SSH_DIR, pubName);

    let fingerprint: string | undefined;
    let comment: string | undefined;
    let keyType: string | undefined;
    let bits: number | undefined;

    try {
      const parsed = await getKeyDetails(publicPath);
      fingerprint = parsed.fingerprint;
      comment = parsed.comment;
      keyType = parsed.type;
      bits = parsed.bits;
    } catch {
      // can't parse, leave undefined
    }

    keys.push({
      name,
      privatePath,
      publicPath,
      fingerprint,
      comment,
      keyType,
      bits,
      isActive: activePaths.has(privatePath),
    });
  }

  keys.sort((a, b) => a.name.localeCompare(b.name));
  return keys;
}

export async function listAgentKeyPaths(): Promise<string[]> {
  const { stdout } = await execFileAsync("ssh-add", ["-l"]);
  const lines = stdout.trim().split("\n");
  if (lines.length === 0 || lines[0].includes("no identities")) return [];

  const paths: string[] = [];
  for (const line of lines) {
    const parts = line.split(" ");
    const path = parts[parts.length - 2]?.replace(/[()]/g, "");
    if (path && path.startsWith("/")) {
      paths.push(path);
    }
  }
  return paths;
}

export async function addKeyToAgent(keyPath: string): Promise<void> {
  await execFileAsync("ssh-add", [keyPath]);
}

export async function removeAllKeysFromAgent(): Promise<void> {
  await execFileAsync("ssh-add", ["-D"]);
}

export async function removeKeyFromAgent(keyPath: string): Promise<void> {
  await execFileAsync("ssh-add", ["-d", keyPath]);
}

export async function generateKey(
  name: string,
  type: string,
  passphrase?: string,
  comment?: string,
): Promise<SshKey> {
  const keyPath = join(SSH_DIR, name);
  const finalComment = comment || `${userInfo().username}@${hostname()}`;

  const args = ["-t", type, "-f", keyPath, "-C", finalComment];
  if (type === "rsa") {
    args.push("-b", "4096");
  }
  if (passphrase) {
    args.push("-N", passphrase);
  } else {
    args.push("-N", "");
  }

  await execFileAsync("ssh-keygen", args, { timeout: 30000 });

  return {
    name,
    privatePath: keyPath,
    publicPath: keyPath + ".pub",
    comment: finalComment,
    keyType: type.toUpperCase(),
    fingerprint: undefined,
    isActive: false,
  };
}

export async function deleteKey(key: SshKey): Promise<void> {
  await fs.unlink(key.privatePath);
  await fs.unlink(key.publicPath);
}

export async function renameKey(key: SshKey, newName: string): Promise<SshKey> {
  const newPrivatePath = join(SSH_DIR, newName);
  const newPublicPath = join(SSH_DIR, newName + ".pub");

  await fs.rename(key.privatePath, newPrivatePath);
  await fs.rename(key.publicPath, newPublicPath);

  return {
    ...key,
    name: newName,
    privatePath: newPrivatePath,
    publicPath: newPublicPath,
  };
}

export async function getKeyDetails(
  publicPath: string,
): Promise<{ fingerprint: string; comment: string; type: string; bits: number }> {
  const { stdout } = await execFileAsync("ssh-keygen", ["-lf", publicPath]);
  const line = stdout.trim();
  const parts = line.split(" ");

  const bits = parts[0] ? parseInt(parts[0], 10) || 0 : 0;
  const fingerprint = parts[1] || "";
  const rest = parts.slice(2).join(" ");

  let comment = "";
  let type = "";

  const typeMatch = rest.match(/\((.+)\)$/);
  if (typeMatch) {
    type = typeMatch[1]!;
    comment = rest.slice(0, rest.lastIndexOf("(")).trim();
  } else {
    comment = rest;
    type = keyTypeFromName(basename(publicPath, ".pub"));
  }

  return { fingerprint, comment, type, bits };
}

export async function getKeyComment(privatePath: string): Promise<string> {
  try {
    const content = await fs.readFile(privatePath, "utf-8");
    const lines = content.split("\n");
    for (const line of lines) {
      if (line.startsWith("comment: ")) {
        return line.slice(9).trim();
      }
    }
  } catch {
    // ignore
  }
  return "";
}

export async function ensureSshDir(): Promise<void> {
  await fs.mkdir(SSH_DIR, { recursive: true, mode: 0o700 });
}
