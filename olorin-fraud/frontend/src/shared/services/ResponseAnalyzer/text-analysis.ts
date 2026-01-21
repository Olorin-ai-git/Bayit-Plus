/**
 * Text Analysis Utilities for ResponseAnalyzer
 * Functions for keyword extraction, sentiment analysis, and entity recognition
 */

import type { Sentiment, Entity } from './types';

/**
 * Extract significant keywords from text
 * Removes common stop words and returns top keywords
 */
export function extractKeywords(text: string): string[] {
  const commonWords = new Set([
    'the',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'can',
    'this',
    'that',
    'these',
    'those',
    'a',
    'an',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !commonWords.has(word))
    .reduce((acc: string[], word) => {
      if (!acc.includes(word)) acc.push(word);
      return acc;
    }, [])
    .slice(0, 10); // Top 10 keywords
}

/**
 * Analyze sentiment of text
 * Returns positive, negative, or neutral based on keyword analysis
 */
export function analyzeSentiment(text: string): Sentiment {
  const positiveWords = [
    'good',
    'great',
    'excellent',
    'positive',
    'success',
    'secure',
    'safe',
    'valid',
  ];
  const negativeWords = [
    'bad',
    'poor',
    'negative',
    'fraud',
    'suspicious',
    'risk',
    'danger',
    'invalid',
  ];

  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach((word) => {
    if (positiveWords.some((pw) => word.includes(pw))) positiveCount++;
    if (negativeWords.some((nw) => word.includes(nw))) negativeCount++;
  });

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

/**
 * Extract entities from text using regex patterns
 * Detects emails, phone numbers, IP addresses, and transaction IDs
 */
export function extractEntities(text: string): Entity[] {
  const entities: Entity[] = [];

  // Email patterns
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailRegex) || [];
  emails.forEach((email) => {
    entities.push({ type: 'email', value: email, confidence: 0.95 });
  });

  // Phone patterns
  const phoneRegex =
    /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = text.match(phoneRegex) || [];
  phones.forEach((phone) => {
    entities.push({ type: 'phone', value: phone, confidence: 0.9 });
  });

  // IP addresses
  const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const ips = text.match(ipRegex) || [];
  ips.forEach((ip) => {
    entities.push({ type: 'ip_address', value: ip, confidence: 0.85 });
  });

  // Transaction IDs (simple pattern)
  const transactionRegex = /\b[A-Z0-9]{8,}\b/g;
  const transactions = text.match(transactionRegex) || [];
  transactions.slice(0, 3).forEach((txn) => {
    entities.push({ type: 'transaction_id', value: txn, confidence: 0.7 });
  });

  return entities;
}
