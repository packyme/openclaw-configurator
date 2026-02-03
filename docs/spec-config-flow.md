# Config Flow Architecture Specification

本文档描述配置流程的架构设计，包括 Operations Module 和 Menu Context 的设计规格。

## 概述

配置流程采用 **Operations Module + Menu Context** 架构：

- **Operations Module**: 封装所有可复用的原子操作，独立于菜单系统
- **Menu Context**: 菜单引擎提供统一的上下文，action 可访问
- **Operation Runner**: 统一执行操作，自动处理 gateway restart

```
MenuEngine (MenuContext)
    └──> action(ctx)
           └──> runOperations(ctx, [...operations])
                    └──> 自动追加 triggerGatewayRestart()
```

## 模块结构

```
src/
├── operations/
│   ├── index.ts       # Barrel export
│   ├── types.ts       # 类型定义
│   ├── config.ts      # 配置相关操作工厂
│   └── runner.ts      # 操作执行器
└── utils/
    └── menu.ts        # MenuContext 定义
```

## Operations Module

### 设计原则

1. **原子性**: 每个 Operation 只做一件事
2. **无副作用判断**: Operation 本身不判断是否需要执行，由调用方决定
3. **工厂模式**: 通过工厂函数创建 Operation，便于参数传递
4. **自动 Restart**: `runOperations` 在有操作时自动追加 `triggerGatewayRestart`

### 类型定义 (`types.ts`)

```typescript
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
```

### 操作工厂 (`config.ts`)

每个操作通过工厂函数创建：

```typescript
// 正确用法：通过工厂创建操作
const op = createSetModel("anthropic/claude-3-5-sonnet");
await runOperations(ctx, [op]);

// 错误用法：直接调用底层函数
setModel("anthropic/claude-3-5-sonnet"); // 不要这样做
```

**可用的操作工厂：**

| 工厂函数 | 参数 | 说明 |
|---------|------|------|
| `createSetProviderConfig` | `(provider, baseUrl)` | 设置 provider 的 baseUrl |
| `createSetApiKey` | `(provider, apiKey)` | 设置 provider 的 API key |
| `createSetModel` | `(modelKey)` | 设置默认模型 |

**内部操作（不对外暴露）：**

- `createTriggerGatewayRestart`: 触发网关重启，由 runner 自动追加

### 操作执行器 (`runner.ts`)

```typescript
import type { MessageKey } from "@/i18n";

export interface RunOperationsOptions {
  /** spinner 显示的消息 i18n key，默认 "saving_config" */
  spinnerMessage?: MessageKey;
  /** 是否自动追加 gateway restart，默认 true */
  autoRestart?: boolean;
}

export async function runOperations(
  ctx: OperationContext,
  operations: Operation[],
  options?: RunOperationsOptions
): Promise<boolean>;
```

**行为规则：**

1. 若 `operations.length === 0`，直接返回 `true`，不显示 spinner
2. 若 `operations.length > 0` 且 `autoRestart !== false`，自动追加 `triggerGatewayRestart`
3. 执行过程中显示 spinner
4. 任一操作失败则中断执行，返回 `false`
5. 全部成功返回 `true`

## Menu Context

### 设计原则

1. **统一上下文**: 所有菜单 action 共享同一个 context
2. **可选传入**: 可由外部传入或由菜单引擎自动创建
3. **最小依赖**: MenuContext 只包含必要的共享资源

### 类型定义

```typescript
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
```

### 使用示例

```typescript
// 外部传入 context
const ctx: MenuContext = { logger: createLogger("ConfigFlow") };

await runMenu({
  message: t("select_action"),
  context: ctx,
  items: [
    {
      label: t("add_provider"),
      value: "add",
      action: async (ctx) => {
        // ctx 来自上面的 context
        await configureProvider(ctx);
      },
    },
  ],
});

// 或让菜单引擎自动创建
await runMenu({
  message: t("select_action"),
  items: [...],  // action 会收到自动创建的 context
});
```

## 使用指南

### 添加新操作

1. 在 `src/operations/config.ts` 添加工厂函数：

```typescript
export function createNewOperation(param: string): Operation {
  return {
    name: "op_new_operation",
    execute: () => doSomething(param),
  };
}
```

2. 在 `src/operations/index.ts` 导出

3. 在需要的地方使用：

```typescript
import { createNewOperation, runOperations } from "@/operations";

await runOperations(ctx, [
  createNewOperation("value"),
]);
```

### 组合多个操作

```typescript
async function configureProvider(ctx: MenuContext): Promise<void> {
  // ... 收集用户输入 ...

  const operations: Operation[] = [
    createSetProviderConfig(provider, baseUrl),
    createSetApiKey(provider, apiKey),
    createSetModel(modelKey),
  ];

  // 执行（自动追加 triggerGatewayRestart）
  const success = await runOperations(ctx, operations);
  if (!success) {
    // 处理失败情况
  }
}
```

### 不需要 Restart 的场景

```typescript
// 某些只读或特殊操作不需要 restart
await runOperations(ctx, [someOp], { autoRestart: false });
```

## 错误用法

### 1. 直接调用底层函数

```typescript
// 错误：绕过 operations 系统
setProviderConfig(provider, config);
setApiKey(provider, key);
triggerGatewayRestart();

// 正确：使用 operations
await runOperations(ctx, [
  createSetProviderConfig(provider, baseUrl),
  createSetApiKey(provider, key),
]);
```

### 2. 手动追加 Restart

```typescript
// 错误：手动追加 restart
await runOperations(ctx, [
  createSetModel(model),
  createTriggerGatewayRestart(),  // 不对外暴露，也不应手动添加
]);

// 正确：runner 自动处理
await runOperations(ctx, [
  createSetModel(model),
]);  // 自动追加 restart
```

### 3. 忽略 Context

```typescript
// 错误：action 不使用传入的 context
{
  action: async () => {  // 缺少 ctx 参数
    const logger = createLogger("MyAction");  // 自己创建 logger
  }
}

// 正确：使用传入的 context
{
  action: async (ctx) => {
    ctx.logger.debug("...");
  }
}
```

## 扩展指南

### 添加新的操作类别

若需要添加非配置类的操作（如文件操作、网络操作等），创建新文件：

```
src/operations/
├── config.ts    # 配置相关
├── file.ts      # 文件操作（新增）
└── network.ts   # 网络操作（新增）
```

每个文件遵循相同的工厂模式。

### 扩展 MenuContext

若需要在 context 中添加更多共享资源：

```typescript
// 扩展类型
export interface MenuContext {
  logger: Logger;
  abortSignal?: AbortSignal;
  // 新增
  appConfig?: AppConfig;
}

// 创建时传入
const ctx: MenuContext = {
  logger: createLogger("App"),
  appConfig: loadConfig(),
};
```

注意：保持 MenuContext 轻量，只添加真正需要共享的资源。
