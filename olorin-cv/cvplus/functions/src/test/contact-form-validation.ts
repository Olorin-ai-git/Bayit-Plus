#!/usr/bin/env node

/**
 * Contact Form Validation Test
 * Tests the complete contact form integration including Firebase compatibility
  */

import { ContactFormFeature } from '../services/cv-generator/features/ContactFormFeature';
import { ParsedCV } from '../services/cvParser';

async function validateContactFormIntegration() {
  console.log('🔍 Contact Form Integration Validation');
  console.log('======================================\n');

  const mockCV: ParsedCV = {
    personalInfo: {
      name: 'Jane Developer',
      email: 'jane.developer@example.com',
      phone: '+1 (555) 987-6543',
      location: 'Austin, TX'
    },
    summary: 'Full-stack developer with expertise in TypeScript and Firebase',
    experience: [],
    education: [],
    skills: {
      technical: ['TypeScript', 'Firebase', 'React'],
      soft: ['Problem Solving', 'Team Leadership'],
      languages: ['English', 'Spanish']
    },
    certifications: [],
    projects: []
  };

  const jobId = 'validation-test-456';

  try {
    console.log('1️⃣ Testing ContactFormFeature instantiation...');
    const contactFormFeature = new ContactFormFeature();
    console.log('   ✅ ContactFormFeature instantiated successfully');

    console.log('\n2️⃣ Testing HTML generation...');
    const htmlContent = await contactFormFeature.generate(mockCV, jobId);
    
    // Validate HTML structure
    const validations = [
      {
        name: 'Form container with correct ID',
        test: () => htmlContent.includes(`id="contact-form-${jobId}"`)
      },
      {
        name: 'Form element with contact-form class',
        test: () => htmlContent.includes('class="contact-form"')
      },
      {
        name: 'Form has data-job-id attribute',
        test: () => htmlContent.includes(`data-job-id="${jobId}"`)
      },
      {
        name: 'Submit button present',
        test: () => htmlContent.includes('class="submit-btn"')
      },
      {
        name: 'Required form fields present',
        test: () => htmlContent.includes('name="senderName"') && 
                   htmlContent.includes('name="senderEmail"') &&
                   htmlContent.includes('name="subject"') &&
                   htmlContent.includes('name="message"')
      },
      {
        name: 'Character counter elements present',
        test: () => htmlContent.includes('class="character-count"') &&
                   htmlContent.includes('class="current"')
      },
      {
        name: 'Status elements present',
        test: () => htmlContent.includes('class="form-status"') &&
                   htmlContent.includes('class="status-success"') &&
                   htmlContent.includes('class="status-error"')
      },
      {
        name: 'Contact name personalization',
        test: () => htmlContent.includes(mockCV.personalInfo.name!)
      }
    ];

    let passedValidations = 0;
    validations.forEach(validation => {
      const passed = validation.test();
      console.log(`   ${passed ? '✅' : '❌'} ${validation.name}`);
      if (passed) passedValidations++;
    });

    console.log(`\n   📊 HTML Validation Results: ${passedValidations}/${validations.length} passed`);

    console.log('\n3️⃣ Testing CSS styles generation...');
    const styles = contactFormFeature.getStyles();
    
    const styleValidations = [
      {
        name: 'Contact form container styles',
        test: () => styles.includes('.contact-form-container')
      },
      {
        name: 'Form element styles',
        test: () => styles.includes('.contact-form')
      },
      {
        name: 'Form group styles',
        test: () => styles.includes('.form-group')
      },
      {
        name: 'Submit button styles',
        test: () => styles.includes('.submit-btn')
      },
      {
        name: 'Responsive design styles',
        test: () => styles.includes('@media (max-width: 768px)')
      },
      {
        name: 'Dark mode support',
        test: () => styles.includes('@media (prefers-color-scheme: dark)')
      },
      {
        name: 'Loading spinner styles',
        test: () => styles.includes('.btn-loading')
      }
    ];

    let passedStyleValidations = 0;
    styleValidations.forEach(validation => {
      const passed = validation.test();
      console.log(`   ${passed ? '✅' : '❌'} ${validation.name}`);
      if (passed) passedStyleValidations++;
    });

    console.log(`\n   📊 CSS Validation Results: ${passedStyleValidations}/${styleValidations.length} passed`);

    console.log('\n4️⃣ Testing JavaScript generation...');
    const scripts = contactFormFeature.getScripts();
    
    const scriptValidations = [
      {
        name: 'Firebase waiting mechanism',
        test: () => scripts.includes('waitForFirebase')
      },
      {
        name: 'Firebase availability check',
        test: () => scripts.includes('typeof firebase !== \'undefined\'') &&
                   scripts.includes('firebase.app')
      },
      {
        name: 'Console logging for debugging',
        test: () => scripts.includes('console.log(\'Initializing contact forms...\')') &&
                   scripts.includes('console.log(\'✅ Firebase is available')
      },
      {
        name: 'Form selector and validation',
        test: () => scripts.includes('document.querySelectorAll(\'.contact-form\')') &&
                   scripts.includes('validateForm')
      },
      {
        name: 'Event handler attachment',
        test: () => scripts.includes('addEventListener(\'click\'')
      },
      {
        name: 'Firebase Functions integration',
        test: () => scripts.includes('firebase.functions') &&
                   scripts.includes('httpsCallable(\'submitContactForm\')')
      },
      {
        name: 'Error handling for Firebase',
        test: () => scripts.includes('Firebase SDK not loaded') &&
                   scripts.includes('functions/invalid-argument')
      },
      {
        name: 'Form validation logic',
        test: () => scripts.includes('senderName') &&
                   scripts.includes('senderEmail') &&
                   scripts.includes('/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/')
      },
      {
        name: 'Loading state management',
        test: () => scripts.includes('submitBtn.disabled = true') &&
                   scripts.includes('btnLoading.style.display')
      },
      {
        name: 'Character counter functionality',
        test: () => scripts.includes('textarea.addEventListener(\'input\'') &&
                   scripts.includes('charCount.textContent')
      }
    ];

    let passedScriptValidations = 0;
    scriptValidations.forEach(validation => {
      const passed = validation.test();
      console.log(`   ${passed ? '✅' : '❌'} ${validation.name}`);
      if (passed) passedScriptValidations++;
    });

    console.log(`\n   📊 JavaScript Validation Results: ${passedScriptValidations}/${scriptValidations.length} passed`);

    console.log('\n5️⃣ Testing initialization timing...');
    
    const timingValidations = [
      {
        name: 'DOM ready detection',
        test: () => scripts.includes('document.readyState === \'loading\'')
      },
      {
        name: 'DOMContentLoaded listener',
        test: () => scripts.includes('addEventListener(\'DOMContentLoaded\'')
      },
      {
        name: 'Immediate initialization fallback',
        test: () => scripts.includes('startInitialization()')
      },
      {
        name: 'Firebase waiting with retry logic',
        test: () => scripts.includes('maxAttempts = 50') &&
                   scripts.includes('setTimeout(checkFirebase, 100)')
      }
    ];

    let passedTimingValidations = 0;
    timingValidations.forEach(validation => {
      const passed = validation.test();
      console.log(`   ${passed ? '✅' : '❌'} ${validation.name}`);
      if (passed) passedTimingValidations++;
    });

    console.log(`\n   📊 Timing Validation Results: ${passedTimingValidations}/${timingValidations.length} passed`);

    console.log('\n6️⃣ Overall assessment...');
    
    const totalValidations = validations.length + styleValidations.length + scriptValidations.length + timingValidations.length;
    const totalPassed = passedValidations + passedStyleValidations + passedScriptValidations + passedTimingValidations;
    const passRate = Math.round((totalPassed / totalValidations) * 100);

    console.log(`\n📈 Final Results:`);
    console.log(`   Total validations: ${totalValidations}`);
    console.log(`   Passed: ${totalPassed}`);
    console.log(`   Failed: ${totalValidations - totalPassed}`);
    console.log(`   Pass rate: ${passRate}%`);

    if (passRate >= 95) {
      console.log('\n🎉 EXCELLENT! Contact form implementation is production-ready.');
    } else if (passRate >= 85) {
      console.log('\n✅ GOOD! Contact form implementation has minor issues that should be addressed.');
    } else if (passRate >= 70) {
      console.log('\n⚠️  FAIR! Contact form implementation has several issues that need attention.');
    } else {
      console.log('\n❌ POOR! Contact form implementation has major issues that require immediate fixing.');
    }

    console.log('\n💡 Key improvements in this version:');
    console.log('   • Added Firebase availability waiting mechanism');
    console.log('   • Enhanced error handling and user feedback');
    console.log('   • Improved timing and initialization logic');
    console.log('   • Better debugging with comprehensive console logging');
    console.log('   • Graceful degradation when Firebase fails to load');

    console.log('\n🔧 For testing in browser:');
    console.log('   1. Open browser developer console');
    console.log('   2. Look for "✅ Firebase is available, initializing contact forms..." message');
    console.log('   3. Test form interaction and submission');
    console.log('   4. Verify error handling with invalid inputs');

    if (passRate < 100) {
      console.log('\n⚠️  Remaining issues to investigate:');
      console.log('   • Review failed validations above');
      console.log('   • Test in actual browser environment');
      console.log('   • Verify Firebase SDK compatibility');
    }

    console.log('\n✅ Contact Form Validation Complete');
    
  } catch (error) {
    console.error('\n❌ Contact Form Validation Failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the validation
validateContactFormIntegration().catch(console.error);