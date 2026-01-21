/**
 * Test Contact Form React Component Integration Fix
 * 
 * This script tests that the contact form React components are properly
 * rendered after being inserted via dangerouslySetInnerHTML
 */

// Test function to verify the fix
export function testContactFormIntegration(): void {
  logger.warn('🧪 Testing Contact Form React Integration Fix...');

  // Simulate HTML with React component placeholder (like what backend generates)
  const mockCVHTML = `
    <div class="cv-content">
      <h1>John Doe - Software Engineer</h1>
      
      <div class="cv-feature-container contact-form-feature">
        <div class="react-component-placeholder" 
             data-component="ContactForm" 
             data-props='{"profileId":"test-123","jobId":"test-123","data":{"contactName":"John Doe"},"isEnabled":true,"customization":{"title":"Get in Touch","buttonText":"Send Message","theme":"auto","showCompanyField":true,"showPhoneField":true,"maxRetries":3},"className":"cv-contact-form","mode":"public","portalUrls":null,"enablePortalIntegration":false}'
             id="contact-form-test-123">
          <!-- React ContactForm component will be rendered here -->
          <div class="component-loading">
            <div class="loading-spinner"></div>
            <p>Loading contact form...</p>
          </div>
        </div>
      </div>
      
      <p>Rest of CV content...</p>
    </div>
  `;

  // Create a test container
  const testContainer = document.createElement('div');
  testContainer.id = 'contact-form-test-container';
  testContainer.innerHTML = mockCVHTML;
  document.body.appendChild(testContainer);

  logger.warn('✅ Created test container with React placeholder');

  // Test that the placeholder exists
  const placeholders = testContainer.querySelectorAll('.react-component-placeholder[data-component="ContactForm"]');
  logger.warn(`🔍 Found ${placeholders.length} ContactForm placeholders`);

  if (placeholders.length === 0) {
    logger.error('❌ No ContactForm placeholders found in test HTML');
    return;
  }

  // Test that the component renderer is available
  const windowWithRenderer = window as any;
  if (typeof windowWithRenderer.initializeReactComponents === 'function') {
    logger.warn('✅ Global initializeReactComponents function is available');
    
    // Call the initialization function
    try {
      windowWithRenderer.initializeReactComponents();
      logger.warn('✅ Successfully called initializeReactComponents()');

      // Check if the placeholder was replaced with React component
      setTimeout(() => {
        const updatedPlaceholders = testContainer.querySelectorAll('.react-component-placeholder[data-component="ContactForm"]');
        const loadingMessages = testContainer.querySelectorAll('.component-loading');
        
        logger.warn(`🔍 After initialization: ${updatedPlaceholders.length} placeholders remaining`);
        logger.warn(`🔍 After initialization: ${loadingMessages.length} loading messages remaining`);

        if (updatedPlaceholders.length === 0 || loadingMessages.length === 0) {
          logger.warn('✅ SUCCESS: React component appears to have been rendered!');
        } else {
          logger.warn('⚠️  React component may not have rendered - check console for errors');
        }

        // Cleanup
        document.body.removeChild(testContainer);
        logger.warn('🧹 Cleaned up test container');

      }, 200); // Small delay to allow React rendering

    } catch (error) {
      logger.error('❌ Error calling initializeReactComponents:', error);
    }

  } else {
    logger.error('❌ Global initializeReactComponents function not available');
    logger.warn('💡 This may mean the componentRenderer.ts is not loaded yet');
  }
}

// Test function to simulate what happens in GeneratedCVDisplay
export function simulateGeneratedCVDisplay(): void {
  logger.warn('🎭 Simulating GeneratedCVDisplay component behavior...');

  // This simulates what our fixed GeneratedCVDisplay does
  const mockJobData = {
    generatedCV: {
      html: `
        <div class="cv-content">
          <h1>Test CV</h1>
          <div class="cv-feature-container contact-form-feature">
            <div class="react-component-placeholder" 
                 data-component="ContactForm" 
                 data-props='{"profileId":"sim-456","jobId":"sim-456","data":{"contactName":"Test User"},"isEnabled":true}'
                 id="contact-form-sim-456">
              <div class="component-loading">
                <div class="loading-spinner"></div>
                <p>Loading contact form...</p>
              </div>
            </div>
          </div>
        </div>
      `
    }
  };

  // Create container like GeneratedCVDisplay does
  const container = document.createElement('div');
  container.className = 'generated-cv-content';
  container.innerHTML = mockJobData.generatedCV.html;
  document.body.appendChild(container);

  logger.warn('✅ Created simulated CV container');

  // Simulate the useEffect behavior from our fix
  setTimeout(() => {
    logger.warn('🔄 Simulating useEffect trigger (after HTML render)...');
    
    // This is what our fix does
    if (typeof window !== 'undefined' && (window as any).initializeReactComponents) {
      logger.warn('🚀 Calling initializeReactComponents from simulated useEffect...');
      (window as any).initializeReactComponents();
      
      // Check results
      setTimeout(() => {
        const remaining = container.querySelectorAll('.component-loading');
        logger.warn(`🔍 Components still loading: ${remaining.length}`);
        
        // Cleanup
        document.body.removeChild(container);
        logger.warn('🧹 Cleaned up simulation');
      }, 200);
      
    } else {
      logger.warn('⚠️ initializeReactComponents not available in simulation');
    }
  }, 100); // This simulates the 100ms delay in our fix
}

// Make functions available globally for manual testing
if (typeof window !== 'undefined') {
  (window as any).testContactFormIntegration = testContactFormIntegration;
  (window as any).simulateGeneratedCVDisplay = simulateGeneratedCVDisplay;
}

export default {
  testContactFormIntegration,
  simulateGeneratedCVDisplay
};