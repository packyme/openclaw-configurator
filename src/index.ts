import "dotenv/config";
import { createLogger, which, select, ora, chalk, symbols } from "@/utils";
import { t, setLocale, detectLocale, type Locale } from "@/i18n";
import { runConfigLoop } from "@/config-flow";

const logger = createLogger("App");

class CancelledError extends Error {
  constructor() {
    super("Cancelled");
    this.name = "CancelledError";
  }
}

function isCancelledError(err: unknown): err is CancelledError {
  return err instanceof CancelledError;
}

interface AppContext {
  abortController: AbortController;
  locale: Locale;
  openclawPath: string;
}

let ctx: AppContext | null = null;

async function init(): Promise<AppContext> {
  logger.info("Initializing...");

  return {
    abortController: new AbortController(),
    locale: "en",
    openclawPath: "",
  };
}

async function selectLanguage(): Promise<Locale> {
  const detected = detectLocale();
  logger.debug(`Detected system locale: ${detected}`);

  const locale = await select({
    message: "Language / 语言",
    choices: [
      { value: "en" as const, name: "English" },
      { value: "zh_CN" as const, name: "简体中文" },
    ],
    default: detected,
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
  console.log(chalk.bold(t("welcome")));
  console.log();

  // Step 2: Check openclaw executable
  const spinner = ora(t("checking_openclaw")).start();
  const openclawPath = which("openclaw");
  if (!openclawPath) {
    spinner.fail(t("openclaw_not_found"));
    process.exit(1);
  }
  ctx.openclawPath = openclawPath;
  spinner.succeed(t("openclaw_found", { path: openclawPath }));
  console.log();

  // Step 3: Configuration loop
  await runConfigLoop();
}

async function shutdown(ctx: AppContext, reason: string): Promise<void> {
  logger.info(`Shutting down (${reason})...`);

  ctx.abortController.abort();

  // TODO: cleanup resources here

  logger.info("Goodbye!");
}

function setupSignalHandlers(ctx: AppContext): void {
  process.on("SIGTERM", () => {
    logger.warn("Received SIGTERM");
    shutdown(ctx, "SIGTERM").finally(() => process.exit(0));
  });
}

async function main(): Promise<void> {
  try {
    ctx = await init();
    setupSignalHandlers(ctx);
    await run(ctx);
    await shutdown(ctx, "completed");
  } catch (err) {
    if (isCancelledError(err)) {
      if (ctx) await shutdown(ctx, "cancelled");
      return;
    }
    logger.error(err instanceof Error ? err.message : String(err));
    if (ctx) await shutdown(ctx, "error");
    process.exit(1);
  }
}

main();
