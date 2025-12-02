#!/usr/bin/env node

const chalk = require('chalk');
const { loadConfig, speak } = require('../lib/voice-notify');

async function main() {
  try {
    console.log(chalk.blue('Testing voice notifications...'));

    const config = loadConfig();
    console.log(chalk.gray(`Using ${config.tts_service} with ${config.tts_service === 'elevenlabs' ? config.elevenlabs.voice_id : config.macos_say.voice}`));

    const message = "Voice notifications test successful";
    await speak(message, config);

    console.log(chalk.green('✓ Test complete'));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

main();
