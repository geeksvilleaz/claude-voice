// Generate human-friendly messages from event data

function generateMessage(eventData, config) {
  const eventType = eventData.hook_event_name || process.env.VOICE_EVENT_TYPE || '';
  const toolName = eventData.tool_name || '';

  // Handle Stop event (Claude response complete)
  if (eventType === 'Stop' || process.env.VOICE_EVENT_TYPE === 'stop') {
    const toolCount = eventData.tool_use_count || 0;
    if (toolCount === 0) {
      return "Response complete";
    }
    return `Response complete after ${toolCount} tool ${toolCount === 1 ? 'call' : 'calls'}`;
  }

  // Handle Notification event
  if (eventType === 'Notification' || process.env.VOICE_EVENT_TYPE === 'notification') {
    return "Notification received";
  }

  // Handle PostToolUse events
  const duration = eventData.duration_ms ? (eventData.duration_ms / 1000).toFixed(1) : null;

  // Check for errors
  if (eventData.tool_response?.error || eventData.error) {
    return `Error in ${toolName || 'operation'}`;
  }

  // Tool-specific messages
  switch (toolName) {
    case 'Bash':
      // Try to detect specific operations from command
      const command = eventData.tool_input?.command || '';
      if (command.includes('npm run build') || command.includes('build')) {
        return duration ? `Build completed in ${duration} seconds` : 'Build completed';
      }
      if (command.includes('npm test') || command.includes('test')) {
        return duration ? `Tests finished in ${duration} seconds` : 'Tests finished';
      }
      if (command.includes('npm install')) {
        return duration ? `Install completed in ${duration} seconds` : 'Install completed';
      }
      return duration ? `Command completed in ${duration} seconds` : 'Command completed';

    case 'Edit':
      const filename = eventData.tool_input?.file_path?.split('/').pop() || 'file';
      return `Edited ${filename}`;

    case 'Write':
      const wFilename = eventData.tool_input?.file_path?.split('/').pop() || 'file';
      return `Created ${wFilename}`;

    case 'Grep':
      return 'Search complete';

    case 'Glob':
      return 'File search complete';

    case 'Task':
      return duration ? `Task completed in ${duration} seconds` : 'Task completed';

    default:
      if (duration) {
        return `${toolName} completed in ${duration} seconds`;
      }
      return toolName ? `${toolName} completed` : 'Operation completed';
  }
}

module.exports = { generateMessage };
