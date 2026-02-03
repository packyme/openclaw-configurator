import { select, input, password } from "@inquirer/prompts";

/**
 * 用户通过 ESC 键取消 prompt 时抛出的错误
 */
export class PromptCancelledError extends Error {
  constructor() {
    super("Prompt cancelled");
    this.name = "PromptCancelledError";
  }
}

/**
 * 检查是否为 PromptCancelledError
 */
export function isPromptCancelled(err: unknown): err is PromptCancelledError {
  return err instanceof PromptCancelledError;
}

/**
 * 包装 prompt 函数，支持 ESC 键取消
 */
async function withEscapeCancel<T>(
  promptFn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();

  const onData = (data: Buffer) => {
    // ESC key alone is 0x1b (27), length 1
    // Arrow keys and other sequences are 0x1b followed by more bytes (length > 1)
    if (data.length === 1 && data[0] === 0x1b) {
      controller.abort();
    }
  };

  process.stdin.on("data", onData);

  try {
    return await promptFn(controller.signal);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortPromptError") {
      throw new PromptCancelledError();
    }
    throw err;
  } finally {
    process.stdin.off("data", onData);
  }
}

/**
 * 支持 ESC 取消的 select
 */
export async function escSelect<T>(
  config: Parameters<typeof select<T>>[0],
  context?: Parameters<typeof select<T>>[1]
): Promise<T> {
  return withEscapeCancel((signal) =>
    select(config, { ...context, signal })
  );
}

/**
 * 支持 ESC 取消的 input
 */
export async function escInput(
  config: Parameters<typeof input>[0],
  context?: Parameters<typeof input>[1]
): Promise<string> {
  return withEscapeCancel((signal) =>
    input(config, { ...context, signal })
  );
}

/**
 * 支持 ESC 取消的 password
 */
export async function escPassword(
  config: Parameters<typeof password>[0],
  context?: Parameters<typeof password>[1]
): Promise<string> {
  return withEscapeCancel((signal) =>
    password(config, { ...context, signal })
  );
}
