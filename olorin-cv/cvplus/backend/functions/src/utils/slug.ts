/**
 * Utility functions for generating URL-safe slugs
 */

import { customAlphabet } from 'nanoid';

// Create custom nanoid with URL-safe characters
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

/**
 * Generate a random slug for public profiles
 */
export function generateSlug(): string {
  const adjectives = [
    'smart', 'dynamic', 'creative', 'innovative', 'skilled',
    'expert', 'professional', 'talented', 'brilliant', 'capable',
    'driven', 'focused', 'strategic', 'analytical', 'technical'
  ];
  
  const nouns = [
    'developer', 'engineer', 'designer', 'manager', 'analyst',
    'consultant', 'specialist', 'expert', 'professional', 'leader',
    'architect', 'strategist', 'innovator', 'creator', 'builder'
  ];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const random = nanoid();
  
  return `${adjective}-${noun}-${random}`;
}

/**
 * Sanitize text to create a URL-safe slug
 */
export function sanitizeSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Create a slug from user's name
 */
export function createSlugFromName(name: string): string {
  const sanitized = sanitizeSlug(name);
  const random = nanoid();
  return `${sanitized}-${random}`;
}