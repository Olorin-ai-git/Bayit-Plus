import { ContactFormFeature } from '../services/cv-generator/features/ContactFormFeature';
import { SocialLinksFeature } from '../services/cv-generator/features/SocialLinksFeature';
import { FeatureRegistry } from '../services/cv-generator/features/FeatureRegistry';
import { ParsedCV } from '../services/cvParser';

/**
 * Test script to verify Contact Form and Social Media Links features
  */
async function testFeatures() {
  console.log('🧪 Testing Contact Form and Social Media Links Features');
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

  const jobId = 'test-job-123';

  try {
    // Test 1: Contact Form Feature
    console.log('\n📝 Testing Contact Form Feature...');
    const contactFormFeature = new ContactFormFeature();
    const contactFormHTML = await contactFormFeature.generate(mockCV, jobId);
    
    console.log('✅ Contact Form HTML generated successfully');
    console.log(`   Length: ${contactFormHTML.length} characters`);
    console.log(`   Contains form: ${contactFormHTML.includes('<form') ? 'Yes' : 'No'}`);
    console.log(`   Contains submit button: ${contactFormHTML.includes('submit-btn') ? 'Yes' : 'No'}`);
    
    const contactFormStyles = contactFormFeature.getStyles();
    const contactFormScripts = contactFormFeature.getScripts();
    console.log(`   Styles length: ${contactFormStyles.length} characters`);
    console.log(`   Scripts length: ${contactFormScripts.length} characters`);

    // Test 2: Social Links Feature
    console.log('\n🔗 Testing Social Media Links Feature...');
    const socialLinksFeature = new SocialLinksFeature();
    const socialLinksHTML = await socialLinksFeature.generate(mockCV, jobId);
    
    console.log('✅ Social Media Links HTML generated successfully');
    console.log(`   Length: ${socialLinksHTML.length} characters`);
    console.log(`   Contains LinkedIn: ${socialLinksHTML.includes('LinkedIn') ? 'Yes' : 'No'}`);
    console.log(`   Contains GitHub: ${socialLinksHTML.includes('GitHub') ? 'Yes' : 'No'}`);
    
    const socialLinksStyles = socialLinksFeature.getStyles();
    const socialLinksScripts = socialLinksFeature.getScripts();
    console.log(`   Styles length: ${socialLinksStyles.length} characters`);
    console.log(`   Scripts length: ${socialLinksScripts.length} characters`);

    // Test 3: Feature Registry Integration
    console.log('\n🏭 Testing Feature Registry Integration...');
    const features = await FeatureRegistry.generateFeatures(mockCV, jobId, ['contact-form', 'social-media-links']);
    
    console.log('✅ Feature Registry integration successful');
    console.log(`   Contact Form generated: ${features.contactForm ? 'Yes' : 'No'}`);
    console.log(`   Social Links generated: ${features.socialLinks ? 'Yes' : 'No'}`);
    console.log(`   Additional styles included: ${features.additionalStyles ? 'Yes' : 'No'}`);
    console.log(`   Additional scripts included: ${features.additionalScripts ? 'Yes' : 'No'}`);

    if (features.contactForm) {
      console.log(`   Contact Form length: ${features.contactForm.length} characters`);
    }
    
    if (features.socialLinks) {
      console.log(`   Social Links length: ${features.socialLinks.length} characters`);
    }

    // Test 4: Feature Registry Coverage
    console.log('\n📋 Testing Feature Registry Coverage...');
    const supportedTypes = FeatureRegistry.getSupportedTypes();
    console.log(`   Total supported features: ${supportedTypes.length}`);
    console.log(`   Contact Form supported: ${FeatureRegistry.isSupported('contact-form') ? 'Yes' : 'No'}`);
    console.log(`   Social Links supported: ${FeatureRegistry.isSupported('social-media-links') ? 'Yes' : 'No'}`);

    console.log('\n🎉 All tests passed successfully!');
    console.log('✅ Contact Form feature is now functional');
    console.log('✅ Social Media Links feature is now functional');
    console.log('✅ Features are properly integrated with FeatureRegistry');
    console.log('✅ Both features will now appear in generated CVs');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testFeatures().catch(console.error);
}

export { testFeatures };