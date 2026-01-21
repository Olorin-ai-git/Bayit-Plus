import { CVGenerator } from '../services/cvGenerator';
import { ParsedCV } from '../services/cvParser';

/**
 * Integration test to verify complete CV generation with Contact Form and Social Media Links
  */
async function testCVIntegration() {
  console.log('🔄 Testing Complete CV Generation with Features');
  console.log('='.repeat(60));

  // Mock CV data
  const mockCV: ParsedCV = {
    personalInfo: {
      name: 'Gil Klainert',
      email: 'gil@example.com',
      phone: '+1-555-123-4567',
      location: 'San Francisco, CA',
      linkedin: 'https://linkedin.com/in/gilklainert',
      github: 'https://github.com/gilklainert',
      website: 'https://gilklainert.com'
    },
    summary: 'Senior Software Engineer with 10+ years of experience',
    experience: [{
      company: 'Tech Corp',
      position: 'Senior Engineer',
      duration: '2020-Present',
      startDate: '2020-01-01',
      location: 'San Francisco, CA',
      description: 'Led development of scalable web applications',
      achievements: ['Improved performance by 50%', 'Led team of 5 engineers'],
      technologies: ['React', 'Node.js', 'TypeScript']
    }],
    education: [{
      institution: 'Stanford University',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      graduationDate: '2015-06-01'
    }],
    skills: {
      technical: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
      soft: ['Leadership', 'Communication', 'Problem Solving'],
      languages: ['English', 'Spanish']
    },
    certifications: [{
      name: 'AWS Solutions Architect',
      issuer: 'Amazon Web Services',
      date: '2023-01-01'
    }]
  };

  const jobId = 'integration-test-123';
  const features = ['contact-form', 'social-media-links'];

  try {
    console.log('\n🎯 Testing CV Generation with Features...');
    console.log(`   Features requested: ${features.join(', ')}`);
    console.log(`   Template: modern`);
    console.log(`   Job ID: ${jobId}`);

    const cvGenerator = new CVGenerator();
    const html = await cvGenerator.generateHTML(mockCV, 'modern', features, jobId);

    console.log('\n✅ CV Generation completed successfully!');
    console.log(`   Total HTML length: ${html.length} characters`);

    // Check if features are present in the generated HTML
    const hasContactForm = html.includes('contact-form') || html.includes('Contact Form') || html.includes('<form');
    const hasSocialLinks = html.includes('social-link') || html.includes('LinkedIn') || html.includes('GitHub');
    
    console.log('\n📋 Feature Presence Analysis:');
    console.log(`   Contact Form present: ${hasContactForm ? '✅ YES' : '❌ NO'}`);
    console.log(`   Social Media Links present: ${hasSocialLinks ? '✅ YES' : '❌ NO'}`);
    
    // Additional checks for specific content
    const hasFormTag = html.includes('<form');
    const hasSubmitButton = html.includes('submit') || html.includes('Send');
    const hasLinkedInLink = html.includes('linkedin.com') || html.includes('LinkedIn');
    const hasGitHubLink = html.includes('github.com') || html.includes('GitHub');
    
    console.log('\n🔍 Detailed Content Analysis:');
    console.log(`   Has <form> tag: ${hasFormTag ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has submit button: ${hasSubmitButton ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has LinkedIn link: ${hasLinkedInLink ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has GitHub link: ${hasGitHubLink ? '✅ YES' : '❌ NO'}`);

    // Extract and show a snippet of the generated HTML around features
    const contactFormIndex = html.toLowerCase().indexOf('contact');
    const socialLinksIndex = html.toLowerCase().indexOf('linkedin');
    
    if (contactFormIndex > -1) {
      const snippet = html.substring(Math.max(0, contactFormIndex - 100), contactFormIndex + 300);
      console.log('\n📝 Contact Form Area Snippet:');
      console.log(`   "${snippet.replace(/\n/g, '\\n').substring(0, 200)}..."`);
    }
    
    if (socialLinksIndex > -1) {
      const snippet = html.substring(Math.max(0, socialLinksIndex - 100), socialLinksIndex + 300);
      console.log('\n🔗 Social Links Area Snippet:');
      console.log(`   "${snippet.replace(/\n/g, '\\n').substring(0, 200)}..."`);
    }

    // Final verdict
    const bothFeaturesPresent = hasContactForm && hasSocialLinks;
    console.log('\n' + '='.repeat(60));
    
    if (bothFeaturesPresent) {
      console.log('🎉 INTEGRATION TEST PASSED!');
      console.log('✅ Both Contact Form and Social Media Links are now appearing in generated CVs');
      console.log('✅ Feature injection architecture fix is working correctly');
    } else {
      console.log('❌ INTEGRATION TEST FAILED!');
      console.log('❌ Features are still not appearing in generated CVs');
      console.log('❌ Further investigation needed');
    }

    return { html, featuresPresent: bothFeaturesPresent };

  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testCVIntegration().catch(console.error);
}

export { testCVIntegration };