import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface OpenclawModel {
  key: string;
  name: string;
  input: string;
  contextWindow: number;
  local: boolean;
  available: boolean;
  tags: string[];
  missing: boolean;
}

export interface OpenclawModelsResult {
  count: number;
  models: OpenclawModel[];
}

export interface ProviderConfig {
  baseUrl: string;
  models: string[];
}

export interface VendorFilter {
  providers: SupportedProvider[];
  models: string[];
}

interface OpenclawConfig {
  models?: {
    mode?: string;
    providers?: Record<string, ProviderConfig>;
  };
  agents?: {
    defaults?: {
      model?: {
        primary?: string;
      };
      models?: Record<string, Record<string, unknown>>;
    };
  };
  meta?: {
    lastTouchedAt?: string;
  };
  [key: string]: unknown;
}

const SUPPORTED_PROVIDERS = ["openai", "anthropic"] as const;
export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

// PackyCode supported models (model name suffix after provider prefix)
const PACKYCODE_MODELS = [
  "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-5-sonnet-20241022",
  "claude-3-7-sonnet-20250219",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-1-20250805",
  "claude-opus-4-20250514",
  "claude-opus-4-5-20251101",
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-5-20250929",
  "gpt-4o-mini",
  "gpt-5",
  "gpt-5-codex",
  "gpt-5-pro",
  "gpt-5.1",
  "gpt-5.1-codex",
  "gpt-5.1-codex-max",
  "gpt-5.2",
  "gpt-5.2-pro",
];

export const VENDOR_FILTERS: Record<string, VendorFilter> = {
  packycode: {
    providers: ["openai", "anthropic"],
    models: PACKYCODE_MODELS,
  },
  other: {
    providers: [],
    models: [],
  },
};

function getOpenclawConfigDir(): string {
  return process.env.OPENCLAW_CONFIG_DIR || join(homedir(), ".openclaw");
}

function getOpenclawConfigPath(): string {
  return join(getOpenclawConfigDir(), "openclaw.json");
}

function readOpenclawConfig(): OpenclawConfig {
  const configPath = getOpenclawConfigPath();
  if (!existsSync(configPath)) {
    return {};
  }
  const content = readFileSync(configPath, "utf-8");
  return JSON.parse(content) as OpenclawConfig;
}

function writeOpenclawConfig(config: OpenclawConfig): void {
  const configPath = getOpenclawConfigPath();
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

export function isSupportedProvider(
  key: string,
  allowedProviders?: SupportedProvider[]
): SupportedProvider | null {
  const providers = allowedProviders ?? SUPPORTED_PROVIDERS;
  for (const provider of providers) {
    if (key.startsWith(`${provider}/`)) {
      return provider;
    }
  }
  return null;
}

export function getModelSuffix(key: string): string {
  const slashIndex = key.indexOf("/");
  return slashIndex >= 0 ? key.slice(slashIndex + 1) : key;
}

export function fetchModels(): OpenclawModelsResult {
  const result = spawnSync("openclaw", ["models", "list", "--all", "--json"], {
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "Failed to fetch models");
  }
  return JSON.parse(result.stdout) as OpenclawModelsResult;
}

export function filterModelsByVendor(
  models: OpenclawModel[],
  vendor: string
): OpenclawModel[] {
  const filter = VENDOR_FILTERS[vendor];
  if (!filter) {
    return models;
  }

  // If no filters specified (other vendor), return all models
  if (filter.providers.length === 0 && filter.models.length === 0) {
    return models;
  }

  return models.filter((m) => {
    // Check provider prefix
    const provider = isSupportedProvider(m.key, filter.providers);
    if (!provider) {
      return false;
    }

    // If model filter is empty, accept all models from allowed providers
    if (filter.models.length === 0) {
      return true;
    }

    // Check model name suffix
    const modelSuffix = getModelSuffix(m.key);
    return filter.models.includes(modelSuffix);
  });
}

export function setProviderConfig(
  provider: SupportedProvider,
  config: ProviderConfig
): void {
  const openclawConfig = readOpenclawConfig();

  // Ensure models object exists
  if (!openclawConfig.models) {
    openclawConfig.models = {};
  }

  // Set mode to merge
  openclawConfig.models.mode = "merge";

  // Ensure providers object exists
  if (!openclawConfig.models.providers) {
    openclawConfig.models.providers = {};
  }

  // Set provider config
  openclawConfig.models.providers[provider] = config;

  writeOpenclawConfig(openclawConfig);
}

export function setModel(modelKey: string): void {
  const openclawConfig = readOpenclawConfig();

  // Ensure agents.defaults structure exists
  if (!openclawConfig.agents) {
    openclawConfig.agents = {};
  }
  if (!openclawConfig.agents.defaults) {
    openclawConfig.agents.defaults = {};
  }
  if (!openclawConfig.agents.defaults.model) {
    openclawConfig.agents.defaults.model = {};
  }
  if (!openclawConfig.agents.defaults.models) {
    openclawConfig.agents.defaults.models = {};
  }

  // Set primary model
  openclawConfig.agents.defaults.model.primary = modelKey;

  // Ensure model key exists in models
  if (!openclawConfig.agents.defaults.models[modelKey]) {
    openclawConfig.agents.defaults.models[modelKey] = {};
  }

  writeOpenclawConfig(openclawConfig);
}

export function triggerGatewayRestart(): void {
  const openclawConfig = readOpenclawConfig();

  // Ensure meta object exists
  if (!openclawConfig.meta) {
    openclawConfig.meta = {};
  }

  // Update lastTouchedAt to current timestamp
  openclawConfig.meta.lastTouchedAt = new Date().toISOString();

  writeOpenclawConfig(openclawConfig);
}
