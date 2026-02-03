import { createLogger, type Logger } from "./logger";
import { escSelect, isPromptCancelled } from "./prompt";

export const MENU_EXIT = Symbol("MENU_EXIT");

/**
 * 菜单执行上下文
 */
export interface MenuContext {
  logger: Logger;
  abortSignal?: AbortSignal;
}

export interface MenuItem<T = unknown> {
  label: string;
  value: T | typeof MENU_EXIT;
  action?: (ctx: MenuContext) => Promise<void> | void;
}

export interface MenuConfig<T = unknown> {
  message: string;
  items: MenuItem<T>[];
  loop?: boolean;
  context?: MenuContext;
}

export async function runMenu<T>(config: MenuConfig<T>): Promise<T | null> {
  const { message, items, loop = false, context } = config;

  const ctx = context ?? { logger: createLogger("Menu") };

  const choices = items.map((item) => ({
    name: item.label,
    value: item,
  }));

  do {
    let selected: MenuItem<T>;
    try {
      selected = await escSelect<MenuItem<T>>({
        message,
        choices,
      });
    } catch (err) {
      if (isPromptCancelled(err)) {
        return null;
      }
      throw err;
    }

    if (selected.value === MENU_EXIT) {
      return null;
    }

    if (selected.action) {
      await selected.action(ctx);
    }

    if (!loop) {
      return selected.value as T;
    }

    console.log();
  } while (loop);

  return null;
}
