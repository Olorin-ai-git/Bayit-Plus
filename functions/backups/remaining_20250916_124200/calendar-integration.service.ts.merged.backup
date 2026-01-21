// @ts-ignore - Export conflicts/**
 * Calendar Integration Service
 * Sync career milestones with Google Calendar, Outlook, and iCal
 */

import { ParsedCV } from '../types/enhanced-models';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import ical from 'ical-generator';
import axios from 'axios';
import { getGoogleAccessToken } from '../utils/auth';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  allDay: boolean;
  location?: string;
  type: 'work' | 'education' | 'achievement' | 'certification' | 'reminder';
  color?: string;
  recurring?: {
    frequency: 'yearly' | 'monthly';
    interval?: number;
  };
}

interface CalendarIntegration {
  provider: 'google' | 'outlook' | 'ical';
  events: CalendarEvent[];
  syncUrl?: string;
  downloadUrl?: string;
  instructions?: string[];
}

export class CalendarIntegrationService {
  private oauth2Client: any;
  
  constructor() {
    // Initialize Google OAuth2 client if credentials are available
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URL || 'https://cvplus.com/auth/google/callback'
      );
    }
  }
  
  /**
   * Generate calendar events from CV data
   */
  async generateCalendarEvents(parsedCV: ParsedCV, _jobId: string): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    
    // TODO: Use _jobId for job-specific event customization in the future
    
    // Add work anniversaries
    if (parsedCV.experience) {
      for (const exp of parsedCV.experience) {
        const startDate = this.parseDate(exp.startDate);
        
        // Work start anniversary
        events.push({
          id: `work-start-${events.length}`,
          title: `Work Anniversary: Started at ${exp.company}`,
          description: `Celebrating the day you started as ${exp.position} at ${exp.company}`,
          startDate: this.getNextAnniversary(startDate),
          allDay: true,
          type: 'work',
          color: '#4285F4', // Google Blue
          recurring: {
            frequency: 'yearly'
          }
        });
        
        // If ended, add completion milestone
        if (exp.endDate) {
          const endDate = this.parseDate(exp.endDate);
          events.push({
            id: `work-end-${events.length}`,
            title: `Career Milestone: ${exp.position} at ${exp.company}`,
            description: `Completed ${this.calculateDuration(startDate, endDate)} as ${exp.position}`,
            startDate: endDate,
            allDay: true,
            type: 'work',
            color: '#34A853' // Google Green
          });
        }
        
        // Add major achievements as events
        if (exp.achievements) {
          for (const achievement of exp.achievements.slice(0, 2)) { // Top 2 achievements
            const achievementDate = this.extractDateFromText(achievement) || startDate;
            events.push({
              id: `achievement-${events.length}`,
              title: `Achievement: ${this.truncateText(achievement, 50)}`,
              description: achievement,
              startDate: achievementDate,
              allDay: true,
              type: 'achievement',
              color: '#FBBC04' // Google Yellow
            });
          }
        }
      }
    }
    
    // Add education milestones
    if (parsedCV.education) {
      for (const edu of parsedCV.education) {
        if (edu.graduationDate) {
          const gradDate = this.parseDate(edu.graduationDate);
          
          // Graduation anniversary
          events.push({
            id: `edu-${events.length}`,
            title: `Education: ${edu.degree} from ${edu.institution}`,
            description: `Graduated with ${edu.degree} in ${edu.field}${edu.gpa ? ` (GPA: ${edu.gpa})` : ''}`,
            startDate: this.getNextAnniversary(gradDate),
            allDay: true,
            type: 'education',
            color: '#9C27B0', // Purple
            recurring: {
              frequency: 'yearly'
            }
          });
        }
      }
    }
    
    // Add certification renewals
    if (parsedCV.certifications) {
      for (const cert of parsedCV.certifications) {
        // Note: expiryDate not available in current interface
        // if (cert.expiryDate) {
        //   const expiryDate = this.parseDate(cert.expiryDate);
        //   const reminderDate = new Date(expiryDate);
        //   reminderDate.setMonth(reminderDate.getMonth() - 1); // 1 month before expiry
          
        //   events.push({
        //     id: `cert-renewal-${events.length}`,
        //     title: `Certification Renewal: ${cert.name}`,
        //     description: `${cert.name} from ${cert.issuer} expires on ${expiryDate.toDateString()}. Time to renew!`,
        //     startDate: reminderDate,
        //     allDay: true,
        //     type: 'reminder',
        //     color: '#EA4335' // Google Red
        //   });
        // }
        
        // Add certification achievement date
        if (cert.date) {
          const certDate = this.parseDate(cert.date);
          events.push({
            id: `cert-achieved-${events.length}`,
            title: `Certification: ${cert.name}`,
            description: `Earned ${cert.name} from ${cert.issuer}`,
            startDate: certDate,
            allDay: true,
            type: 'certification',
            color: '#34A853' // Google Green
          });
        }
      }
    }
    
    // Add career review reminders
    const today = new Date();
    const quarterlyReview = new Date(today);
    quarterlyReview.setMonth(quarterlyReview.getMonth() + 3);
    
    events.push({
      id: 'career-review-quarterly',
      title: 'Career Review: Update Your CV',
      description: 'Time to update your CV with recent achievements and skills',
      startDate: quarterlyReview,
      allDay: true,
      type: 'reminder',
      color: '#4285F4',
      recurring: {
        frequency: 'monthly',
        interval: 3
      }
    });
    
    // Add skills update reminder
    const skillsReview = new Date(today);
    skillsReview.setMonth(skillsReview.getMonth() + 6);
    
    events.push({
      id: 'skills-update',
      title: 'Skills Update: Learn Something New',
      description: 'Review market trends and update your skills',
      startDate: skillsReview,
      allDay: true,
      type: 'reminder',
      color: '#FBBC04',
      recurring: {
        frequency: 'monthly',
        interval: 6
      }
    });
    
    return events;
  }
  
  /**
   * Create Google Calendar integration using stored user tokens
   */
  async createGoogleCalendarIntegration(
    events: CalendarEvent[],
    jobId: string,
    userId: string,
    accessToken?: string
  ): Promise<CalendarIntegration> {
    if (!this.oauth2Client) {
      throw new Error('Google Calendar integration not configured');
    }
    
    // Use provided token or get from stored user tokens
    const tokenToUse = accessToken || await getGoogleAccessToken(userId);
    
    if (tokenToUse) {
      this.oauth2Client.setCredentials({ access_token: tokenToUse });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      try {
        // Create a new calendar for career milestones
        const calendarResponse = await calendar.calendars.insert({
          requestBody: {
            summary: 'Career Milestones - CVPlus',
            description: 'Your professional journey milestones and reminders',
            timeZone: 'America/Los_Angeles'
          }
        });
        
        const calendarId = calendarResponse.data.id;
        
        // Add events to the calendar
        for (const event of events) {
          const eventBody: any = {
            summary: event.title,
            description: event.description,
            start: {
              date: event.startDate.toISOString().split('T')[0],
              timeZone: 'America/Los_Angeles'
            },
            end: {
              date: event.endDate 
                ? event.endDate.toISOString().split('T')[0]
                : event.startDate.toISOString().split('T')[0],
              timeZone: 'America/Los_Angeles'
            },
            colorId: this.getGoogleColorId(event.color),
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 24 * 60 }, // 1 day before
                { method: 'popup', minutes: 60 } // 1 hour before
              ]
            }
          };
          
          // Add recurrence if specified
          if (event.recurring) {
            eventBody.recurrence = [
              `RRULE:FREQ=${event.recurring.frequency.toUpperCase()};INTERVAL=${event.recurring.interval || 1}`
            ];
          }
          
          await calendar.events.insert({
            calendarId: calendarId!,
            requestBody: eventBody
          });
        }
        
        return {
          provider: 'google',
          events,
          syncUrl: `https://calendar.google.com/calendar/r?cid=${calendarId}`,
          instructions: [
            'Your career milestones calendar has been created in Google Calendar',
            'Events will sync automatically',
            'You can customize colors and notifications in Google Calendar'
          ]
        };
      } catch (error) {
        throw error;
      }
    } else {
      // Generate OAuth URL for user to authorize (fallback)
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events'
        ],
        state: jobId
      });
      
      return {
        provider: 'google',
        events,
        syncUrl: authUrl,
        instructions: [
          'Please re-authenticate to grant calendar permissions',
          'Your career milestones will be synced after authorization', 
          'Calendar integration requires additional permissions'
        ]
      };
    }
  }
  
  /**
   * Create iCal file for download
   */
  async createICalFile(events: CalendarEvent[], cvData: ParsedCV, jobId: string): Promise<CalendarIntegration> {
    const cal = ical({
      name: 'Career Milestones - CVPlus',
      description: `Professional journey for ${cvData.personalInfo?.name || 'User'}`,
      timezone: 'America/Los_Angeles',
      prodId: {
        company: 'CVPlus',
        product: 'Career Calendar'
      }
    });
    
    for (const event of events) {
      const icalEvent: any = {
        start: event.startDate,
        end: event.endDate || event.startDate,
        allDay: event.allDay,
        summary: event.title,
        description: event.description,
        categories: [{ name: event.type }],
        alarms: [
          {
            type: 'display',
            trigger: 86400 // 1 day before
          }
        ]
      };
      
      // Add location if available
      if (event.location) {
        icalEvent.location = event.location;
      }
      
      // Add recurrence
      if (event.recurring) {
        icalEvent.repeating = {
          freq: event.recurring.frequency === 'yearly' ? 'YEARLY' : 'MONTHLY',
          interval: event.recurring.interval || 1
        };
      }
      
      cal.createEvent(icalEvent);
    }
    
    // Save iCal file to Firebase Storage
    const bucket = admin.storage().bucket();
    const fileName = `calendar/${jobId}/career-milestones.ics`;
    const file = bucket.file(fileName);
    
    await file.save(cal.toString(), {
      metadata: {
        contentType: 'text/calendar',
        metadata: {
          jobId,
          generatedAt: new Date().toISOString()
        }
      }
    });
    
    const [downloadUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    return {
      provider: 'ical',
      events,
      downloadUrl,
      instructions: [
        'Download the .ics file',
        'Open with your calendar app (Apple Calendar, Outlook, etc.)',
        'Events will be imported to your calendar',
        'Set up recurring reminders as needed'
      ]
    };
  }
  
  /**
   * Create Outlook calendar integration
   */
  async createOutlookIntegration(
    events: CalendarEvent[],
    jobId: string,
    accessToken?: string
  ): Promise<CalendarIntegration> {
    if (accessToken) {
      try {
        // Create calendar using Microsoft Graph API
        const response = await axios.post(
          'https://graph.microsoft.com/v1.0/me/calendars',
          {
            name: 'Career Milestones - CVPlus',
            color: 'auto'
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        const calendarId = response.data.id;
        
        // Add events
        for (const event of events) {
          const eventBody: any = {
            subject: event.title,
            body: {
              contentType: 'HTML',
              content: event.description
            },
            start: {
              dateTime: event.startDate.toISOString(),
              timeZone: 'Pacific Standard Time'
            },
            end: {
              dateTime: (event.endDate || event.startDate).toISOString(),
              timeZone: 'Pacific Standard Time'
            },
            isAllDay: event.allDay,
            categories: [event.type],
            importance: 'normal',
            showAs: 'free',
            isReminderOn: true,
            reminderMinutesBeforeStart: 1440 // 24 hours
          };
          
          // Add recurrence
          if (event.recurring) {
            eventBody.recurrence = {
              pattern: {
                type: event.recurring.frequency,
                interval: event.recurring.interval || 1
              },
              range: {
                type: 'noEnd',
                startDate: event.startDate.toISOString().split('T')[0]
              }
            };
          }
          
          await axios.post(
            `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`,
            eventBody,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
        }
        
        return {
          provider: 'outlook',
          events,
          syncUrl: 'https://outlook.live.com/calendar',
          instructions: [
            'Your career milestones have been added to Outlook',
            'Check your Outlook calendar for the new events',
            'You can edit or delete events as needed'
          ]
        };
      } catch (error) {
        throw error;
      }
    } else {
      // Generate OAuth URL for Outlook
      const clientId = process.env.MICROSOFT_CLIENT_ID || '';
      const redirectUri = process.env.MICROSOFT_REDIRECT_URL || 'https://cvplus.com/auth/outlook/callback';
      const scope = 'Calendars.ReadWrite offline_access';
      
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `state=${jobId}`;
      
      return {
        provider: 'outlook',
        events,
        syncUrl: authUrl,
        instructions: [
          'Click the link to authorize Outlook access',
          'Your career milestones will be synced after authorization',
          'Manage events in Outlook or Outlook.com'
        ]
      };
    }
  }
  
  /**
   * Helper methods
   */
  
  private parseDate(dateStr: string): Date {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try parsing various formats
    const patterns = [
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\w+)\s+(\d{4})/
    ];
    
    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        // Handle different formats appropriately
        return new Date(dateStr);
      }
    }
    
    return new Date();
  }
  
  private getNextAnniversary(date: Date): Date {
    const today = new Date();
    const anniversary = new Date(date);
    anniversary.setFullYear(today.getFullYear());
    
    if (anniversary < today) {
      anniversary.setFullYear(today.getFullYear() + 1);
    }
    
    return anniversary;
  }
  
  private calculateDuration(start: Date, end: Date): string {
    const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                   (end.getMonth() - start.getMonth());
    
    if (months < 12) {
      return `${months} months`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      return remainingMonths > 0 
        ? `${years} years and ${remainingMonths} months`
        : `${years} years`;
    }
  }
  
  private extractDateFromText(text: string): Date | null {
    // Try to extract date from achievement text
    const patterns = [
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
      /\b(\d{4})\b/,
      /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return new Date(match[0]);
      }
    }
    
    return null;
  }
  
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
  
  private getGoogleColorId(color?: string): string {
    // Map colors to Google Calendar color IDs
    const colorMap: Record<string, string> = {
      '#4285F4': '9', // Blue
      '#34A853': '10', // Green
      '#FBBC04': '5', // Yellow
      '#EA4335': '11', // Red
      '#9C27B0': '3' // Purple
    };
    
    return colorMap[color || '#4285F4'] || '9';
  }
  
  /**
   * Create a Google Calendar meeting invitation
   */
  async createMeetingInvite(
    attendeeEmail: string,
    duration: number,
    professionalName: string,
    professionalEmail: string,
    meetingType: string
  ): Promise<{ calendarUrl: string; meetingDetails: any }> {
    // Create a Google Calendar event URL with pre-filled details
    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    
    const eventDetails = {
      title: `${meetingType} with ${professionalName}`,
      description: `Professional meeting scheduled through CVPlus.\n\nMeeting Type: ${meetingType}\nDuration: ${duration} minutes\n\nThis meeting was requested through the availability calendar on the professional profile.`,
      startTime: startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
      endTime: endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
      attendees: [attendeeEmail, professionalEmail].join(',')
    };
    
    // Generate Google Calendar URL
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(eventDetails.title)}` +
      `&dates=${eventDetails.startTime}/${eventDetails.endTime}` +
      `&details=${encodeURIComponent(eventDetails.description)}` +
      `&add=${encodeURIComponent(eventDetails.attendees)}` +
      `&sf=true&output=xml`;
    
    return {
      calendarUrl,
      meetingDetails: {
        title: eventDetails.title,
        description: eventDetails.description,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration,
        attendees: [attendeeEmail, professionalEmail],
        meetingType
      }
    };
  }

  /**
   * Store calendar data in Firestore
   */
  async storeCalendarData(jobId: string, calendarData: any): Promise<void> {
    await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .update({
        'enhancedFeatures.calendar': {
          enabled: true,
          status: 'completed',
          data: calendarData,
          generatedAt: FieldValue.serverTimestamp()
        }
      });
  }
}

export const calendarIntegrationService = new CalendarIntegrationService();