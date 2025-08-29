#!/usr/bin/env node

import { CodingAgent } from './src/agent.js';

async function testToolchain() {
    console.log('🧪 Testing Toolchain Functionality');
    
    try {
        // Initialize agent
        const agent = new CodingAgent({
            aiProvider: 'openai',
            model: 'gpt-3.5-turbo',
            temperature: 0.1
        });
        
        console.log('✅ Agent initialized');
        
        // Create a simple toolchain
        const chain = agent.toolChainManager.createChain(
            'Simple Test Project',
            'Create a basic Node.js project structure'
        );
        
        // Add simple steps that don't require AI
        chain
            .addStep('log', { message: 'Starting project creation...' })
            .addStep('mkdir', { path: './test-output' })
            .addStep('mkdir', { path: './test-output/src' })
            .addStep('mkdir', { path: './test-output/tests' })
            .addStep('log', { message: 'Directories created successfully' })
            .addStep('create', { 
                target: './test-output/package.json', 
                instructions: 'Create a simple package.json for a Node.js project named "test-project" with basic scripts' 
            })
            .addStep('create', {
                target: './test-output/README.md',
                instructions: 'Create a basic README.md file for the test-project'
            })
            .addStep('log', { message: 'Project created successfully!' });
        
        console.log('✅ Toolchain created with', chain.steps.length, 'steps');
        
        // Execute the chain
        console.log('🚀 Executing toolchain...');
        const result = await agent.toolChainManager.executeChain(chain.id, agent);
        
        console.log('✅ Toolchain execution completed');
        console.log('📊 Summary:', result.getExecutionSummary());
        
        // Check if files were created
        const packageExists = await agent.filesystem.fileExists('./test-output/package.json');
        const readmeExists = await agent.filesystem.fileExists('./test-output/README.md');
        
        console.log('📁 Files created:');
        console.log('  - package.json:', packageExists ? '✅' : '❌');
        console.log('  - README.md:', readmeExists ? '✅' : '❌');
        
        if (packageExists) {
            const packageContent = await agent.filesystem.readFile('./test-output/package.json');
            console.log('📄 Package.json preview:', packageContent.substring(0, 200) + '...');
        }
        
        console.log('\n🎉 Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

testToolchain();