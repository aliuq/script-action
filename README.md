# Script Action

Run TypeScript or JavaScript directly inside GitHub Actions with either Bun or `tsx`, while keeping ESM-first ergonomics and optional ZX support.

## Highlights

- Runs as a standard JavaScript action on `node24`
- Supports two execution paths:
  - `bun: true` for Bun-powered scripts
  - `bun: false` for Node + `tsx`
- Supports `zx` globals when running in `tsx` mode
- Installs requested packages on demand
- Can auto-install dependencies in Bun mode
- Includes local quality gates with `Biome`, `Vitest`, `tsc`, and `tsdown`

## Quick start

### Run a Bun script

```yaml
- name: Run inline script
  uses: aliuq/script-action@v1
  with:
    script: |
      console.log("Hello from Script Action")
```

### Run with `tsx` + ZX

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

### Install packages explicitly

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

### Let Bun auto-install dependencies

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

### Set outputs

```yaml
- name: Produce outputs
  id: script
  uses: aliuq/script-action@v1
  with:
    script: |
      output("status", "ok")
      outputJson({ version: "1.0.0", runtime: process.env.BUN ? "bun" : "tsx" })
```

## Inputs

| Input | Description | Required | Default |
| --- | --- | --- | --- |
| `script` | Inline script content to execute | Yes | - |
| `packages` | Packages to install before running. Supports multiline values, commas, or spaces. | No | `""` |
| `bun` | Run the script with Bun | No | `"true"` |
| `auto_install` | Remove `node_modules` first so Bun can auto-install imported dependencies | No | `"false"` |
| `zx` | Enable ZX globals when `bun` is `false` | No | `"true"` |
| `debug` | Enable debug logging | No | `"false"` |

## Runtime behavior

- The primary action entrypoint is `dist/index.js` and runs on `node24`
- When `bun: true`, the action downloads Bun on demand and executes the rendered script with `bun run -i`
- When `bun: false`, the action installs `tsx` and executes the rendered script with the current Node runtime
- Template files are read from the repository `templates/` directory and rendered into a temporary working directory before execution

## Local development

This repository now uses:

- `Biome` for formatting and linting
- `Vitest` for local scenario-based tests
- `tsc --noEmit` for type-checking
- `tsdown` for bundling `dist/index.js`

### Commands

```bash
bun install
bun run lint
bun run typecheck
bun run test
bun run build
```

### Watch build

```bash
bun run dev
```

`dev` runs `tsdown` in watch mode for the single `dist/index.js` bundle.

## CI coverage

The repository validates:

- local tooling checks on Node 24
- cross-platform action execution on Linux, macOS, and Windows
- Bun mode, `tsx` mode, package installation, and ZX scenarios

## License

MIT

[中文文档](./README.zh.md)
