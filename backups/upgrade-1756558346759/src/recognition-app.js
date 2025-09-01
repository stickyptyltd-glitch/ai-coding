import FacialRecognition from './facial-recognition.js';
import VoiceRecognition from './voice-recognition.js';

class RecognitionApp {
  constructor(options = {}) {
    this.facialRecognition = new FacialRecognition();
    this.voiceRecognition = new VoiceRecognition(options.voice);
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('Initializing recognition systems...');
      await this.facialRecognition.initialize();
      console.log('Recognition app initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize recognition app:', error);
      throw error;
    }
  }

  async addPerson(name, options = {}) {
    const results = {};

    if (options.imagePath) {
      try {
        const faceAdded = await this.facialRecognition.addKnownFace(name, options.imagePath);
        results.faceAdded = faceAdded;
      } catch (error) {
        results.faceError = error.message;
      }
    }

    if (options.voiceDescription) {
      try {
        await this.voiceRecognition.addKnownVoice(name, options.voiceDescription);
        results.voiceAdded = true;
      } catch (error) {
        results.voiceError = error.message;
      }
    }

    return results;
  }

  async recognizePerson(options = {}) {
    const results = {
      timestamp: new Date().toISOString(),
      facial: null,
      voice: null,
      combined: null
    };

    if (options.imagePath) {
      try {
        results.facial = await this.facialRecognition.recognizeFace(options.imagePath);
      } catch (error) {
        results.facial = { error: error.message };
      }
    }

    if (options.recordVoice) {
      try {
        const duration = options.recordDuration || 5000;
        results.voice = await this.voiceRecognition.recordAndRecognize(duration);
        
        if (results.voice.success && results.voice.transcript) {
          const voiceId = await this.voiceRecognition.identifyVoice(results.voice.transcript);
          results.voice.identification = voiceId;
        }
      } catch (error) {
        results.voice = { error: error.message };
      }
    }

    if (options.audioFilePath) {
      try {
        results.voice = await this.voiceRecognition.recognizeFromFile(options.audioFilePath);
        
        if (results.voice.success && results.voice.transcript) {
          const voiceId = await this.voiceRecognition.identifyVoice(results.voice.transcript);
          results.voice.identification = voiceId;
        }
      } catch (error) {
        results.voice = { error: error.message };
      }
    }

    results.combined = this.combineResults(results);
    return results;
  }

  combineResults(results) {
    const combined = {
      personIdentified: false,
      confidence: 0,
      identifiedAs: 'Unknown',
      details: []
    };

    if (results.facial && results.facial.recognized && results.facial.faces.length > 0) {
      const face = results.facial.faces[0];
      if (face.name !== 'Unknown') {
        combined.details.push({
          method: 'facial',
          name: face.name,
          confidence: face.confidence
        });
      }
    }

    if (results.voice && results.voice.identification && results.voice.identification.identified) {
      combined.details.push({
        method: 'voice',
        name: results.voice.identification.name,
        confidence: results.voice.identification.confidence
      });
    }

    if (combined.details.length > 0) {
      const bestMatch = combined.details.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      
      combined.personIdentified = true;
      combined.identifiedAs = bestMatch.name;
      combined.confidence = bestMatch.confidence;

      const samePersonMatches = combined.details.filter(d => d.name === bestMatch.name);
      if (samePersonMatches.length > 1) {
        combined.confidence = Math.min(combined.confidence * 1.2, 1.0);
      }
    }

    return combined;
  }

  async listKnownPeople() {
    return {
      faces: this.facialRecognition.getKnownFaces(),
      voices: this.voiceRecognition.getKnownVoices()
    };
  }

  async removePerson(name) {
    const results = {
      faceRemoved: this.facialRecognition.removeKnownFace(name),
      voiceRemoved: this.voiceRecognition.removeKnownVoice(name)
    };
    
    return results;
  }

  async startVoiceRecording(duration = 5000) {
    return await this.voiceRecognition.startRecording(duration);
  }

  stopVoiceRecording() {
    this.voiceRecognition.stopRecording();
  }

  isRecording() {
    return this.voiceRecognition.isCurrentlyRecording();
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      recording: this.isRecording(),
      knownPeople: this.listKnownPeople()
    };
  }
}

export default RecognitionApp;
