// macOS say TTS provider
const { spawn } = require('child_process');

async function speakWithMacOSSay(text, config) {
  return new Promise((resolve, reject) => {
    const sayConfig = config.macos_say || { voice: 'Samantha', rate: 200 };
    const say = spawn('say', [
      '-v', sayConfig.voice,
      '-r', sayConfig.rate.toString(),
      text
    ]);

    say.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`say exited with code ${code}`));
      }
    });
    say.on('error', reject);
  });
}

module.exports = { speakWithMacOSSay };
