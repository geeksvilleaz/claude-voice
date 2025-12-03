#!/usr/bin/env node

const { execSync, spawnSync } = require('child_process');
const { join } = require('path');
const fs = require('fs');
const chalk = require('chalk');

console.log(chalk.bold('\n🚀 Claude Voice Installation from Git\n'));

// Determine package root (directory containing this script's parent)
const packageRoot = join(__dirname, '..');

// Verify we're in the right directory
if (!fs.existsSync(join(packageRoot, 'package.json'))) {
  console.error(chalk.red('❌ Error: Cannot find package.json. Run this from the claude-voice directory.'));
  process.exit(1);
}

// Check if dependencies are installed
if (!fs.existsSync(join(packageRoot, 'node_modules'))) {
  console.log(chalk.yellow('📦 Installing dependencies...\n'));
  try {
    execSync('npm install', { cwd: packageRoot, stdio: 'inherit' });
    console.log(chalk.green('✅ Dependencies installed\n'));
  } catch (err) {
    console.error(chalk.red('❌ Failed to install dependencies'));
    process.exit(1);
  }
}

// CLI commands to symlink
const commands = [
  'claude-voice-setup',
  'voice-use-elevenlabs',
  'voice-use-apple',
  'voice-config',
  'voice-set-voice',
  'voice-test'
];

// Try to create symlinks in /usr/local/bin first (requires sudo)
// If that fails, fall back to ~/.local/bin
function createSymlinks() {
  const globalBinDir = '/usr/local/bin';
  const localBinDir = join(process.env.HOME, '.local', 'bin');

  // Check if we can write to /usr/local/bin
  const canWriteGlobal = fs.existsSync(globalBinDir) &&
    (() => {
      try {
        fs.accessSync(globalBinDir, fs.constants.W_OK);
        return true;
      } catch {
        return false;
      }
    })();

  let binDir;
  let needsPathUpdate = false;

  if (canWriteGlobal) {
    binDir = globalBinDir;
    console.log(chalk.blue(`📍 Installing commands to ${binDir}\n`));
  } else {
    binDir = localBinDir;

    // Create ~/.local/bin if it doesn't exist
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    console.log(chalk.blue(`📍 Installing commands to ${binDir}`));
    console.log(chalk.yellow('   (No sudo access to /usr/local/bin)\n'));

    // Check if ~/.local/bin is in PATH
    const pathDirs = process.env.PATH.split(':');
    if (!pathDirs.includes(binDir)) {
      needsPathUpdate = true;
    }
  }

  // Create symlinks for each command
  let successCount = 0;
  commands.forEach(cmd => {
    const source = join(packageRoot, 'bin', `${cmd}.js`);
    const target = join(binDir, cmd);

    try {
      // Remove existing symlink/file if it exists
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
      }

      // Create symlink
      fs.symlinkSync(source, target);

      // Make source executable
      fs.chmodSync(source, 0o755);

      console.log(chalk.green(`  ✅ ${cmd}`));
      successCount++;
    } catch (err) {
      console.error(chalk.red(`  ❌ ${cmd}: ${err.message}`));
    }
  });

  console.log(chalk.green(`\n✅ ${successCount}/${commands.length} commands installed\n`));

  // If using ~/.local/bin and it's not in PATH, update shell configs
  if (needsPathUpdate) {
    console.log(chalk.yellow('⚠️  Adding ~/.local/bin to PATH in shell configs...\n'));

    const shellConfigs = [
      join(process.env.HOME, '.zshrc'),
      join(process.env.HOME, '.bashrc')
    ];

    const pathExport = `\n# Added by claude-voice installer\nexport PATH="$HOME/.local/bin:$PATH"\n`;

    shellConfigs.forEach(config => {
      if (fs.existsSync(config)) {
        const content = fs.readFileSync(config, 'utf8');

        // Only add if not already present
        if (!content.includes('$HOME/.local/bin:$PATH') && !content.includes('${HOME}/.local/bin:$PATH')) {
          fs.appendFileSync(config, pathExport);
          console.log(chalk.green(`  ✅ Updated ${config}`));
        } else {
          console.log(chalk.gray(`  ℹ️  ${config} already configured`));
        }
      }
    });

    console.log(chalk.yellow('\n⚠️  Run `source ~/.zshrc` or restart your terminal to update PATH\n'));
  }
}

// Create symlinks
createSymlinks();

// Run the setup wizard
console.log(chalk.bold('🎙️  Running setup wizard...\n'));
console.log(chalk.gray('─'.repeat(50) + '\n'));

try {
  execSync('node bin/claude-voice-setup.js', {
    cwd: packageRoot,
    stdio: 'inherit'
  });
} catch (err) {
  console.error(chalk.red('\n❌ Setup wizard failed'));
  process.exit(1);
}

console.log(chalk.bold.green('\n🎉 Installation complete!\n'));
console.log(chalk.gray('Commands available:'));
commands.forEach(cmd => {
  console.log(chalk.gray(`  - ${cmd}`));
});
console.log('');
