// Configuration Manager with fallback chain
const { readFileSync, writeFileSync, existsSync, copyFileSync } = require('fs');
const { join } = require('path');

class ConfigManager {
  constructor() {
    this.userConfigPath = join(process.env.HOME, '.claude/scripts/voice-config.json');
    this.teamDefaultPath = this.getTeamDefaultPath();
  }

  getTeamDefaultPath() {
    // When installed as package, use package's config
    try {
      return require.resolve('../config/team-default.json');
    } catch (e) {
      // Fallback for development
      return join(__dirname, '../config/team-default.json');
    }
  }

  // Load config with fallback chain: env > user > team
  load() {
    // Check for environment override
    if (process.env.VOICE_CONFIG_FILE && existsSync(process.env.VOICE_CONFIG_FILE)) {
      return JSON.parse(readFileSync(process.env.VOICE_CONFIG_FILE, 'utf8'));
    }

    // Load user config if exists
    if (existsSync(this.userConfigPath)) {
      const userConfig = JSON.parse(readFileSync(this.userConfigPath, 'utf8'));
      const teamDefault = this.loadTeamDefault();
      return this.mergeConfig(teamDefault, userConfig);
    }

    // Fall back to team default
    return this.loadTeamDefault();
  }

  loadTeamDefault() {
    try {
      return JSON.parse(readFileSync(this.teamDefaultPath, 'utf8'));
    } catch (error) {
      // Return hardcoded default if team default not found
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

  // Deep merge team default with user config
  mergeConfig(teamDefault, userConfig) {
    return {
      enabled: userConfig.enabled ?? teamDefault.enabled,
      tts_service: userConfig.tts_service ?? teamDefault.tts_service,
      fallback_to_say: userConfig.fallback_to_say ?? teamDefault.fallback_to_say,
      verbosity: userConfig.verbosity ?? teamDefault.verbosity,
      filters: {
        ...teamDefault.filters,
        ...(userConfig.filters || {})
      },
      elevenlabs: {
        ...teamDefault.elevenlabs,
        ...(userConfig.elevenlabs || {})
      },
      macos_say: {
        ...teamDefault.macos_say,
        ...(userConfig.macos_say || {})
      }
    };
  }

  // Save config to user location
  save(config) {
    writeFileSync(this.userConfigPath, JSON.stringify(config, null, 2));
  }

  // Get current config path
  getConfigPath() {
    if (process.env.VOICE_CONFIG_FILE) {
      return process.env.VOICE_CONFIG_FILE;
    }
    return this.userConfigPath;
  }

  // Switch TTS provider
  switchTTSProvider(provider) {
    if (!['elevenlabs', 'macos_say'].includes(provider)) {
      throw new Error(`Invalid provider: ${provider}. Must be 'elevenlabs' or 'macos_say'`);
    }

    const config = this.load();
    config.tts_service = provider;
    this.save(config);
    return config;
  }

  // Update voice for current provider
  updateVoice(provider, voiceId) {
    const config = this.load();

    if (provider === 'elevenlabs') {
      if (!config.elevenlabs) {
        config.elevenlabs = {};
      }
      config.elevenlabs.voice_id = voiceId;
    } else if (provider === 'macos_say') {
      if (!config.macos_say) {
        config.macos_say = { rate: 200 };
      }
      config.macos_say.voice = voiceId;
    } else {
      throw new Error(`Invalid provider: ${provider}`);
    }

    this.save(config);
    return config;
  }

  // Reset to team defaults
  resetToDefaults() {
    if (existsSync(this.userConfigPath)) {
      // Backup existing config
      const backupPath = this.userConfigPath + '.backup';
      copyFileSync(this.userConfigPath, backupPath);
    }

    // Copy team default to user config
    const teamDefault = this.loadTeamDefault();
    this.save(teamDefault);

    return teamDefault;
  }

  // Check if user config exists
  hasUserConfig() {
    return existsSync(this.userConfigPath);
  }
}

module.exports = ConfigManager;
