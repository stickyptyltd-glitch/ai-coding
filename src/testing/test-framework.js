import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger } from '../logger.js';

const logger = createLogger('TEST-FRAMEWORK');

// Enhanced test framework with utilities and fixtures
export class TestFramework {
  constructor() {
    this.fixtures = new Map();
    this.mocks = new Map();
    this.cleanup = [];
  }

  // Test utilities
  static async asyncAssert(asyncFn, expectedError = null) {
    try {
      const result = await asyncFn();
      if (expectedError) {
        throw new Error(`Expected error ${expectedError} but function succeeded with: ${result}`);
      }
      return result;
    } catch (error) {
      if (expectedError && error.message.includes(expectedError)) {
        return error;
      }
      throw error;
    }
  }

  static assertThrows(fn, expectedError) {
    try {
      fn();
      throw new Error(`Expected function to throw '${expectedError}' but it didn't throw`);
    } catch (error) {
      if (!error.message.includes(expectedError)) {
        throw new Error(`Expected error containing '${expectedError}' but got '${error.message}'`);
      }
    }
  }

  static assertDeepEqual(actual, expected, message) {
    try {
      assert.deepStrictEqual(actual, expected);
    } catch (error) {
      throw new Error(message || `Deep equality failed: ${error.message}`);
    }
  }

  static assertMatch(actual, pattern, message) {
    if (!pattern.test(actual)) {
      throw new Error(message || `Expected '${actual}' to match pattern ${pattern}`);
    }
  }

  static assertContains(haystack, needle, message) {
    if (Array.isArray(haystack)) {
      if (!haystack.includes(needle)) {
        throw new Error(message || `Array ${JSON.stringify(haystack)} does not contain ${needle}`);
      }
    } else if (typeof haystack === 'string') {
      if (!haystack.includes(needle)) {
        throw new Error(message || `String '${haystack}' does not contain '${needle}'`);
      }
    } else {
      throw new Error('assertContains expects array or string as first argument');
    }
  }

  // Mock utilities
  createMock(name, implementation = {}) {
    const mock = {\n      calls: [],\n      implementation,\n      callCount: 0,\n      ...(typeof implementation === 'function' \n        ? { fn: (...args) => {\n            mock.calls.push(args);\n            mock.callCount++;\n            return implementation(...args);\n          }}\n        : Object.keys(implementation).reduce((acc, key) => {\n            acc[key] = (...args) => {\n              mock.calls.push({ method: key, args });\n              mock.callCount++;\n              return implementation[key](...args);\n            };\n            return acc;\n          }, {})\n      )\n    };\n    \n    this.mocks.set(name, mock);\n    return mock;\n  }\n\n  getMock(name) {\n    return this.mocks.get(name);\n  }\n\n  clearMocks() {\n    this.mocks.clear();\n  }\n\n  // Fixture management\n  addFixture(name, data) {\n    this.fixtures.set(name, data);\n  }\n\n  getFixture(name) {\n    return this.fixtures.get(name);\n  }\n\n  // Database test utilities\n  static async withTransaction(db, testFn) {\n    const transaction = await db.beginTransaction();\n    try {\n      await testFn(transaction);\n    } finally {\n      await transaction.rollback();\n    }\n  }\n\n  // HTTP test utilities\n  static async makeRequest(app, method, path, data = null, headers = {}) {\n    const request = require('supertest')(app);\n    const req = request[method.toLowerCase()](path);\n    \n    if (headers) {\n      Object.entries(headers).forEach(([key, value]) => {\n        req.set(key, value);\n      });\n    }\n    \n    if (data) {\n      req.send(data);\n    }\n    \n    return req;\n  }\n\n  // Performance testing\n  static async measurePerformance(fn, iterations = 100) {\n    const times = [];\n    \n    for (let i = 0; i < iterations; i++) {\n      const start = process.hrtime.bigint();\n      await fn();\n      const end = process.hrtime.bigint();\n      times.push(Number(end - start) / 1000000); // Convert to milliseconds\n    }\n    \n    const avg = times.reduce((a, b) => a + b) / times.length;\n    const min = Math.min(...times);\n    const max = Math.max(...times);\n    const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];\n    \n    return { avg, min, max, median, iterations };\n  }\n\n  // Memory leak detection\n  static async detectMemoryLeak(fn, iterations = 1000, threshold = 10) {\n    const initialMemory = process.memoryUsage().heapUsed;\n    \n    for (let i = 0; i < iterations; i++) {\n      await fn();\n      if (i % 100 === 0) {\n        global.gc && global.gc(); // Force garbage collection if available\n      }\n    }\n    \n    const finalMemory = process.memoryUsage().heapUsed;\n    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB\n    \n    if (memoryIncrease > threshold) {\n      throw new Error(`Potential memory leak detected: ${memoryIncrease.toFixed(2)}MB increase over ${iterations} iterations`);\n    }\n    \n    return memoryIncrease;\n  }\n\n  // Cleanup utilities\n  addCleanup(cleanupFn) {\n    this.cleanup.push(cleanupFn);\n  }\n\n  async runCleanup() {\n    for (const cleanupFn of this.cleanup.reverse()) {\n      try {\n        await cleanupFn();\n      } catch (error) {\n        logger.error('Cleanup function failed', error);\n      }\n    }\n    this.cleanup = [];\n  }\n}\n\n// Test suite builder\nexport class TestSuiteBuilder {\n  constructor(suiteName) {\n    this.suiteName = suiteName;\n    this.framework = new TestFramework();\n    this.beforeHooks = [];\n    this.afterHooks = [];\n    this.beforeEachHooks = [];\n    this.afterEachHooks = [];\n    this.tests = [];\n  }\n\n  before(fn) {\n    this.beforeHooks.push(fn);\n    return this;\n  }\n\n  after(fn) {\n    this.afterHooks.push(fn);\n    return this;\n  }\n\n  beforeEach(fn) {\n    this.beforeEachHooks.push(fn);\n    return this;\n  }\n\n  afterEach(fn) {\n    this.afterEachHooks.push(fn);\n    return this;\n  }\n\n  test(name, fn) {\n    this.tests.push({ name, fn });\n    return this;\n  }\n\n  async run() {\n    return describe(this.suiteName, async () => {\n      // Setup hooks\n      if (this.beforeHooks.length > 0) {\n        before(async () => {\n          for (const hook of this.beforeHooks) {\n            await hook(this.framework);\n          }\n        });\n      }\n\n      if (this.afterHooks.length > 0) {\n        after(async () => {\n          for (const hook of this.afterHooks) {\n            await hook(this.framework);\n          }\n          await this.framework.runCleanup();\n        });\n      }\n\n      if (this.beforeEachHooks.length > 0) {\n        beforeEach(async () => {\n          for (const hook of this.beforeEachHooks) {\n            await hook(this.framework);\n          }\n        });\n      }\n\n      if (this.afterEachHooks.length > 0) {\n        afterEach(async () => {\n          for (const hook of this.afterEachHooks) {\n            await hook(this.framework);\n          }\n        });\n      }\n\n      // Run tests\n      for (const test of this.tests) {\n        it(test.name, async () => {\n          await test.fn(this.framework);\n        });\n      }\n    });\n  }\n}\n\n// Export convenience functions\nexport function createTestSuite(name) {\n  return new TestSuiteBuilder(name);\n}\n\nexport function createMockServer(routes = {}) {\n  const express = require('express');\n  const app = express();\n  \n  app.use(express.json());\n  \n  Object.entries(routes).forEach(([path, handler]) => {\n    const [method, route] = path.split(' ');\n    app[method.toLowerCase()](route, handler);\n  });\n  \n  return app;\n}\n\n// Common test data generators\nexport const TestData = {\n  randomString(length = 10) {\n    return Math.random().toString(36).substring(2, length + 2);\n  },\n  \n  randomEmail() {\n    return `test${this.randomString(5)}@example.com`;\n  },\n  \n  randomUUID() {\n    return require('uuid').v4();\n  },\n  \n  randomDate(start = new Date(2020, 0, 1), end = new Date()) {\n    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));\n  },\n  \n  randomUser() {\n    return {\n      id: this.randomUUID(),\n      email: this.randomEmail(),\n      username: this.randomString(8),\n      createdAt: this.randomDate(),\n      active: Math.random() > 0.5\n    };\n  }\n};\n\nexport { TestFramework as default };