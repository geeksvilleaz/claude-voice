// Event filtering logic

function shouldSpeak(eventData, config, rateLimiter) {
  // Check if globally enabled
  if (!config.enabled) return false;

  // Check manual disable flag
  if (process.env.VOICE_NOTIFICATIONS === 'false') return false;

  // Rate limiting
  if (!rateLimiter.allow()) {
    return false;
  }

  // Get event details
  const eventType = eventData.hook_event_name || process.env.VOICE_EVENT_TYPE || '';
  const toolName = eventData.tool_name || '';

  // Check "speak only when waiting" mode
  if (config.filters.speak_only_when_waiting) {
    const isWaitingForInput = (
      toolName === 'AskUserQuestion' ||
      (eventType === 'Stop' && eventData.tool_use_count > 0)
    );

    if (!isWaitingForInput) {
      rateLimiter.reset();
      return false;
    }
  }

  // Check "speak only on completion" mode
  if (config.filters.speak_only_on_completion) {
    // For completion mode, only speak on Stop events (task finished)
    // and not on individual tool completions
    if (eventType !== 'Stop') {
      rateLimiter.reset();
      return false;
    }
  }

  // Filter by duration (for tool completions)
  if (eventData.duration_ms !== undefined &&
      eventData.duration_ms < config.filters.min_duration_ms) {
    // Reset rate limiter since we're not speaking
    rateLimiter.reset();
    return false;
  }

  // Filter by tool type
  if (config.filters.excluded_tools &&
      config.filters.excluded_tools.includes(toolName)) {
    rateLimiter.reset();
    return false;
  }

  // Filter by event type
  if (eventType === 'PostToolUse' && !config.filters.speak_completions) {
    rateLimiter.reset();
    return false;
  }

  if (eventType === 'Stop' && !config.filters.speak_responses) {
    rateLimiter.reset();
    return false;
  }

  if (eventData.tool_response?.error && !config.filters.speak_errors) {
    rateLimiter.reset();
    return false;
  }

  return true;
}

module.exports = { shouldSpeak };
