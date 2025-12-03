# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`claude-voice` is a voice notification package for Claude Code that provides TTS (text-to-speech) announcements when Claude completes tasks, encounters errors, or finishes responses. It supports two TTS providers:
- **ElevenLabs**: Premium AI voices (requires API key)
- **macOS say**: Built-in system TTS

The package is designed for team distribution via GitHub Packages (npm) and installs as a global npm package.

## Common Commands

### Development & Testing
```bash
# Install dependencies
npm install

# Test locally without publishing
npm link
claude-voice-setup

# Test voice output directly
node lib/voice-notify.js

# Test specific CLI commands
node bin/voice-test.js
node bin/voice-config.js --show
```

### Publishing
```bash
# Update version and publish to GitHub Packages
npm version minor
npm publish

# Note: publishConfig in package.json points to GitHub Packages registry
```

## Architecture Overview

### Entry Points

**CLI Commands** (`bin/`):
- `claude-voice-setup.js` - Interactive installer that configures Claude hooks, config files, and shell functions
- `voice-test.js` - Tests current TTS configuration
- `voice-use-elevenlabs.js` / `voice-use-apple.js` - Switch TTS provider
- `voice-set-voice.js` - Change voice for current provider
- `voice-config.js` - View/edit configuration interactively

**Core Library** (`lib/`):
- `voice-notify.js` - Main entry point invoked by Claude Code hooks

### Configuration System

The package uses a **three-tier fallback chain** (lib/config-manager.js:21-37):

1. **Environment override**: `VOICE_CONFIG_FILE` env var (if set)
2. **User config**: `~/.claude/scripts/voice-config.json` (user customizations)
3. **Team default**: `config/team-default.json` (package defaults, updated on npm install)

User customizations are merged with team defaults and preserved during package updates. The `ConfigManager` class handles this merge logic and provides methods to switch providers, update voices, and reset to defaults.

### Hook Integration

Voice notifications are triggered via **Claude Code hooks** configured in `~/.claude/settings.json` (templates/settings-hooks.json):

- `PostToolUse` - After tool completions (e.g., Read, Write, Bash)
- `Stop` - When Claude finishes responding
- `Notification` - General notifications

Each hook runs `node voice-notify.js` which reads event data from stdin (JSON format).

### Event Flow

```
Claude Code Hook → voice-notify.js → Event Filter → Message Generator → TTS Provider
                       ↓                    ↓              ↓                ↓
                  reads stdin        shouldSpeak()   generateMessage()  speak()
                  (JSON event)       (filter logic)  (create message)  (ElevenLabs/say)
```

**Key modules:**
- `utils/event-filter.js` - Determines if event should trigger voice (duration, tool name, event type)
- `utils/message-generator.js` - Creates appropriate voice message from event data
- `utils/rate-limiter.js` - Prevents duplicate notifications (2000ms window)
- `tts/elevenlabs.js` - ElevenLabs API integration with streaming + afplay
- `tts/macos-say.js` - macOS say command wrapper

### Filtering Logic

Voice notifications only trigger when (lib/utils/event-filter.js):
- `config.enabled` is true
- `VOICE_NOTIFICATIONS` env var is not "false"
- Rate limiter allows (max 1 per 2 seconds)
- Duration exceeds `filters.min_duration_ms` (default: 5000ms)
- Tool is not in `filters.excluded_tools` (default: Read)
- Event type matches enabled filters (`speak_completions`, `speak_responses`, `speak_errors`)

### TTS Implementation

**ElevenLabs** (lib/tts/elevenlabs.js):
- Uses `@elevenlabs/elevenlabs-js` SDK
- Streams MP3 to temp file
- Plays with `afplay` (macOS audio player)
- Auto-cleanup of temp files
- Fallback to macOS say on error if `fallback_to_say: true`

**macOS say** (lib/tts/macos-say.js):
- Direct spawn of `say` command
- Configurable voice and speaking rate

## Installation Flow

The `claude-voice-setup.js` script performs:

1. **Prerequisites check** - Verifies macOS, Node >=16, ~/.claude directory, say command
2. **TTS provider selection** - Interactive prompt (first install only)
3. **Configuration install** - Copies team-default.json to ~/.claude/scripts/voice-config.json
4. **Hook configuration** - Merges hook templates into ~/.claude/settings.json
5. **Shell functions** - Appends functions to ~/.zshrc or ~/.bashrc (voice-on, voice-off, voice-status)
6. **Test** - Runs voice test to verify installation

## Shell Helper Functions

Installed via templates/shell-functions.sh into user's shell config:

- `voice-on` / `voice-off` - Toggle via `VOICE_NOTIFICATIONS` env var
- `voice-status` - Display current state and TTS provider

## File Structure

```
lib/
  voice-notify.js         - Main entry point, hook integration
  config-manager.js       - Configuration fallback chain
  utils/
    event-filter.js       - Filtering logic (duration, tools, events)
    message-generator.js  - Message creation from events
    rate-limiter.js       - Prevent duplicate notifications
  tts/
    elevenlabs.js         - ElevenLabs TTS provider
    macos-say.js          - macOS say TTS provider

bin/                      - CLI commands (all chmod +x)
config/
  team-default.json       - Team-wide defaults
templates/
  settings-hooks.json     - Hook configuration template
  shell-functions.sh      - Shell helper functions
```

## Important Implementation Details

- **macOS only**: Package explicitly requires macOS (package.json:os)
- **Node >=16**: Required for dependencies (package.json:engines)
- **afplay**: macOS built-in audio player, used for ElevenLabs MP3 playback
- **Stdin JSON**: Hooks pass event data via stdin, parsed in voice-notify.js:20-39
- **Path replacement**: Setup script replaces `[VOICE_NOTIFY_PATH]` placeholder in templates
- **No tests**: package.json:scripts includes only stub test command

## Configuration Reference

Key config options in voice-config.json:

```json
{
  "enabled": true,                    // Master toggle
  "tts_service": "elevenlabs",        // or "macos_say"
  "fallback_to_say": true,            // Fallback on ElevenLabs error
  "filters": {
    "min_duration_ms": 5000,          // Only speak if operation >5s
    "excluded_tools": ["Read"],       // Tools to ignore
    "speak_errors": true,
    "speak_completions": true,
    "speak_responses": true
  },
  "elevenlabs": {
    "voice_id": "...",                // Voice ID from ElevenLabs
    "model_id": "eleven_flash_v2_5",
    "stability": 0.5,
    "similarity_boost": 0.75
  },
  "macos_say": {
    "voice": "Samantha",              // macOS voice name
    "rate": 200                       // Words per minute
  }
}
```

## Dependencies

Production dependencies:
- `@elevenlabs/elevenlabs-js` - ElevenLabs API client
- `commander` - CLI framework
- `chalk` - Terminal colors
- `inquirer` - Interactive prompts

No test or build dependencies.
