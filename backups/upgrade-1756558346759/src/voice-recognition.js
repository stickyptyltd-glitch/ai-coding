import record from 'node-record-lpcm16';
import speech from '@google-cloud/speech';
import fs from 'fs';

class VoiceRecognition {
  constructor(options = {}) {
    this.client = new speech.SpeechClient();
    this.isRecording = false;
    this.audioConfig = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: options.languageCode || 'en-US',
    };
    this.recordingStream = null;
    this.knownVoices = new Map();
  }

  async startRecording(duration = 5000) {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    return new Promise((resolve, reject) => {
      const audioBuffer = [];
      
      this.recordingStream = record.record({
        sampleRateHertz: this.audioConfig.sampleRateHertz,
        threshold: 0,
        verbose: false,
        recordProgram: 'rec',
        silence: '1.0s'
      });

      this.recordingStream.stream()
        .on('data', (chunk) => {
          audioBuffer.push(chunk);
        })
        .on('error', (err) => {
          this.isRecording = false;
          reject(err);
        });

      this.isRecording = true;
      console.log('Recording started...');

      setTimeout(() => {
        this.stopRecording();
        const audioData = Buffer.concat(audioBuffer);
        resolve(audioData);
      }, duration);
    });
  }

  stopRecording() {
    if (this.isRecording && this.recordingStream) {
      this.recordingStream.stop();
      this.isRecording = false;
      console.log('Recording stopped');
    }
  }

  async recognizeSpeech(audioBuffer) {
    try {
      const request = {
        audio: {
          content: audioBuffer.toString('base64'),
        },
        config: this.audioConfig,
      };

      const [response] = await this.client.recognize(request);
      const transcriptions = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      return {
        success: true,
        transcript: transcriptions,
        confidence: response.results[0]?.alternatives[0]?.confidence || 0
      };
    } catch (error) {
      console.error('Error recognizing speech:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async recognizeFromFile(audioFilePath) {
    try {
      if (!fs.existsSync(audioFilePath)) {
        throw new Error('Audio file not found');
      }

      const audioBytes = fs.readFileSync(audioFilePath).toString('base64');
      
      const request = {
        audio: {
          content: audioBytes,
        },
        config: this.audioConfig,
      };

      const [response] = await this.client.recognize(request);
      const transcriptions = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      return {
        success: true,
        transcript: transcriptions,
        confidence: response.results[0]?.alternatives[0]?.confidence || 0
      };
    } catch (error) {
      console.error('Error recognizing speech from file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async recordAndRecognize(duration = 5000) {
    try {
      const audioBuffer = await this.startRecording(duration);
      return await this.recognizeSpeech(audioBuffer);
    } catch (error) {
      console.error('Error in record and recognize:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async addKnownVoice(name, voiceDescription) {
    this.knownVoices.set(name, {
      description: voiceDescription,
      samples: []
    });
    console.log(`Added known voice: ${name}`);
  }

  async identifyVoice(transcript) {
    for (const name of this.knownVoices.keys()) {
      if (transcript.toLowerCase().includes(name.toLowerCase())) {
        return {
          identified: true,
          name: name,
          confidence: 0.8
        };
      }
    }
    
    return {
      identified: false,
      name: 'Unknown',
      confidence: 0
    };
  }

  getKnownVoices() {
    return Array.from(this.knownVoices.keys());
  }

  removeKnownVoice(name) {
    return this.knownVoices.delete(name);
  }

  isCurrentlyRecording() {
    return this.isRecording;
  }
}

export default VoiceRecognition;
