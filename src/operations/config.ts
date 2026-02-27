import {
  setProviderConfig,
  setModel,
  triggerGatewayRestart,
  type SupportedProvider,
} from "@/utils/openclaw";
import { setApiKey } from "@/utils/auth";
import type { Operation } from "./types";

/**
 * 创建设置 Provider 配置的操作
 */
export function createSetProviderConfig(
  provider: SupportedProvider,
  baseUrl: string
): Operation {
  return {
    name: "op_set_provider_config",
    execute: () => setProviderConfig(provider, { baseUrl, models: [] }),
  };
}

/**
 * 创建设置 API Key 的操作
 */
export function createSetApiKey(
  provider: SupportedProvider,
  apiKey: string
): Operation {
  return {
    name: "op_set_api_key",
    execute: () => setApiKey(provider, apiKey),
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
