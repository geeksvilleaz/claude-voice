#!/usr/bin/env node

const chalk = require('chalk');
const ConfigManager = require('../lib/config-manager');

async function main() {
  const configManager = new ConfigManager();

  // Check for API key
  if (!process.env.ELEVENLABS_API_KEY) {
    console.log(chalk.yellow('⚠️  ELEVENLABS_API_KEY not set'));
    console.log('Add to your shell config:');
    console.log(chalk.cyan('export ELEVENLABS_API_KEY="your_api_key_here"'));
    console.log('\nGet your API key from: https://elevenlabs.io/app/settings/api-keys');
    process.exit(1);
  }

  try {
    const config = configManager.switchTTSProvider('elevenlabs');

    console.log(chalk.green('✓ Switched to ElevenLabs TTS'));
    console.log(`Voice: ${config.elevenlabs.voice_id}`);
    console.log(`Model: ${config.elevenlabs.model_id}`);
    console.log(`Fallback to macOS say: ${config.fallback_to_say ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

main();
