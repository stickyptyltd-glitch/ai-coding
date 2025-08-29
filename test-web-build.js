#!/usr/bin/env node

import fetch from 'node-fetch';

async function testWebBuild() {
    console.log('🌐 Testing Web Build API');
    
    try {
        // Test templates endpoint
        console.log('📋 Testing templates endpoint...');
        const templatesResponse = await fetch('http://localhost:3000/api/templates');
        const templatesData = await templatesResponse.json();
        
        console.log('✅ Templates loaded:', templatesData.templates.length);
        templatesData.templates.forEach(t => {
            console.log(`  - ${t.name}: ${t.description}`);
        });
        
        // Create a simple project using a basic template
        console.log('\n🚀 Testing project build...');
        
        // Create a custom simple chain via API
        const buildResponse = await fetch('http://localhost:3000/api/build-project', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                template: 'rest-api', // Use the REST API template which should be simpler
                projectName: 'WebTestProject',
                projectPath: './web-test-output',
                config: {
                    description: 'A simple test project built via web API',
                    features: ['api', 'testing'],
                    techPreference: 'modern'
                }
            })
        });
        
        if (!buildResponse.ok) {
            const error = await buildResponse.text();
            throw new Error(`Build request failed: ${buildResponse.status} - ${error}`);
        }
        
        const buildResult = await buildResponse.json();
        console.log('✅ Build completed!');
        console.log('📊 Result:', {
            success: buildResult.success,
            projectName: buildResult.projectName,
            status: buildResult.status,
            completedSteps: buildResult.summary?.completedSteps,
            duration: buildResult.summary?.duration ? Math.round(buildResult.summary.duration / 1000) + 's' : 'Unknown'
        });
        
        console.log('\n🎉 Web API test completed successfully!');
        
    } catch (error) {
        console.error('❌ Web test failed:', error.message);
    }
}

// Check if server is running, then run test
console.log('Checking if server is running...');
fetch('http://localhost:3000/api/status')
    .then(response => response.json())
    .then(status => {
        console.log('✅ Server is running');
        return testWebBuild();
    })
    .catch(error => {
        console.error('❌ Server not running. Please start the server with "npm start"');
    });