import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import type { SupportedProvider } from "./openclaw";

interface AuthProfile {
  type: "api_key";
  provider: string;
  key: string;
}

interface AuthProfilesFile {
  version: number;
  profiles: Record<string, AuthProfile>;
}

function getOpenclawConfigDir(): string {
  return process.env.OPENCLAW_CONFIG_DIR || join(homedir(), ".openclaw");
}

function getAuthProfilesPath(): string {
  return join(getOpenclawConfigDir(), "agents", "main", "agent", "auth-profiles.json");
}

function ensureAuthProfilesDir(): void {
  const filePath = getAuthProfilesPath();
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readAuthProfiles(): AuthProfilesFile {
  const filePath = getAuthProfilesPath();
  if (!existsSync(filePath)) {
    return { version: 1, profiles: {} };
  }
  const content = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(content);

  if (!parsed || typeof parsed !== "object" || !parsed.profiles) {
    return { version: 1, profiles: {} };
  }

  return parsed as AuthProfilesFile;
}

function writeAuthProfiles(data: AuthProfilesFile): void {
  ensureAuthProfilesDir();
  const filePath = getAuthProfilesPath();
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function setApiKey(provider: SupportedProvider, apiKey: string): void {
  const profileKey = `${provider}:default`;
  const data = readAuthProfiles();

  data.profiles[profileKey] = {
    type: "api_key",
    provider,
    key: apiKey,
  };

  writeAuthProfiles(data);
}

/**
 * 从 auth-profiles.json 读取已有的 API Key（旧版兼容）
 */
export function getApiKeyFromAuthProfiles(provider: string): string | null {
  const data = readAuthProfiles();
  const profile = data.profiles[`${provider}:default`];
  return profile?.key ?? null;
}

/**
 * 从 auth-profiles.json 中删除指定 provider 的条目
 * 当 API Key 已迁移到 openclaw.json 的 provider config 后调用
 */
export function removeApiKeyFromAuthProfiles(provider: string): void {
  const data = readAuthProfiles();
  const profileKey = `${provider}:default`;
  if (!(profileKey in data.profiles)) {
    return;
  }
  delete data.profiles[profileKey];
  writeAuthProfiles(data);
}
