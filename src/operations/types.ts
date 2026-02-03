import type { Logger } from "@/utils/logger";

/**
 * 操作执行上下文
 */
export interface OperationContext {
  logger: Logger;
  abortSignal?: AbortSignal;
}

/**
 * 单个操作定义
 */
export interface Operation {
  /** 操作名称，用于日志和调试 */
  name: string;
  /** 执行函数 */
  execute: () => void | Promise<void>;
}
