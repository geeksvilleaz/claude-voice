#!/usr/bin/env node

const chalk = require('chalk');
const { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, appendFileSync } = require('fs');
const { join } = require('path');
const { execSync, spawn } = require('child_process');
const inquirer = require('inquirer');
const stripJsonComments = require('strip-json-comments');

const HOME = process.env.HOME;
const CLAUDE_DIR = join(HOME, '.claude');
const SCRIPTS_DIR = join(CLAUDE_DIR, 'scripts');
const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');
const USER_CONFIG = join(SCRIPTS_DIR, 'voice-config.json');

console.log(chalk.blue.bold('\n🎙️  Claude Voice Notifications Setup\n'));

// Step 1: Check Prerequisites
async function checkPrerequisites() {
  console.log(chalk.blue('→ Checking prerequisites...'));

  // Check macOS
  if (process.platform !== 'darwin') {
    console.error(chalk.red('✗ This package requires macOS'));
    process.exit(1);
  }

  // Check Node version
  const nodeVersion = process.version.match(/^v(\d+)/)[1];
  if (parseInt(nodeVersion) < 16) {
    console.error(chalk.red(`✗ Node ${process.version} not supported. Requires >=16.0.0`));
    process.exit(1);
  }

  // Check ~/.claude exists
  if (!existsSync(CLAUDE_DIR)) {
    console.error(chalk.red('✗ ~/.claude directory not found'));
    console.log('Please ensure Claude Code is installed');
    process.exit(1);
  }

  // Check say command
  try {
    execSync('which say', { stdio: 'ignore' });
  } catch (error) {
    console.error(chalk.red('✗ macOS say command not found'));
    process.exit(1);
  }

  console.log(chalk.green('✓ Prerequisites met'));
}

// Step 2: Detect existing installation
function detectExistingInstallation() {
  const hasConfig = existsSync(USER_CONFIG);
  const hasOldScript = existsSync(join(SCRIPTS_DIR, 'voice-notify.js'));

  if (hasConfig || hasOldScript) {
    console.log(chalk.yellow('→ Existing installation detected'));
    return true;
  }
  return false;
}

// Step 3: Choose TTS provider
async function chooseTTSProvider() {
  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Choose your TTS provider:',
      choices: [
        { name: 'macOS say (built-in, no setup needed)', value: 'macos_say' },
        { name: 'ElevenLabs (high quality, requires API key)', value: 'elevenlabs' }
      ],
      default: 'macos_say'
    }
  ]);

  if (provider === 'elevenlabs' && !process.env.ELEVENLABS_API_KEY) {
    console.log(chalk.yellow('\n⚠️  ELEVENLABS_API_KEY not set'));
    console.log('You can set it later in your shell config:');
    console.log(chalk.cyan('export ELEVENLABS_API_KEY="your_key_here"'));
    console.log('Get your key from: https://elevenlabs.io/app/settings/api-keys\n');

    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Continue without API key? (will use macOS say)',
        default: true
      }
    ]);

    if (!proceed) {
      process.exit(0);
    }
  }

  return provider;
}

// Step 4: Install configuration
async function installConfiguration(provider, isUpdate) {
  console.log(chalk.blue('→ Installing configuration...'));

  // Create scripts directory if needed
  if (!existsSync(SCRIPTS_DIR)) {
    mkdirSync(SCRIPTS_DIR, { recursive: true });
  }

  // Determine config source
  const teamDefaultPath = join(__dirname, '../config/team-default.json');
  let config;

  if (isUpdate && existsSync(USER_CONFIG)) {
    // Keep existing config but update provider if specified
    config = JSON.parse(readFileSync(USER_CONFIG, 'utf8'));
    if (provider) {
      config.tts_service = provider;
    }
  } else {
    // New installation - copy team default
    config = JSON.parse(readFileSync(teamDefaultPath, 'utf8'));
    config.tts_service = provider || config.tts_service;
  }

  writeFileSync(USER_CONFIG, JSON.stringify(config, null, 2));
  console.log(chalk.green(`✓ Configuration saved to ${USER_CONFIG}`));

  return config;
}

// Step 5: Configure Claude hooks
async function configureHooks() {
  console.log(chalk.blue('→ Configuring Claude Code hooks...'));

  // Get voice-notify.js path from installed package
  const voiceNotifyPath = join(__dirname, '../lib/voice-notify.js');

  // Backup existing settings
  if (existsSync(SETTINGS_FILE)) {
    const backupPath = SETTINGS_FILE + '.backup';
    copyFileSync(SETTINGS_FILE, backupPath);
    console.log(chalk.gray(`  Backup saved: ${backupPath}`));
  }

  // Load existing settings or create new
  let settings = {};
  if (existsSync(SETTINGS_FILE)) {
    const settingsContent = readFileSync(SETTINGS_FILE, 'utf8');
    settings = JSON.parse(stripJsonComments(settingsContent));
  }

  // Ensure hooks object exists
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // Load template hooks
  const templatePath = join(__dirname, '../templates/settings-hooks.json');
  const template = JSON.parse(readFileSync(templatePath, 'utf8'));

  // Replace placeholder with actual path
  const templateStr = JSON.stringify(template).replace(/\[VOICE_NOTIFY_PATH\]/g, voiceNotifyPath);
  const voiceHooks = JSON.parse(templateStr).hooks;

  // Merge hooks (voice hooks come last to ensure they run)
  for (const [event, hooks] of Object.entries(voiceHooks)) {
    if (!settings.hooks[event]) {
      settings.hooks[event] = [];
    }

    // Check if voice hooks already exist
    const hasVoiceHook = settings.hooks[event].some(h =>
      h.hooks && h.hooks.some(hook =>
        hook.command && hook.command.includes('voice-notify')
      )
    );

    if (!hasVoiceHook) {
      // Add voice hooks
      settings.hooks[event].push(...hooks);
    } else {
      console.log(chalk.gray(`  ${event} hook already configured`));
    }
  }

  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  console.log(chalk.green(`✓ Hooks configured in ${SETTINGS_FILE}`));
}

// Step 6: Install shell functions
async function installShellFunctions() {
  console.log(chalk.blue('→ Installing shell functions...'));

  // Detect shell
  const shell = process.env.SHELL || '/bin/zsh';
  const shellName = shell.includes('zsh') ? 'zsh' : 'bash';
  const rcFile = shellName === 'zsh' ? join(HOME, '.zshrc') : join(HOME, '.bashrc');

  if (!existsSync(rcFile)) {
    console.log(chalk.yellow(`  ${rcFile} not found, skipping shell functions`));
    return;
  }

  // Check if already installed
  const rcContent = readFileSync(rcFile, 'utf8');
  if (rcContent.includes('# Claude Voice Notifications')) {
    console.log(chalk.gray('  Shell functions already installed'));
    return;
  }

  // Append shell functions
  const templatePath = join(__dirname, '../templates/shell-functions.sh');
  const shellFunctions = readFileSync(templatePath, 'utf8');

  appendFileSync(rcFile, '\n' + shellFunctions + '\n');
  console.log(chalk.green(`✓ Shell functions added to ${rcFile}`));

  return { rcFile, shellName };
}

// Step 7: Test installation
async function testInstallation(config) {
  console.log(chalk.blue('→ Testing voice notifications...'));

  try {
    const { speak } = require('../lib/voice-notify');
    await speak('Installation test successful', config);
    console.log(chalk.green('✓ Voice test passed'));
    return true;
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Voice test failed: ${error.message}`));
    return false;
  }
}

// Step 8: Show next steps
function showNextSteps(shellInfo) {
  console.log(chalk.green.bold('\n✅ Installation complete!\n'));

  if (shellInfo) {
    console.log(chalk.blue('Next steps:'));
    console.log(`1. Reload your shell: ${chalk.cyan(`source ${shellInfo.rcFile}`)}`);
    console.log(`2. Or restart your terminal\n`);
  }

  console.log(chalk.blue('Available commands:'));
  console.log(`  ${chalk.cyan('voice-test')}              Test voice notifications`);
  console.log(`  ${chalk.cyan('voice-use-elevenlabs')}    Switch to ElevenLabs`);
  console.log(`  ${chalk.cyan('voice-use-apple')}         Switch to macOS say`);
  console.log(`  ${chalk.cyan('voice-set-voice <name>')}  Change voice`);
  console.log(`  ${chalk.cyan('voice-config')}            View/edit config`);
  console.log(`  ${chalk.cyan('voice-on/voice-off')}      Toggle notifications`);
  console.log(`  ${chalk.cyan('voice-status')}            Check status\n`);

  console.log(chalk.gray('Voice notifications will trigger for:'));
  console.log(chalk.gray('  • Commands taking >5 seconds'));
  console.log(chalk.gray('  • Errors'));
  console.log(chalk.gray('  • Response completions\n'));
}

// Main installation flow
async function main() {
  try {
    await checkPrerequisites();

    const isUpdate = detectExistingInstallation();
    let provider = null;

    if (!isUpdate) {
      provider = await chooseTTSProvider();
    } else {
      console.log(chalk.gray('→ Updating existing installation\n'));
    }

    const config = await installConfiguration(provider, isUpdate);
    await configureHooks();
    const shellInfo = await installShellFunctions();
    await testInstallation(config);
    showNextSteps(shellInfo);

  } catch (error) {
    console.error(chalk.red('\n✗ Installation failed:'), error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
