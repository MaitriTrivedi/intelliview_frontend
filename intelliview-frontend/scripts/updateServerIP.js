#!/usr/bin/env node

/**
 * A simple script to update the API base URLs in the environment.js file
 * Usage: node scripts/updateServerIP.js http://192.168.1.100:8000 https://my-llm-service.com
 */

const fs = require('fs');
const path = require('path');

// Get the new main API URL and LLM API URL from command line arguments
const newMainApiUrl = process.argv[2];
const newLlmApiUrl = process.argv[3];

if (!newMainApiUrl) {
  console.error('Please provide at least the main API URL');
  console.error('Usage: node scripts/updateServerIP.js http://192.168.1.100:8000 [https://my-llm-service.com]');
  process.exit(1);
}

// Validate URL format
const urlRegex = /^(https?:\/\/)([\w.-]+)(:\d+)?(\/.*)?$/;
if (!urlRegex.test(newMainApiUrl)) {
  console.error('Invalid URL format for main API. Use format: http(s)://hostname[:port][/path]');
  process.exit(1);
}

if (newLlmApiUrl && !urlRegex.test(newLlmApiUrl)) {
  console.error('Invalid URL format for LLM API. Use format: http(s)://hostname[:port][/path]');
  process.exit(1);
}

// Path to the environment.js file
const envFilePath = path.join(__dirname, '..', 'src', 'config', 'environment.js');

// Read the file
fs.readFile(envFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    process.exit(1);
  }

  // Replace the base URLs with the new URLs
  let updatedData = data.replace(
    /export const MAIN_API_BASE_URL = '(https?:\/\/[^']+)';/,
    `export const MAIN_API_BASE_URL = '${newMainApiUrl}';`
  );
  
  // Only update LLM_API_BASE_URL if provided
  if (newLlmApiUrl) {
    updatedData = updatedData.replace(
      /export const LLM_API_BASE_URL = '(https?:\/\/[^']+)';/,
      `export const LLM_API_BASE_URL = '${newLlmApiUrl}';`
    );
  }

  // Write the updated content back to the file
  fs.writeFile(envFilePath, updatedData, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      process.exit(1);
    }

    console.log(`Updated Main API URL to: ${newMainApiUrl}`);
    if (newLlmApiUrl) {
      console.log(`Updated LLM API URL to: ${newLlmApiUrl}`);
    }
    console.log('Please restart your development server for changes to take effect');
  });
}); 