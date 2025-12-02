#!/usr/bin/env node

const chalk = require('chalk');
const { program } = require('commander');
const inquirer = require('inquirer');
const ConfigManager = require('../lib/config-manager');

program
  .name('voice-config')
  .description('View and edit voice notification configuration')
  .option('-s, --show', 'Show current configuration')
  .option('-e, --edit', 'Interactively edit configuration')
  .option('-p, --path', 'Show configuration file path')
  .option('-r, --reset', 'Reset to team defaults')
  .parse();

async function showConfig(config, configPath) {
  console.log(chalk.blue('Current Configuration:'));
  console.log(chalk.gray(`Path: ${configPath}\n`));
  console.log(JSON.stringify(config, null, 2));
}

async function editConfig(configManager) {
  const config = configManager.load();

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'tts_service',
      message: 'TTS Provider:',
      choices: ['elevenlabs', 'macos_say'],
      default: config.tts_service
    },
    {
      type: 'confirm',
      name: 'fallback_to_say',
      message: 'Fallback to macOS say on errors?',
      default: config.fallback_to_say
    },
    {
      type: 'number',
      name: 'min_duration_ms',
      message: 'Minimum duration (ms) to trigger notification:',
      default: config.filters.min_duration_ms
    },
    {
      type: 'confirm',
      name: 'speak_errors',
      message: 'Speak errors?',
      default: config.filters.speak_errors
    },
    {
      type: 'confirm',
      name: 'speak_completions',
      message: 'Speak tool completions?',
      default: config.filters.speak_completions
    },
    {
      type: 'confirm',
      name: 'speak_responses',
      message: 'Speak response completions?',
      default: config.filters.speak_responses
    }
  ]);

  // Update config
  config.tts_service = answers.tts_service;
  config.fallback_to_say = answers.fallback_to_say;
  config.filters.min_duration_ms = answers.min_duration_ms;
  config.filters.speak_errors = answers.speak_errors;
  config.filters.speak_completions = answers.speak_completions;
  config.filters.speak_responses = answers.speak_responses;

  configManager.save(config);

  console.log(chalk.green('\n✓ Configuration updated'));
}

async function resetConfig(configManager) {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: chalk.yellow('Reset to team defaults? (Your config will be backed up)'),
      default: false
    }
  ]);

  if (!confirm) {
    console.log('Reset cancelled');
    return;
  }

  const config = configManager.resetToDefaults();
  console.log(chalk.green('✓ Configuration reset to team defaults'));
  console.log(chalk.gray('Backup saved to: ~/.claude/scripts/voice-config.json.backup'));
  console.log('\nNew configuration:');
  console.log(JSON.stringify(config, null, 2));
}

async function main() {
  const options = program.opts();
  const configManager = new ConfigManager();

  // Show path
  if (options.path) {
    console.log(configManager.getConfigPath());
    return;
  }

  // Reset
  if (options.reset) {
    await resetConfig(configManager);
    return;
  }

  // Edit
  if (options.edit) {
    await editConfig(configManager);
    return;
  }

  // Show (default)
  const config = configManager.load();
  const configPath = configManager.getConfigPath();
  await showConfig(config, configPath);
}

main().catch(error => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});
