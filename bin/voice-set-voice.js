#!/usr/bin/env node

const chalk = require('chalk');
const { program } = require('commander');
const { spawn } = require('child_process');
const ConfigManager = require('../lib/config-manager');

program
  .name('voice-set-voice')
  .description('Change the voice for the current TTS provider')
  .argument('[voice]', 'Voice ID or name')
  .option('-l, --list', 'List available voices')
  .parse();

async function listMacOSVoices() {
  return new Promise((resolve, reject) => {
    const say = spawn('say', ['-v', '?']);
    let output = '';

    say.stdout.on('data', (data) => output += data);
    say.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.blue('Available macOS voices:'));
        console.log(output);
        resolve();
      } else {
        reject(new Error('Failed to list voices'));
      }
    });
  });
}

async function main() {
  const options = program.opts();
  const voice = program.args[0];
  const configManager = new ConfigManager();
  const config = configManager.load();

  // List voices
  if (options.list) {
    if (config.tts_service === 'macos_say') {
      await listMacOSVoices();
    } else {
      console.log(chalk.blue('Available ElevenLabs voices:'));
      console.log('Visit: https://elevenlabs.io/voice-library');
      console.log('\nOr use API to list:');
      console.log(chalk.cyan('curl -H "xi-api-key: $ELEVENLABS_API_KEY" https://api.elevenlabs.io/v1/voices'));
    }
    return;
  }

  // Set voice
  if (!voice) {
    console.error(chalk.red('Please provide a voice ID or name'));
    console.log('Usage: voice-set-voice <voice>');
    console.log('       voice-set-voice --list');
    process.exit(1);
  }

  try {
    const updatedConfig = configManager.updateVoice(config.tts_service, voice);

    console.log(chalk.green(`✓ Voice updated to: ${voice}`));
    console.log(`Provider: ${config.tts_service}`);

    // Test the new voice
    console.log(chalk.gray('\nTesting new voice...'));
    const { speak } = require('../lib/voice-notify');
    await speak('Voice successfully changed', updatedConfig);

  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

main();
