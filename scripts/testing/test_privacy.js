// Test PII masking functionality
const fs = require('fs');
const path = require('path');

// Load the TypeScript file and compile it for testing
const tsNode = require('ts-node');
tsNode.register({
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020'
  }
});

const { maskPII, detectPII } = require('./src/utils/privacy.ts');

// Mock CV data for testing
const testCV = {
  personalInfo: {
    name: "John Smith",
    email: "john.smith@example.com",
    phone: "+1-555-123-4567",
    address: "123 Main Street, Springfield, IL, USA"
  },
  experience: [
    {
      company: "Acme Corporation",
      position: "Software Engineer",
      startDate: "2020-01-01",
      endDate: "2023-01-01"
    }
  ],
  education: [
    {
      institution: "University of Illinois",
      degree: "Computer Science",
      year: "2019"
    }
  ]
};

// Mock privacy settings
const privacySettings = {
  maskingRules: {
    name: true,
    email: true,
    phone: true,
    address: true,
    companies: false,
    dates: true
  },
  publicEmail: "contact@publicprofile.com",
  publicPhone: "Available upon request"
};

console.log("=== Privacy Utilities Test ===\n");

console.log("Original CV:");
console.log(JSON.stringify(testCV, null, 2));

console.log("\nMasked CV:");
try {
  const maskedCV = maskPII(testCV, privacySettings);
  console.log(JSON.stringify(maskedCV, null, 2));
} catch (error) {
  console.error("Error masking CV:", error.message);
}

console.log("\nPII Detection Test:");
try {
  const testText = "Contact me at john.doe@email.com or call +1-555-987-6543. My address is 456 Oak Street, Chicago, IL.";
  const piiCheck = detectPII(testText);
  console.log("Test text:", testText);
  console.log("PII Detection result:", JSON.stringify(piiCheck, null, 2));
} catch (error) {
  console.error("Error detecting PII:", error.message);
}