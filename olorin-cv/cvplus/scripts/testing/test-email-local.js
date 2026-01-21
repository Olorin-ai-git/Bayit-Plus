/**
 * Local test script for email functionality
 * Run with: node test-email-local.js
 */

const { IntegrationsService } = require('./lib/services/integrations.service');

async function testEmailService() {
  console.log('🧪 Testing Email Service...');
  
  try {
    const integrations = new IntegrationsService();
    
    // Test email configuration
    console.log('1. Testing email configuration...');
    const configTest = await integrations.testEmailConfiguration();
    console.log('Config test result:', configTest);
    
    if (!configTest.success) {
      console.log('❌ Email service not configured properly');
      console.log('Run the setup script: ./scripts/setup-email-service.sh');
      return;
    }
    
    // Test email template generation
    console.log('2. Testing email template generation...');
    const emailHtml = integrations.generateContactFormEmailTemplate({
      senderName: 'John Doe',
      senderEmail: 'john@example.com',
      senderPhone: '+1-555-0123',
      company: 'Test Company',
      subject: 'Test Subject',
      message: 'This is a test message to verify the email template generation.',
      cvUrl: 'https://example.com/cv/test',
      profileOwnerName: 'Test User'
    });
    
    console.log('✅ Email template generated successfully');
    console.log('Template length:', emailHtml.length, 'characters');
    
    // Optionally send a test email (uncomment and add test email)
    /*
    console.log('3. Sending test email...');
    const emailResult = await integrations.sendEmail({
      to: 'your-test-email@example.com', // Replace with your email
      subject: 'CVPlus Email Test',
      html: emailHtml
    });
    
    if (emailResult.success) {
      console.log('✅ Test email sent successfully!');
    } else {
      console.log('❌ Failed to send test email:', emailResult.error);
    }
    */
    
    console.log('🎉 Email service test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEmailService().catch(console.error);