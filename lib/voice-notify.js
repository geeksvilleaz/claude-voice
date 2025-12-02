#!/usr/bin/env node

const { readFileSync } = require('fs');
const { join } = require('path');
const RateLimiter = require('./utils/rate-limiter');
const { shouldSpeak } = require('./utils/event-filter');
const { generateMessage } = require('./utils/message-generator');
const { speakWithElevenLabs } = require('./tts/elevenlabs');
const { speakWithMacOSSay } = require('./tts/macos-say');

// Global rate limiter
const rateLimiter = new RateLimiter(2000);

// Load configuration
function loadConfig() {
  const configPath = process.env.VOICE_CONFIG_FILE ||
    join(process.env.HOME, '.claude/scripts/voice-config.json');

  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error('Failed to load config:', error.message);
    // Return default config
    return {
      enabled: true,
      tts_service: 'macos_say',
      fallback_to_say: true,
      filters: {
        min_duration_ms: 5000,
        excluded_tools: ['Read'],
        speak_errors: true,
        speak_completions: true,
        speak_responses: true
      },
      macos_say: {
        voice: 'Samantha',
        rate: 200
      }
    };
  }
}

// Read event data from stdin
async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => {
      try {
        if (!data.trim()) {
          resolve({});
        } else {
          resolve(JSON.parse(data));
        }
      } catch (err) {
        console.error('Failed to parse JSON:', err.message);
        resolve({});
      }
    });
    process.stdin.on('error', reject);
  });
}

// Main speak function with fallback logic
async function speak(message, config) {
  if (config.tts_service === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
    try {
      await speakWithElevenLabs(message, config);
      return;
    } catch (error) {
      console.error('ElevenLabs failed:', error.message);
      if (config.fallback_to_say) {
        console.log('Falling back to macOS say...');
        await speakWithMacOSSay(message, config);
      }
    }
  } else {
    // Use macOS say directly
    await speakWithMacOSSay(message, config);
  }
}

// Main execution
async function main() {
  try {
    const config = loadConfig();
    const eventData = await readStdin();

    // Check if should speak
    if (!shouldSpeak(eventData, config, rateLimiter)) {
      process.exit(0);
    }

    // Generate message
    const message = generateMessage(eventData, config);

    // Speak message
    await speak(message, config);

    process.exit(0);
  } catch (error) {
    console.error('Voice notification error:', error.message);
    process.exit(1);
  }
}

// Run main function if called directly
if (require.main === module) {
  main();
}

module.exports = { loadConfig, speak, generateMessage, shouldSpeak };
