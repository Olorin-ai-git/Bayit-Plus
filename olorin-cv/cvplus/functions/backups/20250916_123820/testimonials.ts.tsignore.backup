// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { TestimonialsService } from '../services/testimonials.service';
import { CVParsingService } from '../services/cvParsing.service';
import { logger } from 'firebase-functions';
import { corsOptions } from '../config/cors';

const testimonialsService = new TestimonialsService();
const cvParsingService = new CVParsingService();

export const generateTestimonialsCarousel = onCall(
  { 
    secrets: ['OPENAI_API_KEY'],
    ...corsOptions
  },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId } = request.data;
      if (!jobId) {
        throw new HttpsError('invalid-argument', 'Job ID is required');
      }

      logger.info(`Generating testimonials carousel for job: ${jobId}`);

      // Get the parsed CV data
      const parsedCV = await cvParsingService.getParsedCV(jobId);
      if (!parsedCV) {
        throw new HttpsError('not-found', 'Parsed CV not found');
      }

      // Generate testimonials carousel
      // Temporary fix: Use getUserTestimonials instead
      const userTestimonials = await testimonialsService.getUserTestimonials(request.auth.uid);
      const carousel = { testimonials: userTestimonials, totalCount: userTestimonials.length };

      logger.info(`Successfully generated testimonials carousel with ${carousel.testimonials.length} testimonials`);

      return {
        success: true,
        carousel,
        message: 'Testimonials carousel generated successfully'
      };
    } catch (error) {
      logger.error('Error generating testimonials carousel:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to generate testimonials carousel');
    }
  }
);

export const addTestimonial = onCall(
  { ...corsOptions },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId, testimonial } = request.data;
      if (!jobId || !testimonial) {
        throw new HttpsError('invalid-argument', 'Job ID and testimonial data are required');
      }

      logger.info(`Adding testimonial to job: ${jobId}`);

      // Temporary fix: Use createTestimonial instead
      const newTestimonialId = await testimonialsService.createTestimonial(testimonial);
      const newTestimonial = { ...testimonial, id: newTestimonialId };

      return {
        success: true,
        testimonial: newTestimonial,
        message: 'Testimonial added successfully'
      };
    } catch (error) {
      logger.error('Error adding testimonial:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to add testimonial');
    }
  }
);

export const updateTestimonial = onCall(
  { ...corsOptions },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId, testimonialId, updates } = request.data;
      if (!jobId || !testimonialId || !updates) {
        throw new HttpsError('invalid-argument', 'Job ID, testimonial ID, and updates are required');
      }

      logger.info(`Updating testimonial ${testimonialId} for job: ${jobId}`);

      await testimonialsService.updateTestimonial(jobId, testimonialId, updates);

      return {
        success: true,
        message: 'Testimonial updated successfully'
      };
    } catch (error) {
      logger.error('Error updating testimonial:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to update testimonial');
    }
  }
);

export const removeTestimonial = onCall(
  { ...corsOptions },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId, testimonialId } = request.data;
      if (!jobId || !testimonialId) {
        throw new HttpsError('invalid-argument', 'Job ID and testimonial ID are required');
      }

      logger.info(`Removing testimonial ${testimonialId} from job: ${jobId}`);

      // Temporary fix: Use deleteTestimonial instead
      await testimonialsService.deleteTestimonial(request.auth.uid, testimonialId);

      return {
        success: true,
        message: 'Testimonial removed successfully'
      };
    } catch (error) {
      logger.error('Error removing testimonial:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to remove testimonial');
    }
  }
);

export const updateCarouselLayout = onCall(
  { ...corsOptions },
  async (request: CallableRequest) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      const { jobId, layoutOptions } = request.data;
      if (!jobId || !layoutOptions) {
        throw new HttpsError('invalid-argument', 'Job ID and layout options are required');
      }

      logger.info(`Updating carousel layout for job: ${jobId}`);

      // Update layout in Firestore
      const admin = require('firebase-admin');
      const db = admin.firestore();
      
      const carouselDoc = await db.collection('jobs').doc(jobId).collection('features').doc('testimonials').get();
      
      if (carouselDoc.exists) {
        const data = carouselDoc.data();
        const carousel = data?.carousel;
        
        if (carousel) {
          carousel.layout = { ...carousel.layout, ...layoutOptions };
          await carouselDoc.ref.update({ carousel });
        }
      }

      return {
        success: true,
        message: 'Carousel layout updated successfully'
      };
    } catch (error) {
      logger.error('Error updating carousel layout:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to update carousel layout');
    }
  }
);