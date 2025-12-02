#!/usr/bin/env node

const chalk = require('chalk');
const ConfigManager = require('../lib/config-manager');

async function main() {
  const configManager = new ConfigManager();

  try {
    const config = configManager.switchTTSProvider('macos_say');

    console.log(chalk.green('✓ Switched to macOS say TTS'));
    console.log(`Voice: ${config.macos_say.voice}`);
    console.log(`Rate: ${config.macos_say.rate} words/minute`);
    console.log('\nTo change voice, use: voice-set-voice <name>');
    console.log('To list voices, run: say -v "?"');
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

main();
