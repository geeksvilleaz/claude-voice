#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ConfigManager = require('../lib/config-manager');

function setMode(mode) {
  const configManager = new ConfigManager();
  const config = configManager.load();

  switch (mode) {
    case 'waiting':
      config.filters.speak_only_when_waiting = true;
      config.filters.speak_only_on_completion = false;
      console.log('✓ Voice mode: WAITING FOR INPUT');
      console.log('  Will only speak when Claude asks a question or finishes working');
      break;

    case 'completion':
      config.filters.speak_only_when_waiting = false;
      config.filters.speak_only_on_completion = true;
      console.log('✓ Voice mode: TASK COMPLETION');
      console.log('  Will only speak when tasks are complete');
      break;

    case 'normal':
      config.filters.speak_only_when_waiting = false;
      config.filters.speak_only_on_completion = false;
      console.log('✓ Voice mode: NORMAL');
      console.log('  Will speak on all enabled events (completions, responses, errors)');
      break;

    default:
      console.error('Unknown mode:', mode);
      console.error('Valid modes: waiting, completion, normal');
      process.exit(1);
  }

  // Save config
  configManager.save(config);
}

// Parse command line
const mode = process.argv[2];

if (!mode) {
  console.log('Usage: voice-mode <waiting|completion|normal>');
  console.log('');
  console.log('Modes:');
  console.log('  waiting    - Only speak when waiting for your input');
  console.log('  completion - Only speak when tasks are complete');
  console.log('  normal     - Speak on all enabled events (default)');
  process.exit(1);
}

setMode(mode);
