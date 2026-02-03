import {
  createLogger,
  input,
  password,
  ora,
  symbols,
  fetchModels,
  filterModelsByVendor,
  isSupportedProvider,
  VENDOR_FILTERS,
  runMenu,
  MENU_EXIT,
  type OpenclawModel,
  type SupportedProvider,
  type MenuContext,
} from "@/utils";
import { t } from "@/i18n";
import {
  runOperations,
  createSetProviderConfig,
  createSetApiKey,
  createSetModel,
  type Operation,
} from "@/operations";

const logger = createLogger("ConfigFlow");

const PACKYCODE_BASE_URL = "https://www.packyapi.com";

type Vendor = "packycode" | "other";

async function selectVendor(): Promise<Vendor | null> {
  return runMenu<Vendor>({
    message: t("select_vendor"),
    items: [
      { label: t("vendor_packycode"), value: "packycode" },
      { label: t("vendor_other"), value: "other" },
    ],
  });
}

async function getBaseUrl(vendor: Vendor): Promise<string> {
  if (vendor === "packycode") {
    return PACKYCODE_BASE_URL;
  }
  return input({
    message: t("input_base_url"),
  });
}

function getProviderBaseUrl(
  baseUrl: string,
  provider: SupportedProvider
): string {
  if (provider === "openai") {
    return `${baseUrl}/v1`;
  }
  return baseUrl;
}

async function selectModel(
  models: OpenclawModel[]
): Promise<OpenclawModel | null> {
  return runMenu<OpenclawModel>({
    message: t("select_model"),
    items: models.map((m) => ({
      label: `${m.name} (${m.key})`,
      value: m,
    })),
  });
}

async function configureProvider(ctx: MenuContext): Promise<void> {
  // Step 1: Select vendor
  const vendor = await selectVendor();
  if (!vendor) {
    return;
  }
  ctx.logger.debug(`Selected vendor: ${vendor}`);

  // Step 2: Get base URL
  const baseUrl = await getBaseUrl(vendor);
  ctx.logger.debug(`Base URL: ${baseUrl}`);

  // Step 3: Fetch and filter models
  const spinner = ora(t("fetching_models")).start();
  let filteredModels: OpenclawModel[];
  try {
    const result = fetchModels();
    filteredModels = filterModelsByVendor(result.models, vendor);
    spinner.succeed();
  } catch (err) {
    spinner.fail(t("fetching_models_failed"));
    ctx.logger.error(err instanceof Error ? err.message : String(err));
    return;
  }

  if (filteredModels.length === 0) {
    console.log(`${symbols.warning} ${t("no_models_available")}`);
    return;
  }

  // Step 4: Select model
  const selectedModel = await selectModel(filteredModels);
  if (!selectedModel) {
    return;
  }
  ctx.logger.debug(`Selected model: ${selectedModel.key}`);

  // Step 5: Determine provider
  const vendorFilter = VENDOR_FILTERS[vendor];
  const allowedProviders = vendorFilter?.providers.length
    ? vendorFilter.providers
    : undefined;
  const provider = isSupportedProvider(selectedModel.key, allowedProviders);
  if (!provider) {
    return;
  }

  // Step 6: Get API key
  const apiKey = await password({
    message: t("input_api_key", { provider }),
    mask: "*",
  });

  // Step 7: Save config via operations (auto restart included)
  const providerBaseUrl = getProviderBaseUrl(baseUrl, provider);
  const operations: Operation[] = [
    createSetProviderConfig(provider, providerBaseUrl),
    createSetApiKey(provider, apiKey),
    createSetModel(selectedModel.key),
  ];

  await runOperations(ctx, operations);
}

export async function runConfigLoop(): Promise<void> {
  const ctx: MenuContext = { logger };

  await runMenu({
    message: t("config_action_prompt"),
    loop: true,
    context: ctx,
    items: [
      {
        label: t("config_action_add"),
        value: "add",
        action: configureProvider,
      },
      {
        label: t("config_action_exit"),
        value: MENU_EXIT,
      },
    ],
  });
}
