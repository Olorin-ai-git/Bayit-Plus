/**
 * Use Case Data
 *
 * Industry-specific fraud scenarios and solutions.
 */

import { UseCase } from './UseCaseCard';

export const USE_CASES: UseCase[] = [
  {
    id: 'financial-services',
    industry: 'Financial Services',
    icon: '🏦',
    title: 'Payment Fraud Prevention',
    description:
      'Protect against payment fraud, account takeover, and money laundering with real-time transaction analysis.',
    challenges: [
      'High volume transaction monitoring',
      'Sophisticated card-not-present fraud',
      'Account takeover attacks',
      'Regulatory compliance requirements',
    ],
    solutions: [
      'Real-time multi-agent transaction analysis',
      'Device and behavioral fingerprinting',
      'Impossible travel and velocity detection',
      'Complete audit trails for compliance',
    ],
    metrics: [
      { label: 'Detection Rate', value: '95%' },
      { label: 'False Positives', value: '-80%' },
      { label: 'Response Time', value: '<1s' },
    ],
    color: '#3b82f6',
  },
  {
    id: 'ecommerce',
    industry: 'E-Commerce',
    icon: '🛒',
    title: 'Transaction Fraud Detection',
    description:
      'Stop fraudulent orders, chargebacks, and account abuse before they impact your bottom line.',
    challenges: [
      'Chargebacks eating into margins',
      'Promo and coupon abuse',
      'Fake account creation',
      'Friendly fraud patterns',
    ],
    solutions: [
      'Order-level risk scoring',
      'Cross-session behavioral analysis',
      'Device reputation tracking',
      'Network graph analysis for fraud rings',
    ],
    metrics: [
      { label: 'Chargeback Reduction', value: '70%' },
      { label: 'Approval Rate', value: '+15%' },
      { label: 'Fraud Loss', value: '-85%' },
    ],
    color: '#10b981',
  },
  {
    id: 'insurance',
    industry: 'Insurance',
    icon: '🛡️',
    title: 'Claims Fraud Detection',
    description:
      'Identify fraudulent claims and application fraud with intelligent document and pattern analysis.',
    challenges: [
      'Staged accidents and exaggerated claims',
      'Application fraud and identity theft',
      'Organized fraud rings',
      'Internal fraud detection',
    ],
    solutions: [
      'Claims pattern analysis across portfolios',
      'Document authenticity verification',
      'Provider network analysis',
      'Historical fraud pattern matching',
    ],
    metrics: [
      { label: 'Fraud Detected', value: '3x' },
      { label: 'Investigation Time', value: '-60%' },
      { label: 'Cost Savings', value: '$2M+' },
    ],
    color: '#f59e0b',
  },
  {
    id: 'healthcare',
    industry: 'Healthcare',
    icon: '🏥',
    title: 'Healthcare Fraud Prevention',
    description:
      'Protect against billing fraud, identity theft, and prescription abuse with HIPAA-compliant detection.',
    challenges: [
      'Billing fraud and upcoding',
      'Patient identity verification',
      'Prescription fraud patterns',
      'Provider fraud schemes',
    ],
    solutions: [
      'Claims anomaly detection',
      'Patient identity matching',
      'Provider behavior analysis',
      'HIPAA-compliant audit trails',
    ],
    metrics: [
      { label: 'Fraud Prevention', value: '$5M+' },
      { label: 'Compliance', value: '100%' },
      { label: 'Processing Time', value: '-50%' },
    ],
    color: '#ef4444',
  },
];
