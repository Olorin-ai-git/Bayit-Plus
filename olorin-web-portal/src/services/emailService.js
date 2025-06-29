import emailjs from '@emailjs/browser';

// EmailJS configuration
export const EMAIL_CONFIG = {
  SERVICE_ID: 'olorinai', // Olorin.ai service ID
  TEMPLATE_CLIENT_CONTACT: 'template_contact_reply', // Client contact template
  PUBLIC_KEY: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || 'kseMiYFPJllTotInz', // Your EmailJS public key from env
  ADMIN_EMAIL: 'contact@olorin.ai' // Olorin.ai contact email
};

// Initialize EmailJS (call this once when app starts)
export const initializeEmailService = () => {
  emailjs.init(EMAIL_CONFIG.PUBLIC_KEY);
};

// Send booking confirmation email to client
export const sendClientConfirmationEmail = async (bookingData) => {
  try {
    console.log('📧 Attempting to send client confirmation email...');
    console.log('📧 EmailJS Config:', {
      serviceId: EMAIL_CONFIG.SERVICE_ID,
      templateId: EMAIL_CONFIG.TEMPLATE_CLIENT_CONFIRMATION,
      publicKey: EMAIL_CONFIG.PUBLIC_KEY ? 'Set' : 'Missing'
    });
    // Generate management links
    const baseUrl = window.location.origin;
    const manageUrl = `${baseUrl}/manage-reservation?confirmation=${bookingData.confirmationNumber}&email=${encodeURIComponent(bookingData.email)}`;
    const cancelUrl = `${baseUrl}/manage-reservation?confirmation=${bookingData.confirmationNumber}&email=${encodeURIComponent(bookingData.email)}&action=cancel`;
    const updateUrl = `${baseUrl}/manage-reservation?confirmation=${bookingData.confirmationNumber}&email=${encodeURIComponent(bookingData.email)}&action=update`;

    const templateParams = {
      to_email: bookingData.email,
      to_name: `${bookingData.firstName} ${bookingData.lastName}`,
      confirmation_number: bookingData.confirmationNumber,
      guest_name: `${bookingData.firstName} ${bookingData.lastName}`,
      check_in: new Date(bookingData.checkIn).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      check_out: new Date(bookingData.checkOut).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      guests: bookingData.guests,
      nights: calculateNights(bookingData.checkIn, bookingData.checkOut),
      total_amount: bookingData.totalAmount,
      currency: bookingData.currency || 'EUR',
      payment_method: bookingData.paymentMethod,
      guest_phone: bookingData.phone || 'Not provided',
      special_requests: bookingData.specialRequests || 'None',
      property_name: 'Busteni View - Mountain Retreat',
      property_address: 'Busteni, Prahova County, Romania',
      property_phone: '+40 XXX XXX XXX', // Add your property phone
      booking_date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      // Management links
      manage_reservation_url: manageUrl,
      cancel_reservation_url: cancelUrl,
      update_reservation_url: updateUrl,
      // Additional info for email template
      payment_status: bookingData.paymentStatus,
      rate_type: bookingData.rateName || 'Standard Rate',
      balance_due: bookingData.balanceAmount || 0
    };

    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATE_CLIENT_CONFIRMATION,
      templateParams
    );

    console.log('✅ Client confirmation email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Failed to send client confirmation email:', error);
    console.error('❌ Error details:', {
      status: error.status,
      text: error.text,
      message: error.message,
      name: error.name
    });
    return { success: false, error: error.message || error.text || 'Unknown email error' };
  }
};

// Send booking notification email to admin
export const sendAdminNotificationEmail = async (bookingData) => {
  try {
    const templateParams = {
      to_email: EMAIL_CONFIG.ADMIN_EMAIL,
      to_name: 'Busteni View Admin',
      confirmation_number: bookingData.confirmationNumber,
      guest_name: `${bookingData.firstName} ${bookingData.lastName}`,
      guest_email: bookingData.email,
      guest_phone: bookingData.phone || 'Not provided',
      check_in: new Date(bookingData.checkIn).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      check_out: new Date(bookingData.checkOut).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      guests: bookingData.guests,
      nights: calculateNights(bookingData.checkIn, bookingData.checkOut),
      total_amount: bookingData.totalAmount,
      currency: bookingData.currency || 'EUR',
      payment_method: bookingData.paymentMethod,
      payment_status: bookingData.paymentStatus,
      special_requests: bookingData.specialRequests || 'None',
      booking_date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      days_until_checkin: Math.ceil((new Date(bookingData.checkIn) - new Date()) / (1000 * 60 * 60 * 24))
    };

    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATE_ADMIN_NOTIFICATION,
      templateParams
    );

    console.log('✅ Admin notification email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Failed to send admin notification email:', error);
    return { success: false, error: error.message };
  }
};

// Send both client and admin emails
export const sendBookingEmails = async (bookingData) => {
  console.log('📧 Sending booking confirmation emails...');
  
  const results = {
    clientEmail: { success: false },
    adminEmail: { success: false }
  };

  try {
    // Send client confirmation email
    results.clientEmail = await sendClientConfirmationEmail(bookingData);
    
    // Send admin notification email
    results.adminEmail = await sendAdminNotificationEmail(bookingData);
    
    const bothSuccessful = results.clientEmail.success && results.adminEmail.success;
    
    if (bothSuccessful) {
      console.log('🎉 All booking emails sent successfully!');
    } else {
      console.log('⚠️ Some emails failed to send:', results);
    }
    
    return {
      success: bothSuccessful,
      results
    };
  } catch (error) {
    console.error('❌ Error sending booking emails:', error);
    return {
      success: false,
      error: error.message,
      results
    };
  }
};

// Utility function to calculate nights
const calculateNights = (checkIn, checkOut) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

// Test EmailJS configuration
export const testEmailJSConfig = async () => {
  console.log('🧪 Testing EmailJS configuration...');
  
  try {
    // Test with a simple template
    const testParams = {
      to_email: 'shereeshark@gmail.com',
      to_name: 'Test User',
      message: 'This is a test email from Busteni View booking system',
      from_name: 'Busteni View'
    };
    
    console.log('📧 Sending test email with config:', {
      serviceId: EMAIL_CONFIG.SERVICE_ID,
      templateId: EMAIL_CONFIG.TEMPLATE_CLIENT_CONFIRMATION,
      params: testParams
    });
    
    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATE_CLIENT_CONFIRMATION,
      testParams
    );
    
    console.log('✅ Test email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Test email failed:', error);
    console.error('❌ Error details:', {
      status: error.status,
      text: error.text,
      message: error.message
    });
    return { success: false, error };
  }
};

// Test email functionality
export const testEmailService = async () => {
  console.log('🧪 Testing email service...');
  
  const testBookingData = {
    confirmationNumber: 'BV' + Date.now(),
    firstName: 'Test',
    lastName: 'Guest',
    email: 'shereeshark@gmail.com', // Using your real email for testing
    phone: '+40123456789',
    checkIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    guests: 2,
    totalAmount: 450,
    currency: 'EUR',
    paymentMethod: 'test',
    paymentStatus: 'completed',
    specialRequests: 'This is a test booking email'
  };
  
  const result = await sendBookingEmails(testBookingData);
  console.log('📧 Test email result:', result);
  
  return result;
};

// Send contact form email
export const sendContactFormEmail = async (formData) => {
  try {
    console.log('📧 Attempting to send contact form email...');
    console.log('📧 EmailJS Config:', {
      serviceId: EMAIL_CONFIG.SERVICE_ID,
      templateId: EMAIL_CONFIG.TEMPLATE_CLIENT_CONTACT,
      publicKey: EMAIL_CONFIG.PUBLIC_KEY ? 'Set' : 'Missing'
    });

    const templateParams = {
      from_name: `${formData.firstName} ${formData.lastName}`,
      from_email: formData.email,
      company: formData.company || 'Not specified',
      phone: formData.phone || 'Not provided',
      subject: formData.subject,
      message: formData.message,
      to_name: 'Olorin.ai Team',
      to_email: EMAIL_CONFIG.ADMIN_EMAIL,
      contact_date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATE_CLIENT_CONTACT,
      templateParams
    );

    console.log('✅ Contact form email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Failed to send contact form email:', error);
    console.error('❌ Error details:', {
      status: error.status,
      text: error.text,
      message: error.message,
      name: error.name
    });
    return { success: false, error: error.message || error.text || 'Unknown email error' };
  }
};

// Test contact form functionality
export const testContactFormEmail = async () => {
  console.log('🧪 Testing contact form email...');
  
  const testFormData = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    company: 'Test Company',
    phone: '+1 555-0123',
    subject: 'General Inquiry',
    message: 'This is a test message from the Olorin.ai contact form.'
  };
  
  const result = await sendContactFormEmail(testFormData);
  console.log('📧 Test contact form result:', result);
  
  return result;
};

// Make test functions available globally for console testing
if (typeof window !== 'undefined') {
  window.testEmailService = testEmailService;
  window.testEmailJSConfig = testEmailJSConfig;
  window.testContactFormEmail = testContactFormEmail;
}

// Send cancellation confirmation email to client
export const sendCancellationEmail = async (bookingData) => {
  try {
    const templateParams = {
      to_email: bookingData.email,
      to_name: `${bookingData.firstName} ${bookingData.lastName}`,
      confirmation_number: bookingData.confirmationNumber,
      guest_name: `${bookingData.firstName} ${bookingData.lastName}`,
      check_in: new Date(bookingData.checkIn).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      check_out: new Date(bookingData.checkOut).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      guests: bookingData.guests,
      nights: calculateNights(bookingData.checkIn, bookingData.checkOut),
      total_amount: bookingData.totalAmount,
      currency: bookingData.currency || 'EUR',
      cancellation_reason: bookingData.cancellationReason,
      refund_amount: bookingData.refundAmount || 0,
      refund_description: bookingData.refundDescription || 'No refund applicable',
      cancelled_date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      property_name: 'Busteni View - Mountain Retreat',
      property_phone: '+40 XXX XXX XXX',
      // Rebooking link
      rebook_url: `${window.location.origin}/booking`
    };

    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      'template_cancellation', // Cancellation confirmation template
      templateParams
    );

    console.log('✅ Cancellation email sent successfully:', response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Failed to send cancellation email:', error);
    return { success: false, error: error.message };
  }
};

export default {
  initializeEmailService,
  sendClientConfirmationEmail,
  sendAdminNotificationEmail,
  sendBookingEmails,
  sendCancellationEmail,
  sendContactFormEmail,
  testEmailService,
  testContactFormEmail
}; 