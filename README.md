# Claude Voice Notifications

Voice notifications for Claude Code with configurable TTS (ElevenLabs & macOS say).

## Features

- 🎙️ **Voice notifications** for Claude Code completions, errors, and responses
- 🔀 **Dual TTS support**: ElevenLabs (premium AI voices) or macOS say (built-in)
- ⚙️ **Configurable**: CLI commands to switch providers, change voices, and adjust settings
- 📦 **Easy distribution**: Single-command installation for your team
- 🔧 **Smart filtering**: Only speaks for operations >5 seconds (configurable)
- 🔄 **Automatic fallback**: Falls back to macOS say if ElevenLabs fails

## Installation

### Prerequisites

- macOS
- Node.js >=16
- Claude Code installed

### Install

```bash
npm install -g claude-voice
claude-voice-setup
```

The setup will:
1. Configure your TTS provider
2. Set up Claude Code hooks
3. Install shell helper functions
4. Test the installation

### For Team Distribution (GitHub Packages)

**One-time setup:**

```bash
# Add to ~/.npmrc
echo "@your-org:registry=https://npm.pkg.github.com" >> ~/.npmrc

# Authenticate (requires GitHub Personal Access Token with read:packages scope)
npm login --scope=@your-org --registry=https://npm.pkg.github.com

# Install
npm install -g @your-org/claude-voice
claude-voice-setup
```

## Usage

### CLI Commands

| Command | Description |
|---------|-------------|
| `claude-voice-setup` | Install/update voice notifications |
| `voice-test` | Test current TTS configuration |
| `voice-use-elevenlabs` | Switch to ElevenLabs TTS |
| `voice-use-apple` | Switch to macOS say |
| `voice-set-voice <name>` | Change voice for current provider |
| `voice-config` | View/edit configuration |
| `voice-config --show` | Display current config |
| `voice-config --edit` | Interactive config editor |
| `voice-config --reset` | Reset to team defaults |
| `voice-on` | Enable notifications |
| `voice-off` | Disable notifications |
| `voice-status` | Check current status |

### ElevenLabs Setup

1. Get API key from https://elevenlabs.io/app/settings/api-keys
2. Add to your shell config:
   ```bash
   echo 'export ELEVENLABS_API_KEY="your_key_here"' >> ~/.zshrc
   source ~/.zshrc
   ```
3. Switch to ElevenLabs:
   ```bash
   voice-use-elevenlabs
   ```

### Changing Voices

**macOS say:**
```bash
say -v "?" | grep en_  # List available voices
voice-set-voice Daniel  # Change to Daniel
```

**ElevenLabs:**
```bash
# Browse voices at: https://elevenlabs.io/voice-library
voice-set-voice XsmrVB66q3D4TaXVaWNF  # Use voice ID
```

## Configuration

Default configuration is at `~/.claude/scripts/voice-config.json`:

```json
{
  "enabled": true,
  "tts_service": "elevenlabs",
  "fallback_to_say": true,
  "filters": {
    "min_duration_ms": 5000,
    "excluded_tools": ["Read"],
    "speak_errors": true,
    "speak_completions": true,
    "speak_responses": true
  },
  "elevenlabs": {
    "voice_id": "21m00Tcm4TlvDq8ikWAM",
    "model_id": "eleven_flash_v2_5",
    "stability": 0.5,
    "similarity_boost": 0.75,
    "optimize_streaming_latency": 2
  },
  "macos_say": {
    "voice": "Samantha",
    "rate": 200
  }
}
```

### Configuration Hierarchy

1. `VOICE_CONFIG_FILE` environment variable (if set)
2. User config: `~/.claude/scripts/voice-config.json`
3. Team default: `node_modules/claude-voice/config/team-default.json`

User customizations are preserved during package updates.

## When Notifications Trigger

Voice notifications speak when:
- Commands/operations take longer than 5 seconds (configurable)
- Errors occur
- Claude finishes responding (Stop events)
- Tool completions happen (PostToolUse)

## Team Workflow

### For Maintainers

1. Update team config:
   ```bash
   edit config/team-default.json
   npm version minor
   npm publish
   ```

2. Team members update:
   ```bash
   npm update -g @your-org/claude-voice
   # Optionally reset to new defaults:
   voice-config --reset
   ```

### Customization

Users can customize while preserving team defaults:
- Config changes are saved to user config
- Package updates bring new team defaults
- `voice-config --reset` adopts latest team defaults

## Troubleshooting

### No voice notifications

```bash
# Check config
voice-config --show

# Check hooks
cat ~/.claude/settings.json | grep voice-notify

# Test directly
voice-test

# Check environment
voice-status
```

### ElevenLabs errors

- **401 Unauthorized**: Check `ELEVENLABS_API_KEY` is set
- **429 Rate limit**: System will auto-retry or fallback
- **quota_exceeded**: Will fallback to macOS say

### Too many notifications

```bash
voice-config --edit
# Increase min_duration_ms to 10000 (10 seconds)
# Or add tools to excluded_tools
```

## Development

```bash
# Clone repo
git clone https://github.com/your-org/claude-voice
cd claude-voice

# Install dependencies
npm install

# Test locally
npm link
claude-voice-setup

# Make changes and test
node bin/voice-test.js
```

## License

MIT
