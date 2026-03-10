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
  api?: string;
}

export interface VendorFilter {
  providers: SupportedProvider[];
  models: string[];
}

export interface ModelBinding {
  provider?: SupportedProvider;
  baseUrl?: string;
  authProfile?: string;
  [key: string]: unknown;
}

export interface ModelRuntimeContext {
  provider: SupportedProvider;
  baseUrl?: string;
  authProfile?: string;
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
      models?: Record<string, ModelBinding>;
    };
  };
  meta?: {
    lastTouchedAt?: string;
  };
  [key: string]: unknown;
}

const SUPPORTED_PROVIDERS = ["openai", "anthropic"] as const;
export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

// PackyCode supported models (full key with provider prefix)
const PACKYCODE_MODELS = [
  // Claude models
  "anthropic/claude-3-5-haiku-20241022",
  "anthropic/claude-3-5-sonnet-20241022",
  "anthropic/claude-haiku-4-5-20251001",
  "anthropic/claude-opus-4-1-20250805",
  "anthropic/claude-opus-4-20250514",
  "anthropic/claude-opus-4-5-20251101",
  "anthropic/claude-opus-4-6",
  "anthropic/claude-sonnet-4-20250514",
  "anthropic/claude-sonnet-4-5-20250929",
  "anthropic/claude-sonnet-4-6",
  // Qwen models (via OpenAI-compatible API)
  "openai/qwen3-max",
  "openai/qwen3-vl-flash",
  "openai/qwen3.5-plus",
  // GPT models
  "openai/gpt-5",
  "openai/gpt-5-codex",
  "openai/gpt-5-codex-high",
  "openai/gpt-5-codex-low",
  "openai/gpt-5-codex-medium",
  "openai/gpt-5-codex-mini",
  "openai/gpt-5-codex-mini-high",
  "openai/gpt-5-codex-mini-medium",
  "openai/gpt-5-high",
  "openai/gpt-5-low",
  "openai/gpt-5-medium",
  "openai/gpt-5-minimal",
  "openai/gpt-5.1",
  "openai/gpt-5.1-codex",
  "openai/gpt-5.1-codex-max",
  "openai/gpt-5.1-codex-max-high",
  "openai/gpt-5.1-codex-max-xhigh",
  "openai/gpt-5.1-codex-mini",
  "openai/gpt-5.1-high",
  "openai/gpt-5.1-low",
  "openai/gpt-5.1-medium",
  "openai/gpt-5.1-minimal",
  "openai/gpt-5.2",
  "openai/gpt-5.2-codex",
  "openai/gpt-5.2-codex-high",
  "openai/gpt-5.2-codex-low",
  "openai/gpt-5.2-codex-medium",
  "openai/gpt-5.2-codex-xhigh",
  "openai/gpt-5.2-high",
  "openai/gpt-5.2-low",
  "openai/gpt-5.2-medium",
  "openai/gpt-5.2-xhigh",
  "openai/gpt-5.3-codex",
  "openai/gpt-5.3-codex-high",
  "openai/gpt-5.3-codex-low",
  "openai/gpt-5.3-codex-medium",
  "openai/gpt-5.3-codex-xhigh",
  "openai/gpt-5.4",
  "openai/gpt-5.4-high",
  "openai/gpt-5.4-low",
  "openai/gpt-5.4-medium",
  "openai/gpt-5.4-xhigh",
  // Gemini models (via OpenAI-compatible API)
  "openai/gemini-2.5-flash",
  "openai/gemini-2.5-pro",
  "openai/gemini-3-flash-preview",
  "openai/gemini-3-pro-preview",
  "openai/gemini-3-pro-preview-search",
  "openai/gemini-3.1-pro-preview",
];

export function getPackyCodeModels(serviceType?: string): OpenclawModel[] {
  let models = PACKYCODE_MODELS;
  if (serviceType === "codex") {
    models = models.filter((key) => key.startsWith("openai/"));
  }
  return models.map((key) => ({
    key,
    name: getModelSuffix(key),
    input: "text",
    contextWindow: 0,
    local: false,
    available: true,
    tags: [],
    missing: false,
  }));
}

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

function toSupportedProvider(value: unknown): SupportedProvider | null {
  return SUPPORTED_PROVIDERS.includes(value as SupportedProvider)
    ? (value as SupportedProvider)
    : null;
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

    // Check full key match
    return filter.models.includes(m.key);
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

export function setProviderBaseUrl(
  provider: SupportedProvider,
  baseUrl: string
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

  const existing = openclawConfig.models.providers[provider];
  openclawConfig.models.providers[provider] = {
    ...(existing ?? {}),
    baseUrl,
    models: Array.isArray(existing?.models) ? existing.models : [],
  };

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

export function setModelBinding(modelKey: string, binding: ModelBinding): void {
  const openclawConfig = readOpenclawConfig();

  // Ensure agents.defaults.models structure exists
  if (!openclawConfig.agents) {
    openclawConfig.agents = {};
  }
  if (!openclawConfig.agents.defaults) {
    openclawConfig.agents.defaults = {};
  }
  if (!openclawConfig.agents.defaults.models) {
    openclawConfig.agents.defaults.models = {};
  }

  const existing = openclawConfig.agents.defaults.models[modelKey] ?? {};
  openclawConfig.agents.defaults.models[modelKey] = {
    ...existing,
    ...binding,
  };

  writeOpenclawConfig(openclawConfig);
}

export function getModelBinding(modelKey: string): ModelBinding | null {
  const config = readOpenclawConfig();
  const binding = config.agents?.defaults?.models?.[modelKey];
  return binding ?? null;
}

export function getModelRuntimeContext(
  modelKey: string
): ModelRuntimeContext | null {
  const binding = getModelBinding(modelKey);
  const provider =
    toSupportedProvider(binding?.provider) ?? isSupportedProvider(modelKey);

  if (!provider) {
    return null;
  }

  const baseUrl =
    typeof binding?.baseUrl === "string" && binding.baseUrl.length > 0
      ? binding.baseUrl
      : undefined;
  const authProfile =
    typeof binding?.authProfile === "string" && binding.authProfile.length > 0
      ? binding.authProfile
      : undefined;

  return { provider, baseUrl, authProfile };
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

/**
 * Get configured models from agents.defaults.models
 * Returns array of model keys (e.g., ["openai/gpt-5.2", "anthropic/claude-opus-4-5-20251101"])
 */
export function getConfiguredModels(): string[] {
  const config = readOpenclawConfig();
  const models = config.agents?.defaults?.models;
  if (!models) {
    return [];
  }
  return Object.keys(models);
}

/**
 * Get current primary model from agents.defaults.model.primary
 */
export function getPrimaryModel(): string | null {
  const config = readOpenclawConfig();
  return config.agents?.defaults?.model?.primary ?? null;
}
