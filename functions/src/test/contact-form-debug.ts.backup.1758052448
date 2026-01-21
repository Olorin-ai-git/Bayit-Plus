#!/usr/bin/env node

/**
 * Contact Form JavaScript Debug Test
 * Debug why the initContactForm() function is not executing in generated HTML
 */

import { ContactFormFeature } from '../services/cv-generator/features/ContactFormFeature';
import { FeatureRegistry } from '../services/cv-generator/features/FeatureRegistry';
import { CVGenerator } from '../services/cvGenerator';
import { ParsedCV } from '../services/cvParser';

async function debugContactFormJavaScript() {
  console.log('🐛 Contact Form JavaScript Debug Test');
  console.log('=====================================\n');

  // Mock CV data
  const mockCV: ParsedCV = {
    personalInfo: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA'
    },
    summary: 'Test CV for debugging contact form JavaScript',
    experience: [],
    education: [],
    skills: {
      technical: ['JavaScript', 'TypeScript'],
      soft: ['Communication', 'Teamwork'],
      languages: ['English', 'Spanish']
    },
    certifications: [],
    projects: []
  };

  const jobId = 'debug-test-123';

  try {
    console.log('1️⃣ Testing ContactFormFeature directly...');
    
    // Test ContactFormFeature directly
    const contactFormFeature = new ContactFormFeature();
    const htmlContent = await contactFormFeature.generate(mockCV, jobId);
    const styles = contactFormFeature.getStyles();
    const scripts = contactFormFeature.getScripts();
    
    console.log(`   ✅ HTML Content generated: ${htmlContent.length} characters`);
    console.log(`   ✅ Styles generated: ${styles.length} characters`);
    console.log(`   ✅ Scripts generated: ${scripts.length} characters`);
    
    // Check if HTML contains expected elements
    const hasContactForm = htmlContent.includes('class="contact-form"');
    const hasSubmitButton = htmlContent.includes('class="submit-btn"');
    const hasFormId = htmlContent.includes(`contact-form-${jobId}`);
    
    console.log(`   📋 HTML Content Analysis:`);
    console.log(`      - Has contact form class: ${hasContactForm}`);
    console.log(`      - Has submit button: ${hasSubmitButton}`);
    console.log(`      - Has correct form ID: ${hasFormId}`);
    
    // Check JavaScript content
    const hasInitFunction = scripts.includes('function initContactForm()');
    const hasConsoleLog = scripts.includes('console.log(\'Initializing contact forms...\')');
    const hasDOMContentLoaded = scripts.includes('DOMContentLoaded');
    const hasImmediateExecution = scripts.includes('initContactForm();');
    
    console.log(`   🔧 JavaScript Analysis:`);
    console.log(`      - Has initContactForm function: ${hasInitFunction}`);
    console.log(`      - Has console.log statement: ${hasConsoleLog}`);
    console.log(`      - Has DOMContentLoaded listener: ${hasDOMContentLoaded}`);
    console.log(`      - Has immediate execution: ${hasImmediateExecution}`);
    
    console.log('\n2️⃣ Testing FeatureRegistry integration...');
    
    // Test FeatureRegistry integration
    const features = await FeatureRegistry.generateFeatures(mockCV, jobId, ['contact-form']);
    
    console.log(`   ✅ FeatureRegistry integration successful`);
    console.log(`   📋 Features Generated:`);
    console.log(`      - contactForm present: ${features.contactForm ? 'Yes' : 'No'}`);
    console.log(`      - additionalStyles present: ${features.additionalStyles ? 'Yes' : 'No'}`);
    console.log(`      - additionalScripts present: ${features.additionalScripts ? 'Yes' : 'No'}`);
    
    if (features.additionalScripts) {
      console.log(`      - Scripts length: ${features.additionalScripts.length} characters`);
      const scriptsHasInit = features.additionalScripts.includes('function initContactForm()');
      const scriptsHasConsole = features.additionalScripts.includes('console.log(\'Initializing contact forms...\')');
      console.log(`      - Scripts contain initContactForm: ${scriptsHasInit}`);
      console.log(`      - Scripts contain console log: ${scriptsHasConsole}`);
    }
    
    console.log('\n3️⃣ Testing full CV generation...');
    
    // Test full CV generation
    const cvGenerator = new CVGenerator();
    const fullHtml = await cvGenerator.generateHTML(mockCV, 'modern', ['contact-form'], jobId);
    
    console.log(`   ✅ Full CV generation successful: ${fullHtml.length} characters`);
    
    // Check if scripts are properly injected in final HTML
    const finalHasScript = fullHtml.includes('<script>');
    const finalHasInitFunction = fullHtml.includes('function initContactForm()');
    const finalHasConsoleLog = fullHtml.includes('console.log(\'Initializing contact forms...\')');
    const finalHasContactForm = fullHtml.includes('class="contact-form"');
    
    console.log(`   📋 Final HTML Analysis:`);
    console.log(`      - Contains script tags: ${finalHasScript}`);
    console.log(`      - Contains initContactForm function: ${finalHasInitFunction}`);
    console.log(`      - Contains console.log statement: ${finalHasConsoleLog}`);
    console.log(`      - Contains contact form HTML: ${finalHasContactForm}`);
    
    // Extract and analyze the script section
    const scriptMatch = fullHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
    if (scriptMatch) {
      console.log(`      - Number of script tags: ${scriptMatch.length}`);
      
      // Check if any script contains our contact form code
      let foundContactFormScript = false;
      scriptMatch.forEach((script, index) => {
        if (script.includes('initContactForm')) {
          foundContactFormScript = true;
          console.log(`      - Contact form script found in script tag #${index + 1}`);
          
          // Check for common JavaScript issues
          const hasUnclosedBraces = (script.match(/\{/g) || []).length !== (script.match(/\}/g) || []).length;
          const hasUnclosedParens = (script.match(/\(/g) || []).length !== (script.match(/\)/g) || []).length;
          const hasSyntaxErrors = hasUnclosedBraces || hasUnclosedParens;
          
          console.log(`      - Potential syntax errors: ${hasSyntaxErrors ? 'Yes' : 'No'}`);
          if (hasUnclosedBraces) console.log(`        - Unmatched braces detected`);
          if (hasUnclosedParens) console.log(`        - Unmatched parentheses detected`);
        }
      });
      
      if (!foundContactFormScript) {
        console.log(`      - ⚠️  Contact form script NOT found in any script tag`);
      }
    } else {
      console.log(`      - ⚠️  NO script tags found in final HTML`);
    }
    
    console.log('\n4️⃣ Debugging recommendations...');
    
    if (!finalHasScript || !finalHasInitFunction) {
      console.log(`   🔴 ISSUE DETECTED: JavaScript not properly injected`);
      console.log(`   💡 Possible causes:`);
      console.log(`      1. Template not injecting additionalScripts`);
      console.log(`      2. FeatureRegistry not combining scripts properly`);
      console.log(`      3. Script content has syntax errors`);
      console.log(`      4. Template script injection logic malformed`);
    } else if (finalHasInitFunction && finalHasConsoleLog) {
      console.log(`   🟡 SCRIPTS PRESENT: JavaScript should be working`);
      console.log(`   💡 If console.log not appearing, check:`);
      console.log(`      1. Browser console for JavaScript errors`);
      console.log(`      2. DOM ready state timing issues`);
      console.log(`      3. CSS selector conflicts (.contact-form not found)`);
      console.log(`      4. Script execution order problems`);
    }
    
    // Save debug HTML for manual inspection
    const debugHtmlPath = '/tmp/contact-form-debug.html';
    const fs = require('fs');
    fs.writeFileSync(debugHtmlPath, fullHtml);
    console.log(`\n📁 Debug HTML saved to: ${debugHtmlPath}`);
    console.log(`   Open this file in a browser to test JavaScript execution manually.`);
    
    console.log('\n✅ Contact Form JavaScript Debug Test Complete');
    
  } catch (error) {
    console.error('\n❌ Contact Form Debug Test Failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
debugContactFormJavaScript().catch(console.error);