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

  // Filter by duration (for tool completions)
  if (eventData.duration_ms !== undefined &&
      eventData.duration_ms < config.filters.min_duration_ms) {
    // Reset rate limiter since we're not speaking
    rateLimiter.reset();
    return false;
  }

  // Filter by tool type
  const toolName = eventData.tool_name || '';
  if (config.filters.excluded_tools &&
      config.filters.excluded_tools.includes(toolName)) {
    rateLimiter.reset();
    return false;
  }

  // Filter by event type
  const eventType = eventData.hook_event_name || process.env.VOICE_EVENT_TYPE || '';

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
