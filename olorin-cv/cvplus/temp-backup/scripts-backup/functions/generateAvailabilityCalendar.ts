import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { simpleCorsOptions } from '../../config/cors';
import { requireGoogleAuth } from '../../utils/auth';

export const generateAvailabilityCalendar = onCall(
  {
    timeoutSeconds: 60,
    ...simpleCorsOptions
  },
  async (request) => {
    // Require Google authentication
    const user = await requireGoogleAuth(request);
    // PII REMOVED: Email logging removed for security compliance

    const { jobId } = request.data;

    try {
      // Get the job data with parsed CV
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (!jobData?.parsedData) {
        throw new Error('CV data not found. Please ensure CV is parsed first.');
      }

      // Update status to processing
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.availability-calendar.status': 'processing',
          'enhancedFeatures.availability-calendar.progress': 25,
          'enhancedFeatures.availability-calendar.currentStep': 'Setting up availability calendar...',
          'enhancedFeatures.availability-calendar.startedAt': FieldValue.serverTimestamp()
        });

      // Update progress
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.availability-calendar.progress': 50,
          'enhancedFeatures.availability-calendar.currentStep': 'Generating calendar interface...'
        });

      // Generate availability calendar data
      const availabilityCalendarData = generateAvailabilityCalendarData(jobData.parsedData);

      // Update progress
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.availability-calendar.progress': 75,
          'enhancedFeatures.availability-calendar.currentStep': 'Generating calendar data...'
        });

      // Store the calendar data (React component will use this)
      const dataRef = admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .collection('featureData')
        .doc('availability-calendar');

      await dataRef.set({
        featureId: 'availability-calendar',
        data: availabilityCalendarData,
        userId: user.uid, // Associate with authenticated user
        hasCalendarPermissions: user.hasCalendarPermissions || false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      // Update final status
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.availability-calendar.status': 'completed',
          'enhancedFeatures.availability-calendar.progress': 100,
          'enhancedFeatures.availability-calendar.currentStep': 'availability-calendar enhancement complete',
          'enhancedFeatures.availability-calendar.completedAt': FieldValue.serverTimestamp(),
          'enhancedFeatures.availability-calendar.result': {
            success: true,
            featureDataId: 'availability-calendar',
            message: 'Availability calendar integration completed successfully'
          }
        });

      return {
        success: true,
        featureData: availabilityCalendarData,
        message: 'Availability calendar generated successfully'
      };

    } catch (error) {
      
      // Update error status
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.availability-calendar.status': 'failed',
          'enhancedFeatures.availability-calendar.currentStep': 'Failed to generate availability calendar',
          'enhancedFeatures.availability-calendar.error': error instanceof Error ? error.message : 'Unknown error',
          'enhancedFeatures.availability-calendar.failedAt': FieldValue.serverTimestamp()
        });

      throw new Error(`Failed to generate availability calendar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

function generateAvailabilityCalendarData(cvData: any): any {
  const personalInfo = cvData.personalInfo || {};
  const name = personalInfo.name || cvData.personalInformation?.name || 'Professional';
  
  return {
    type: 'availability-calendar',
    professionalName: name,
    professionalEmail: personalInfo.email || 'contact@example.com',
    availableHours: {
      start: '09:00',
      end: '16:00',
      timezone: 'Local Time'
    },
    workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    timeSlots: [
      { time: '09:00', display: '9:00 AM' },
      { time: '10:00', display: '10:00 AM' },
      { time: '11:00', display: '11:00 AM' },
      { time: '14:00', display: '2:00 PM' },
      { time: '15:00', display: '3:00 PM' },
      { time: '16:00', display: '4:00 PM' }
    ],
    meetingTypes: [
      { duration: 15, title: 'Quick Chat', description: '15-minute informal discussion' },
      { duration: 30, title: 'Project Discussion', description: '30-minute focused meeting' },
      { duration: 60, title: 'Consultation', description: '60-minute comprehensive session' }
    ],
    responseTime: 'Within 24 hours'
  };
}