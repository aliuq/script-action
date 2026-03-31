# Script Action

在 GitHub Actions 中直接运行 TypeScript / JavaScript 脚本，支持 Bun 和 `tsx` 两种执行方式，并可按需启用 ZX。

## 特性

- 主 Action 运行时已升级到 `node24`
- 支持两种脚本执行路径
  - `bun: true`：使用 Bun 执行
  - `bun: false`：使用 Node + `tsx` 执行
- 在 `tsx` 模式下支持 ZX 全局能力
- 支持按需安装依赖
- 支持 Bun 模式下自动安装依赖
- 本地开发链路包含 `Biome`、`Vitest`、`tsc` 与 `tsdown`

## 快速开始

### 运行 Bun 脚本

```yaml
- name: Run inline script
  uses: aliuq/script-action@v1
  with:
    script: |
      console.log("Hello from Script Action")
```

### 使用 `tsx` + ZX

```yaml
- name: Run with tsx
  uses: aliuq/script-action@v1
  with:
    bun: false
    zx: true
    script: |
      echo("workspace")
      const cwd = await $`pwd`.text()
      console.log(cwd.trim())
```

### 显式安装依赖

```yaml
- name: Install packages before running
  uses: aliuq/script-action@v1
  with:
    packages: |
      axios
      dayjs
    script: |
      import axios from "axios"
      import dayjs from "dayjs"

      const { data } = await axios.get("https://api.github.com/zen")
      console.log(dayjs().format("YYYY-MM-DD"), data)
```

### 让 Bun 自动安装依赖

```yaml
- name: Use Bun auto install
  uses: aliuq/script-action@v1
  with:
    bun: true
    auto_install: true
    script: |
      import { Octokit } from "@octokit/rest"

      const octokit = new Octokit()
      const { data } = await octokit.rest.rateLimit.get()
      console.log(data.rate)
```

### 输出变量

```yaml
- name: Produce outputs
  id: script
  uses: aliuq/script-action@v1
  with:
    script: |
      output("status", "ok")
      outputJson({ version: "1.0.0", runtime: process.env.BUN ? "bun" : "tsx" })
```

## 输入参数

| 参数 | 说明 | 必填 | 默认值 |
| --- | --- | --- | --- |
| `script` | 要执行的内联脚本内容 | 是 | - |
| `packages` | 运行前安装的依赖，支持多行、逗号或空格分隔 | 否 | `""` |
| `bun` | 是否使用 Bun 执行脚本 | 否 | `"true"` |
| `auto_install` | 先删除 `node_modules`，让 Bun 根据导入内容自动安装依赖 | 否 | `"false"` |
| `zx` | 当 `bun` 为 `false` 时启用 ZX 全局能力 | 否 | `"true"` |
| `debug` | 是否输出调试日志 | 否 | `"false"` |

## 运行机制

- 主入口为 `dist/index.js`，由 GitHub Actions 的 `node24` 运行
- 当 `bun: true` 时，Action 会按需安装 Bun，并通过 `bun run -i` 执行渲染后的脚本
- 当 `bun: false` 时，Action 会安装 `tsx`，并通过当前 Node 运行时执行脚本
- 模板文件会直接从仓库内的 `templates/` 目录读取，再渲染到临时目录

## 本地开发

当前仓库的本地工具链如下：

- `Biome`：格式化与静态检查
- `Vitest`：本地场景测试
- `tsc --noEmit`：类型检查
- `tsdown`：产出 `dist/index.js`

### 常用命令

```bash
bun install
bun run lint
bun run typecheck
bun run test
bun run build
```

### 监听构建

```bash
bun run dev
```

`dev` 会以 watch 模式构建单一的 `dist/index.js` 产物。

## CI 覆盖

当前 CI 会验证：

- Node 24 下的本地工具链检查
- Linux、macOS、Windows 三平台 Action 执行
- Bun 模式、`tsx` 模式、依赖安装与 ZX 场景

## 许可证

MIT
