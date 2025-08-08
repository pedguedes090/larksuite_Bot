import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = ['APP_ID', 'APP_SECRET', 'ENCRYPT_KEY', 'VERIFY_TOKEN'];

// Skip strict environment variable validation when running tests
if (process.env.NODE_ENV !== 'test') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

// Provide empty string defaults to avoid undefined values during tests
export const APP_ID = process.env.APP_ID || '';
export const APP_SECRET = process.env.APP_SECRET || '';
export const ENCRYPT_KEY = process.env.ENCRYPT_KEY || '';
export const VERIFY_TOKEN = process.env.VERIFY_TOKEN || '';
export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const DEFAULT_ADMINS = process.env.DEFAULT_ADMINS || '';
