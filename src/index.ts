import { createLogger, enquirer } from "@/utils";
import { t, setLocale, detectLocale, type Locale } from "@/i18n";

const logger = createLogger("App");

interface AppContext {
  abortController: AbortController;
  locale: Locale;
}

let ctx: AppContext | null = null;

async function init(): Promise<AppContext> {
  logger.info("Initializing...");

  return {
    abortController: new AbortController(),
    locale: "en",
  };
}

async function selectLanguage(): Promise<Locale> {
  const detected = detectLocale();
  logger.debug(`Detected system locale: ${detected}`);

  const { locale } = await enquirer.prompt<{ locale: Locale }>({
    type: "select",
    name: "locale",
    message: "Language / 语言",
    choices: [
      { name: "en", message: "English" },
      { name: "zh_CN", message: "简体中文" },
    ],
    initial: detected === "zh_CN" ? 1 : 0,
  });

  return locale;
}

async function run(ctx: AppContext): Promise<void> {
  logger.info("Running...");

  // Step 1: Select language
  ctx.locale = await selectLanguage();
  setLocale(ctx.locale);
  logger.info(`Language set to: ${ctx.locale}`);

  console.log();
  console.log(t("welcome"));
  console.log();

  // TODO: next steps
}

async function shutdown(ctx: AppContext, reason: string): Promise<void> {
  logger.info(`Shutting down (${reason})...`);

  ctx.abortController.abort();

  // TODO: cleanup resources here

  logger.info("Goodbye!");
}

function setupSignalHandlers(ctx: AppContext): void {
  const handler = (signal: string) => {
    logger.warn(`Received ${signal}`);
    shutdown(ctx, signal).finally(() => process.exit(0));
  };

  process.on("SIGINT", () => handler("SIGINT"));
  process.on("SIGTERM", () => handler("SIGTERM"));
}

async function main(): Promise<void> {
  try {
    ctx = await init();
    setupSignalHandlers(ctx);
    await run(ctx);
    await shutdown(ctx, "completed");
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err));
    if (ctx) await shutdown(ctx, "error");
    process.exit(1);
  }
}

main();
