/**
 * Stub Calendar Integration Service
 * Temporary stub for deployment
  */

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  location?: string;
  attendees?: string[];
}

export class CalendarIntegrationService {
  static async createEvent(_event: CalendarEvent): Promise<{ success: boolean; eventId?: string }> {
    logger.warn('⚠️ Using stub calendar service');
    return {
      success: true,
      eventId: `event_${Date.now()}`
    };
  }

  static async getAvailability(_date: Date): Promise<{ available: boolean; slots: Date[] }> {
    logger.warn('⚠️ Using stub calendar availability');
    return {
      available: true,
      slots: [new Date()]
    };
  }
}

export default CalendarIntegrationService;