// @ts-nocheck
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
import { portfolioGalleryService } from '../services/portfolio-gallery.service';
// htmlFragmentGenerator import removed - using React SPA architecture

export const generatePortfolioGallery = onCall(
  {
    timeoutSeconds: 120,
    secrets: ['OPENAI_API_KEY'],
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

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
          'enhancedFeatures.portfolioGallery.status': 'processing',
          'enhancedFeatures.portfolioGallery.progress': 25,
          'enhancedFeatures.portfolioGallery.currentStep': 'Analyzing portfolio content...',
          'enhancedFeatures.portfolioGallery.startedAt': FieldValue.serverTimestamp()
        });

      // Generate portfolio gallery
      const gallery = await portfolioGalleryService.generatePortfolioGallery(
        jobData.parsedData,
        jobId
      );

      // Update progress
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.portfolioGallery.progress': 75,
          'enhancedFeatures.portfolioGallery.currentStep': 'Creating portfolio gallery...'
        });

      // Generate HTML fragment for progressive enhancement
      // HTML generation removed - React SPA handles UI rendering;

      // Update with final results
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.portfolioGallery.status': 'completed',
          'enhancedFeatures.portfolioGallery.progress': 100,
          'enhancedFeatures.portfolioGallery.data': gallery,
          'enhancedFeatures.portfolioGallery.htmlFragment': null, // HTML fragment removed with React SPA migration
          'enhancedFeatures.portfolioGallery.processedAt': FieldValue.serverTimestamp()
        });

      return {
        success: true,
        gallery,
        htmlFragment: null
      };
    } catch (error: any) {
      
      // Update status to failed
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.portfolioGallery.status': 'failed',
          'enhancedFeatures.portfolioGallery.error': error.message,
          'enhancedFeatures.portfolioGallery.processedAt': FieldValue.serverTimestamp()
        });
      
      throw new Error(`Failed to generate portfolio gallery: ${error.message}`);
    }
  });

export const updatePortfolioItem = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, itemId, updates } = request.data;

    try {
      // Get the job and verify ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (jobData?.userId !== request.auth.uid) {
        throw new Error('Unauthorized access');
      }

      // Get current portfolio data
      const portfolio = jobData?.enhancedFeatures?.portfolio?.data;
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // Update the specific item
      const itemIndex = portfolio.items.findIndex((item: any) => item.id === itemId);
      if (itemIndex === -1) {
        throw new Error('Portfolio item not found');
      }

      portfolio.items[itemIndex] = {
        ...portfolio.items[itemIndex],
        ...updates,
        lastModified: new Date().toISOString()
      };

      // Save updated portfolio
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.portfolio.data': portfolio,
          'enhancedFeatures.portfolio.lastModified': FieldValue.serverTimestamp()
        });

      return {
        success: true,
        item: portfolio.items[itemIndex]
      };
    } catch (error: any) {
      throw new Error(`Failed to update portfolio item: ${error.message}`);
    }
  });

export const addPortfolioItem = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, item } = request.data;

    try {
      // Validate item data
      if (!item.title || !item.type || !item.category) {
        throw new Error('Missing required item fields');
      }

      // Get the job and verify ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (jobData?.userId !== request.auth.uid) {
        throw new Error('Unauthorized access');
      }

      // Get current portfolio data
      const portfolio = jobData?.enhancedFeatures?.portfolio?.data;
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // Create new item with generated ID
      const newItem = {
        ...item,
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        visibility: item.visibility || 'public'
      };

      // Add to portfolio
      portfolio.items.push(newItem);

      // Update categories if needed
      if (!portfolio.categories.includes(item.category)) {
        portfolio.categories.push(item.category);
      }

      // Update statistics
      if (item.type === 'project') {
        portfolio.statistics.totalProjects++;
      }

      // Save updated portfolio
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.portfolio.data': portfolio,
          'enhancedFeatures.portfolio.lastModified': FieldValue.serverTimestamp()
        });

      return {
        success: true,
        item: newItem
      };
    } catch (error: any) {
      throw new Error(`Failed to add portfolio item: ${error.message}`);
    }
  });

export const deletePortfolioItem = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, itemId } = request.data;

    try {
      // Get the job and verify ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (jobData?.userId !== request.auth.uid) {
        throw new Error('Unauthorized access');
      }

      // Get current portfolio data
      const portfolio = jobData?.enhancedFeatures?.portfolio?.data;
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // Remove item
      const itemIndex = portfolio.items.findIndex((item: any) => item.id === itemId);
      if (itemIndex === -1) {
        throw new Error('Portfolio item not found');
      }

      const deletedItem = portfolio.items[itemIndex];
      portfolio.items.splice(itemIndex, 1);

      // Update statistics
      if (deletedItem.type === 'project') {
        portfolio.statistics.totalProjects--;
      }

      // Save updated portfolio
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'enhancedFeatures.portfolio.data': portfolio,
          'enhancedFeatures.portfolio.lastModified': FieldValue.serverTimestamp()
        });

      return {
        success: true,
        deletedItemId: itemId
      };
    } catch (error: any) {
      throw new Error(`Failed to delete portfolio item: ${error.message}`);
    }
  });

export const uploadPortfolioMedia = onCall(
  {
    timeoutSeconds: 300,
    memory: '1GiB',
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, itemId, mediaData, mediaType, fileName } = request.data;

    try {
      // Validate media
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf'];
      if (!allowedTypes.includes(mediaType)) {
        throw new Error('Unsupported media type');
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(mediaData, 'base64');
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (buffer.length > maxSize) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Upload to Firebase Storage
      const bucket = admin.storage().bucket();
      const filePath = `portfolio/${jobId}/${itemId}/${Date.now()}-${fileName}`;
      const file = bucket.file(filePath);
      
      await file.save(buffer, {
        metadata: {
          contentType: mediaType,
          metadata: {
            jobId,
            itemId,
            uploadedBy: request.auth.uid,
            uploadedAt: new Date().toISOString()
          }
        }
      });

      // Make file publicly accessible
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      // Generate thumbnail for images
      let thumbnailUrl = publicUrl;
      if (mediaType.startsWith('image/')) {
        // In production, use a service like Cloudinary or ImageKit for thumbnails
        thumbnailUrl = publicUrl; // For now, same as original
      }

      // Update portfolio item with media
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      const jobData = jobDoc.data();
      const portfolio = jobData?.enhancedFeatures?.portfolio?.data;
      
      const itemIndex = portfolio.items.findIndex((item: any) => item.id === itemId);
      if (itemIndex !== -1) {
        if (!portfolio.items[itemIndex].media) {
          portfolio.items[itemIndex].media = [];
        }
        
        portfolio.items[itemIndex].media.push({
          type: mediaType.startsWith('image/') ? 'image' : mediaType.startsWith('video/') ? 'video' : 'document',
          url: publicUrl,
          thumbnail: thumbnailUrl,
          caption: fileName
        });

        await admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .update({
            'enhancedFeatures.portfolio.data': portfolio,
            'enhancedFeatures.portfolio.lastModified': FieldValue.serverTimestamp()
          });
      }

      return {
        success: true,
        mediaUrl: publicUrl,
        thumbnailUrl
      };
    } catch (error: any) {
      throw new Error(`Failed to upload media: ${error.message}`);
    }
  });

export const generateShareablePortfolio = onCall(
  {
    ...corsOptions
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, customDomain } = request.data;

    try {
      // Get the job and verify ownership
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      if (jobData?.userId !== request.auth.uid) {
        throw new Error('Unauthorized access');
      }

      // Ensure portfolio exists
      if (!jobData?.enhancedFeatures?.portfolio?.data) {
        throw new Error('Portfolio not found. Generate portfolio first.');
      }

      // Generate shareable portfolio
      const { url, embedCode } = await portfolioGalleryService.generateShareablePortfolio(
        jobId,
        customDomain
      );

      return {
        success: true,
        url,
        embedCode
      };
    } catch (error: any) {
      throw new Error(`Failed to generate shareable portfolio: ${error.message}`);
    }
  });