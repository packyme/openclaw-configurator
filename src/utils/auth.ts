import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

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

export function setApiKey(provider: string, apiKey: string): void {
  const profileKey = `${provider}:default`;
  const data = readAuthProfiles();

  data.profiles[profileKey] = {
    type: "api_key",
    provider,
    key: apiKey,
  };

  writeAuthProfiles(data);
}
