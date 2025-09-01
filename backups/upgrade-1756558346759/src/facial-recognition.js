import * as faceapi from 'face-api.js';
import canvas from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

class FacialRecognition {
  constructor() {
    this.isInitialized = false;
    this.knownFaces = new Map();
    this.modelsPath = path.join(__dirname, '../models');
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.loadModels();
      console.log('Facial recognition models loaded successfully');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize facial recognition:', error);
      throw error;
    }
  }

  async loadModels() {
    if (!fs.existsSync(this.modelsPath)) {
      fs.mkdirSync(this.modelsPath, { recursive: true });
    }

    try {
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(this.modelsPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelsPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelsPath);
    } catch (error) {
      console.error('Model loading error:', error.message);
      throw new Error(`Failed to load models from ${this.modelsPath}. Run 'node setup-models.js' first.`);
    }
  }

  async detectFaces(imagePath) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const img = await canvas.loadImage(imagePath);
      const detections = await faceapi
        .detectAllFaces(img)
        .withFaceLandmarks()
        .withFaceDescriptors();

      return detections;
    } catch (error) {
      console.error('Error detecting faces:', error);
      return [];
    }
  }

  async addKnownFace(name, imagePath) {
    const detections = await this.detectFaces(imagePath);
    
    if (detections.length > 0) {
      this.knownFaces.set(name, detections[0].descriptor);
      console.log(`Added known face: ${name}`);
      return true;
    } else {
      console.error(`No face detected in image for ${name}`);
      return false;
    }
  }

  async recognizeFace(imagePath, threshold = 0.6) {
    const detections = await this.detectFaces(imagePath);
    
    if (detections.length === 0) {
      return { recognized: false, message: 'No faces detected' };
    }

    const results = [];
    
    for (const detection of detections) {
      let bestMatch = null;
      let bestDistance = Infinity;

      for (const [name, descriptor] of this.knownFaces.entries()) {
        const distance = faceapi.euclideanDistance(detection.descriptor, descriptor);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = name;
        }
      }

      if (bestMatch && bestDistance < threshold) {
        results.push({
          name: bestMatch,
          confidence: 1 - bestDistance,
          box: detection.detection.box
        });
      } else {
        results.push({
          name: 'Unknown',
          confidence: 0,
          box: detection.detection.box
        });
      }
    }

    return { recognized: true, faces: results };
  }

  getKnownFaces() {
    return Array.from(this.knownFaces.keys());
  }

  removeKnownFace(name) {
    return this.knownFaces.delete(name);
  }
}

export default FacialRecognition;