import {
  createLogger,
  escInput,
  escPassword,
  isPromptCancelled,
  ora,
  symbols,
  fetchModels,
  filterModelsByVendor,
  isSupportedProvider,
  getConfiguredModels,
  getPrimaryModel,
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
const PACKYCODE_CODEX_BASE_URL = "https://codex-api.packycode.com";

type Vendor = "packycode" | "other";
type PackyCodeServiceType = "api" | "codex";

async function selectVendor(): Promise<Vendor | null> {
  return runMenu<Vendor>({
    message: t("select_vendor"),
    items: [
      { label: t("vendor_packycode"), value: "packycode" },
      { label: t("vendor_other"), value: "other" },
    ],
  });
}

async function selectPackyCodeServiceType(): Promise<PackyCodeServiceType | null> {
  return runMenu<PackyCodeServiceType>({
    message: t("select_service_type"),
    items: [
      { label: t("service_type_api"), value: "api" },
      { label: t("service_type_codex"), value: "codex" },
    ],
  });
}

async function getBaseUrl(
  vendor: Vendor,
  serviceType?: PackyCodeServiceType
): Promise<string | null> {
  if (vendor === "packycode") {
    return serviceType === "codex" ? PACKYCODE_CODEX_BASE_URL : PACKYCODE_BASE_URL;
  }
  try {
    return await escInput({
      message: t("input_base_url"),
    });
  } catch (err) {
    if (isPromptCancelled(err)) {
      return null;
    }
    throw err;
  }
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

  // Step 2: Select service type (PackyCode only)
  let serviceType: PackyCodeServiceType | undefined;
  if (vendor === "packycode") {
    const selected = await selectPackyCodeServiceType();
    if (!selected) {
      return;
    }
    serviceType = selected;
    ctx.logger.debug(`Selected service type: ${serviceType}`);
  }

  // Step 3: Get base URL
  const baseUrl = await getBaseUrl(vendor, serviceType);
  if (!baseUrl) {
    return;
  }
  ctx.logger.debug(`Base URL: ${baseUrl}`);

  // Step 4: Fetch and filter models
  const spinner = ora(t("fetching_models")).start();
  let filteredModels: OpenclawModel[];
  try {
    const result = fetchModels();
    filteredModels = filterModelsByVendor(result.models, vendor);
    // Codex service type: only show openai/ models (GPT series)
    if (serviceType === "codex") {
      filteredModels = filteredModels.filter((m) => m.key.startsWith("openai/"));
    }
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

  // Step 5: Select model
  const selectedModel = await selectModel(filteredModels);
  if (!selectedModel) {
    return;
  }
  ctx.logger.debug(`Selected model: ${selectedModel.key}`);

  // Step 6: Determine provider
  const vendorFilter = VENDOR_FILTERS[vendor];
  const allowedProviders = vendorFilter?.providers.length
    ? vendorFilter.providers
    : undefined;
  const provider = isSupportedProvider(selectedModel.key, allowedProviders);
  if (!provider) {
    return;
  }

  // Step 7: Get API key
  let apiKey: string;
  try {
    apiKey = await escPassword({
      message: t("input_api_key", { provider }),
      mask: "*",
    });
  } catch (err) {
    if (isPromptCancelled(err)) {
      return;
    }
    throw err;
  }

  // Step 8: Save config via operations (auto restart included)
  const providerBaseUrl = getProviderBaseUrl(baseUrl, provider);
  const authProvider = serviceType === "codex" && provider === "openai" ? "openai-codex" : provider;
  const operations: Operation[] = [
    createSetProviderConfig(provider, providerBaseUrl),
    createSetApiKey(authProvider, apiKey),
    createSetModel(selectedModel.key),
  ];

  await runOperations(ctx, operations);
}

async function selectConfiguredModel(ctx: MenuContext): Promise<void> {
  const configuredModels = getConfiguredModels();
  if (configuredModels.length === 0) {
    console.log(`${symbols.warning} ${t("no_configured_models")}`);
    return;
  }

  const currentModel = getPrimaryModel();

  const selected = await runMenu<string>({
    message: t("select_configured_model"),
    items: configuredModels.map((modelKey) => ({
      label:
        modelKey === currentModel
          ? `${modelKey} ${t("current_model_hint")}`
          : modelKey,
      value: modelKey,
    })),
  });

  if (!selected || selected === currentModel) {
    return;
  }

  ctx.logger.debug(`Selected model: ${selected}`);
  await runOperations(ctx, [createSetModel(selected)]);
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
        label: t("config_action_select_model"),
        value: "select_model",
        action: selectConfiguredModel,
      },
      {
        label: t("config_action_exit"),
        value: MENU_EXIT,
      },
    ],
  });
}
