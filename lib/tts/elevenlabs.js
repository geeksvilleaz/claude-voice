// ElevenLabs TTS provider
const { spawn } = require('child_process');
const { writeFileSync, unlinkSync } = require('fs');
const { tmpdir } = require('os');
const { join } = require('path');

async function speakWithElevenLabs(text, config) {
  try {
    const { ElevenLabsClient } = require("@elevenlabs/elevenlabs-js");

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY not set');
    }

    const client = new ElevenLabsClient({ apiKey });

    const audio = await client.textToSpeech.convert(
      config.elevenlabs.voice_id,
      {
        text: text,
        model_id: config.elevenlabs.model_id,
        voice_settings: {
          stability: config.elevenlabs.stability,
          similarity_boost: config.elevenlabs.similarity_boost,
          optimize_streaming_latency: config.elevenlabs.optimize_streaming_latency
        },
        output_format: "mp3_44100_128"
      }
    );

    // Write to temp file and play
    const tempFile = join(tmpdir(), `claude-voice-${Date.now()}.mp3`);

    // Collect audio chunks
    const chunks = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    writeFileSync(tempFile, buffer);

    // Play the file
    return new Promise((resolve, reject) => {
      const player = spawn('afplay', [tempFile]);
      player.on('close', (code) => {
        // Cleanup temp file
        try { unlinkSync(tempFile); } catch (e) {}
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`afplay exited with code ${code}`));
        }
      });
      player.on('error', (err) => {
        try { unlinkSync(tempFile); } catch (e) {}
        reject(err);
      });
    });

  } catch (error) {
    console.error('ElevenLabs error:', error.message);
    throw error;
  }
}

module.exports = { speakWithElevenLabs };
