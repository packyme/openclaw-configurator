import {
  setProviderConfig,
  setModel,
  triggerGatewayRestart,
  getModelSuffix,
  type SupportedProvider,
  type ProviderConfig,
} from "@/utils/openclaw";
import { removeApiKeyFromAuthProfiles } from "@/utils/auth";
import type { Operation } from "./types";

/**
 * 创建设置 Provider 配置的操作
 * API Key 写入 openclaw.json provider config，同时清理 auth-profiles.json 中的旧条目
 */
export function createSetProviderConfig(
  provider: SupportedProvider,
  baseUrl: string,
  options?: { api?: string; apiKey?: string; modelKey?: string }
): Operation {
  const config: ProviderConfig = { baseUrl, models: [] };
  if (options?.api) {
    config.api = options.api;
  }
  if (options?.apiKey) {
    config.apiKey = options.apiKey;
  }
  if (options?.modelKey) {
    const modelName = getModelSuffix(options.modelKey);
    config.models = [{ id: modelName, name: modelName }];
  }
  return {
    name: "op_set_provider_config",
    execute: () => {
      setProviderConfig(provider, config);
      // 写入 openclaw.json 后，清理 auth-profiles.json 中该 provider 的旧条目
      removeApiKeyFromAuthProfiles(provider);
    },
  };
}

/**
 * 创建设置默认模型的操作
 */
export function createSetModel(modelKey: string): Operation {
  return {
    name: "op_set_model",
    execute: () => setModel(modelKey),
  };
}

/**
 * 创建触发网关重启的操作（内部使用，由 runner 自动追加）
 */
export function createTriggerGatewayRestart(): Operation {
  return {
    name: "op_trigger_gateway_restart",
    execute: () => triggerGatewayRestart(),
  };
}
