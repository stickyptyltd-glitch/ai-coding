#!/usr/bin/env node

import LocalVoiceRecognition from './voice-facial-recognition/local-voice-recognition.js';

async function quickDemo() {
  console.log('🎤 Voice Recognition Demo');
  console.log('=========================\n');

  const voiceRecognition = new LocalVoiceRecognition();

  // Add some people
  console.log('👥 Adding known people...');
  await voiceRecognition.addKnownVoice('Alice', 'female voice says hello alice');
  await voiceRecognition.addKnownVoice('Bob', 'male voice deep tone bob');
  await voiceRecognition.addKnownVoice('Charlie', 'speaks slowly charlie voice');

  console.log('\n🎯 Testing voice recognition...');
  console.log('🎤 Simulating 3-second recording...');

  try {
    const result = await voiceRecognition.recordAndRecognize(3000);
    
    console.log('\n📊 Results:');
    console.log(`✅ Success: ${result.success}`);
    
    if (result.success) {
      console.log(`📝 Recognized: "${result.transcript}"`);
      console.log(`📈 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      
      if (result.identification) {
        if (result.identification.identified) {
          console.log(`👤 Identified as: ${result.identification.name}`);
          console.log(`🎯 ID Confidence: ${(result.identification.confidence * 100).toFixed(1)}%`);
        } else {
          console.log('❓ Speaker not identified');
        }
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('\n👥 Known People:');
  const people = voiceRecognition.getKnownVoices();
  people.forEach((name, index) => {
    const details = voiceRecognition.getVoiceDetails(name);
    console.log(`  ${index + 1}. ${name} - "${details.description}"`);
  });

  console.log('\n🎉 Demo completed!');
}

quickDemo();