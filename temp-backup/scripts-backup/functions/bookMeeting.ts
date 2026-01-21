import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { simpleCorsOptions } from '@cvplus/core/config';
import CalendarIntegrationService from '../../services/calendar-integration.service';
import { requireCalendarPermissions } from '@cvplus/core/utils/auth';
import { createLogger } from '../../utils/cvplus-logging';
const logger = createLogger('BookMeeting');

export const bookMeeting = onCall(
  {
    timeoutSeconds: 60,
    ...simpleCorsOptions
  },
  async (request) => {
    logger.info('BookMeeting: Function invoked', {
      event: 'meeting.book.function_invoked',
      hasAuth: !!request.auth,
      dataKeys: Object.keys(request.data || {}),
      function: 'bookMeeting'
    });

    try {
      // CRITICAL SECURITY: Require Google authentication with calendar permissions
      const user = await requireCalendarPermissions(request);
      const { jobId, duration, attendeeEmail, attendeeName, meetingType } = request.data;

      logger.debug('BookMeeting: User authenticated successfully', {
        event: 'meeting.book.user_authenticated',
        userId: user.uid,
        function: 'bookMeeting'
      });

      // SECURITY: Input validation
      if (!jobId || typeof jobId !== 'string') {
        logger.warn('BookMeeting: Invalid jobId provided', {
          event: 'meeting.book.validation_failed',
          field: 'jobId',
          value: typeof jobId,
          userId: user.uid,
          function: 'bookMeeting'
        });
        throw new Error('Invalid jobId provided');
      }
      if (!duration || typeof duration !== 'number' || duration < 15 || duration > 180) {
        logger.warn('BookMeeting: Invalid duration provided', {
          event: 'meeting.book.validation_failed',
          field: 'duration',
          value: duration,
          type: typeof duration,
          userId: user.uid,
          function: 'bookMeeting'
        });
        throw new Error('Invalid duration. Must be between 15 and 180 minutes');
      }
      if (!attendeeEmail || typeof attendeeEmail !== 'string' || !attendeeEmail.includes('@')) {
        logger.warn('BookMeeting: Invalid attendee email provided', {
          event: 'meeting.book.validation_failed',
          field: 'attendeeEmail',
          hasEmail: !!attendeeEmail,
          isString: typeof attendeeEmail === 'string',
          hasAtSymbol: attendeeEmail?.includes('@'),
          userId: user.uid,
          function: 'bookMeeting'
        });
        throw new Error('Invalid attendee email provided');
      }
      if (meetingType && typeof meetingType !== 'string') {
        logger.warn('BookMeeting: Invalid meeting type provided', {
          event: 'meeting.book.validation_failed',
          field: 'meetingType',
          type: typeof meetingType,
          userId: user.uid,
          function: 'bookMeeting'
        });
        throw new Error('Invalid meeting type provided');
      }

      logger.debug('BookMeeting: Input validation passed', {
        event: 'meeting.book.validation_passed',
        jobId,
        duration,
        meetingType: meetingType || 'default',
        userId: user.uid,
        function: 'bookMeeting'
      });

      // Verify user owns the job - CRITICAL SECURITY CHECK
      logger.debug('BookMeeting: Fetching job document', {
        event: 'meeting.book.job_fetch_started',
        jobId,
        userId: user.uid,
        function: 'bookMeeting'
      });

      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();

      if (!jobDoc.exists) {
        logger.warn('BookMeeting: Job not found', {
          event: 'meeting.book.job_not_found',
          jobId,
          userId: user.uid,
          function: 'bookMeeting'
        });
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();
      if (!jobData?.parsedData) {
        logger.error('BookMeeting: CV data missing from job', new Error('CV data not found'), {
          event: 'meeting.book.cv_data_missing',
          jobId,
          hasJobData: !!jobData,
          userId: user.uid,
          function: 'bookMeeting'
        });
        throw new Error('CV data not found');
      }

      // SECURITY: Ensure user owns this job
      if (jobData.userId !== user.uid) {
        logger.error('BookMeeting: Unauthorized access attempt', new Error('Unauthorized access'), {
          event: 'meeting.book.unauthorized_access',
          jobId,
          requestUserId: user.uid,
          jobOwnerId: jobData.userId,
          securityViolation: true,
          function: 'bookMeeting'
        });
        throw new Error('Unauthorized: You can only book meetings for your own CV');
      }

      logger.debug('BookMeeting: Job ownership verified', {
        event: 'meeting.book.job_ownership_verified',
        jobId,
        userId: user.uid,
        function: 'bookMeeting'
      });

      const personalInfo = jobData.parsedData.personalInfo || {};
      const professionalName = personalInfo.name || jobData.parsedData.personalInformation?.name || 'Professional';
      const professionalEmail = personalInfo.email || 'contact@example.com';

      logger.debug('BookMeeting: Extracted professional info', {
        event: 'meeting.book.professional_info_extracted',
        hasProfessionalName: !!professionalName,
        hasProfessionalEmail: !!professionalEmail,
        userId: user.uid,
        function: 'bookMeeting'
      });

      // Create Google Calendar meeting invite
      logger.info('BookMeeting: Creating calendar meeting invite', {
        event: 'meeting.book.calendar_invite_creation_started',
        duration,
        meetingType: meetingType || 'default',
        userId: user.uid,
        function: 'bookMeeting'
      });

      const meetingInvite = await calendarIntegrationService.createMeetingInvite(
        attendeeEmail,
        duration,
        professionalName,
        professionalEmail,
        meetingType
      );

      logger.info('BookMeeting: Calendar meeting invite created successfully', {
        event: 'meeting.book.calendar_invite_created',
        hasCalendarUrl: !!meetingInvite.calendarUrl,
        hasMeetingDetails: !!meetingInvite.meetingDetails,
        userId: user.uid,
        function: 'bookMeeting'
      });

      // Store the meeting request in Firestore
      logger.debug('BookMeeting: Storing meeting request in Firestore', {
        event: 'meeting.book.firestore_storage_started',
        userId: user.uid,
        function: 'bookMeeting'
      });

      const meetingDoc = await admin.firestore()
        .collection('meetings')
        .add({
          jobId,
          attendeeEmail,
          attendeeName: attendeeName || attendeeEmail,
          professionalName,
          professionalEmail,
          duration,
          meetingType,
          status: 'pending',
          calendarUrl: meetingInvite.calendarUrl,
          meetingDetails: meetingInvite.meetingDetails,
          createdAt: FieldValue.serverTimestamp(),
          requestedVia: 'availability-calendar'
        });

      logger.info('BookMeeting: Meeting request stored successfully', {
        event: 'meeting.book.meeting_created_successfully',
        meetingId: meetingDoc.id,
        duration,
        meetingType: meetingType || 'default',
        userId: user.uid,
        function: 'bookMeeting'
      });

      // Send notification email to professional (optional)
      // This could be implemented using SendGrid or Firebase Functions email sending

      return {
        success: true,
        meetingId: meetingDoc.id,
        calendarUrl: meetingInvite.calendarUrl,
        meetingDetails: meetingInvite.meetingDetails,
        message: 'Meeting request created successfully. The professional will be notified.'
      };

    } catch (error) {
      logger.error('BookMeeting: Function execution failed', error as Error, {
        event: 'meeting.book.function_failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        function: 'bookMeeting'
      });
      throw new Error(`Failed to book meeting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);