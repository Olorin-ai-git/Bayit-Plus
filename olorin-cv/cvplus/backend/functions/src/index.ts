/**
 * Firebase Cloud Functions Entry Point
 *
 * This file exports all Cloud Functions for deployment.
 * Firebase deployment expects this file to be compiled to lib/index.js
 */

// Audio streaming functions
export {
  audioStreamTTS,
  audioTranscribe,
  audioHealth,
} from './functions/audioStream';

// Public profile functions
export {
  createPublicProfile,
  getPublicProfile,
  updatePublicProfileSettings,
  submitContactForm,
  trackQRScan,
} from './functions/publicProfile';
