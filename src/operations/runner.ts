import ora from "ora";
import { t, type MessageKey } from "@/i18n";
import { createTriggerGatewayRestart } from "./config";
import type { Operation, OperationContext } from "./types";

export interface RunOperationsOptions {
  /** spinner 显示的消息 i18n key，默认 "saving_config" */
  spinnerMessage?: MessageKey;
  /** 是否自动追加 gateway restart，默认 true */
  autoRestart?: boolean;
}

/**
 * 执行一组操作
 *
 * - 若 operations 为空，直接返回 true
 * - 若 autoRestart !== false 且 operations 不为空，自动追加 triggerGatewayRestart
 * - 执行过程显示 spinner
 * - 任一操作失败则中断并返回 false
 */
export async function runOperations(
  ctx: OperationContext,
  operations: Operation[],
  options: RunOperationsOptions = {}
): Promise<boolean> {
  const { spinnerMessage = "saving_config", autoRestart = true } = options;

  if (operations.length === 0) {
    return true;
  }

  const finalOps =
    autoRestart && operations.length > 0
      ? [...operations, createTriggerGatewayRestart()]
      : operations;

  const spinner = ora(t(spinnerMessage)).start();

  try {
    for (const op of finalOps) {
      ctx.logger.debug(`Executing: ${op.name}`);
      await op.execute();
    }
    spinner.succeed(t("config_saved"));
    return true;
  } catch (err) {
    spinner.fail(t("config_save_failed"));
    ctx.logger.error(err instanceof Error ? err.message : String(err));
    return false;
  }
}
