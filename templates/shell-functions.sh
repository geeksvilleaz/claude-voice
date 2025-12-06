# Claude Voice Notifications
# Installed by claude-voice package

export VOICE_NOTIFICATIONS="${VOICE_NOTIFICATIONS:-true}"

voice-on() {
  export VOICE_NOTIFICATIONS="true"
  echo "Voice notifications enabled"
}

voice-off() {
  export VOICE_NOTIFICATIONS="false"
  echo "Voice notifications disabled"
}

voice-status() {
  if [ "$VOICE_NOTIFICATIONS" = "false" ]; then
    echo "Voice notifications: OFF"
  else
    echo "Voice notifications: ON"
  fi

  if command -v voice-config &> /dev/null; then
    echo ""
    voice-config --show | grep "tts_service"
  fi
}

voice-mode-waiting() {
  voice-mode waiting
}

voice-mode-completion() {
  voice-mode completion
}

voice-mode-normal() {
  voice-mode normal
}
