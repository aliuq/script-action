import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import * as core from '@actions/core';
import type { ExecOptions } from '@actions/exec';
import { cyan, green, yellow } from 'kolorist';
import {
  execCommand,
  exist,
  installBun,
  logDebug,
  renderTemplates,
  tmpdir,
  writeTemplates,
} from './utils.js';

const DEFAULT_NODE_PACKAGES = ['@actions/core', '@actions/exec', 'tsx', 'zx'];
const DEFAULT_BUN_PACKAGES = ['@actions/core', '@actions/exec'];

function parsePackages(packages: string[]): string[] {
  const normalized = packages.length === 1 ? packages[0].split(/[,\s]+/g) : packages;
  return normalized.filter(Boolean);
}

export async function runAction(): Promise<void> {
  try {
    const script = core.getInput('script', { required: true });
    const packages = core.getMultilineInput('packages', { required: false });
    const autoInstall = core.getInput('auto_install', { required: false }) === 'true';

    const enableBun = core.getInput('bun', { required: false }) === 'true';
    const enableZx = core.getInput('zx', { required: false }) === 'true';

    logDebug(`Mode(node/bun): ${enableBun ? green('bun') : green('node')}`);
    let bunFile = 'bun';

    if (enableBun) {
      bunFile = await installBun();
      logDebug(`Runner: ${green('bun')} with bin ${cyan(bunFile)}`);
      process.env.BUN = 'true';
    } else {
      logDebug(`Runner: ${green('tsx')}`);
      delete process.env.BUN;
    }

    const tmpDir = await tmpdir();
    const moduleDir = path.join(tmpDir, 'node_modules');
    const mainFile = path.join(tmpDir, 'src', 'index.ts');
    logDebug(`Directory: ${cyan(tmpDir)}`);

    const execRun = async (
      command: string,
      args?: string[],
      options?: ExecOptions,
    ): Promise<string> => {
      return execCommand(command, args, { cwd: tmpDir, ...options });
    };

    if (enableBun && autoInstall) {
      logDebug(`auto_install is enabled, deleting node_modules(${yellow(moduleDir)}) directory`);
      if (await exist(moduleDir)) {
        await fs.rm(moduleDir, { recursive: true, force: true });
      }
    } else {
      const defaultPackages = enableBun ? DEFAULT_BUN_PACKAGES : DEFAULT_NODE_PACKAGES;
      const installPackages = Array.from(new Set([...parsePackages(packages), ...defaultPackages]));
      if (installPackages.length) {
        const installer = enableBun ? bunFile : 'npm';
        logDebug(`Use ${cyan(installer)} to install packages ${cyan(installPackages.join(', '))}`);
        const execResult = await execRun(installer, ['install', ...installPackages], {
          silent: true,
        });
        if (execResult && core.isDebug()) {
          await core.group('Install Packages', async () => core.info(execResult));
        }
      } else {
        logDebug(yellow('No packages need to install'));
      }
    }

    const newScript = script.replace(/^#/gm, '//');

    await core.group('Input Script', async () => core.info(newScript));

    const templateRoot = await writeTemplates();
    if (core.isDebug()) {
      core.startGroup('Templates');
    }
    await renderTemplates(templateRoot, tmpDir, {
      script: newScript,
      bun: enableBun,
      zx: enableZx,
    });
    if (core.isDebug()) {
      core.endGroup();
    }

    await core.group('Output Script', async () => core.info(await fs.readFile(mainFile, 'utf-8')));

    core.info(
      yellow(
        '!!! Please note that the current working directory is the temporary directory, not the GitHub workspace directory !!!',
      ),
    );
    core.info(`Current work directory: ${cyan(tmpDir)}`);
    core.info(`GitHub workspace directory: ${cyan(process.cwd())}`);
    core.info(
      `If you want to use the workspace directory, please use the environment variable: ${cyan('process.env.GITHUB_WORKSPACE')}`,
    );
    core.info('');

    if (enableBun) {
      await execRun(bunFile, ['run', '-i', mainFile], { silent: false });
    } else {
      const tsxCli = path.join(moduleDir, 'tsx', 'dist', 'cli.mjs');
      const nodePath = process.execPath;

      if (!(await exist(tsxCli))) {
        core.setFailed(`tsx CLI not found at: ${tsxCli}`);
        return;
      }
      await execRun(nodePath, [tsxCli, mainFile], { silent: false });
    }

    core.setOutput('status', 'success');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
      return;
    }

    core.setFailed('An unexpected error occurred');
  }
}

if (import.meta.main) {
  void runAction();
}
