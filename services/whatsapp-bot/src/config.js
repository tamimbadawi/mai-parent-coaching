/**
 * Configuration module for Mai WhatsApp Automation Microservice.
 * Reads and validates environment variables.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config();

const config = {
  // Server port
  PORT: parseInt(process.env.PORT || '3001', 10),

  // Server binding host
  HOST: process.env.HOST || '0.0.0.0',

  // Secret key for securing endpoints via Bearer token
  API_SECRET_KEY: process.env.API_SECRET_KEY || '',

  // LocalAuth persistent storage directory
  SESSION_DATA_PATH: process.env.SESSION_DATA_PATH
    ? path.resolve(process.env.SESSION_DATA_PATH)
    : path.resolve(__dirname, '..', '.wwebjs_auth'),

  // Path to Chromium binary (required for ARM64 containers or custom setups)
  PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,

  // Bounded queue configuration
  QUEUE_MAX_SIZE: parseInt(process.env.QUEUE_MAX_SIZE || '100', 10),

  // Rate limiter human-like jitter delays (in milliseconds)
  RATE_LIMIT_MIN_MS: parseInt(process.env.RATE_LIMIT_MIN_MS || '3000', 10),
  RATE_LIMIT_MAX_MS: parseInt(process.env.RATE_LIMIT_MAX_MS || '8000', 10),

  // Environment mode
  NODE_ENV: process.env.NODE_ENV || 'development',
};

module.exports = config;
