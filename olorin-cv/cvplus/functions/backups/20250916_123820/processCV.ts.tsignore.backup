// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { CVParser } from '../services/cv-parser.service';
import { PIIDetector } from '../services/pii-detector.service';
import { PolicyEnforcementService } from '../services/cv-generator/integrations/AdminIntegration';
import { corsOptions } from '../config/cors';
import { AutonomousAuthService } from '../services/cv-generator/integrations/AuthIntegration';
import { CVProcessingRequest, CVProcessingResponse } from '../../types';

export const processCV = onCall(
  {
    timeoutSeconds: 300,
    memory: '2GiB',
    ...corsOptions,
    secrets: ['ANTHROPIC_API_KEY']
  },
  async (request) => {
    
    // Require Google authentication
    const user = await AutonomousAuthService.requireGoogleAuth(request);
    // PII REMOVED: Email logging removed for security compliance
    
    // Update user login tracking
    await AutonomousAuthService.updateUserLastLogin(user.uid, user.email, user.name, user.picture);

    const { jobId, fileUrl, mimeType, isUrl, fileName, fileSize } = request.data;
    
    console.log('ProcessCV parameters:', { 
      jobId: jobId || 'MISSING', 
      fileUrl: fileUrl ? (fileUrl.substring(0, 100) + '...') : 'MISSING',
      mimeType: mimeType || 'MISSING',
      isUrl: isUrl,
      fileName: fileName || 'MISSING',
      fileSize: fileSize || 'MISSING'
    });

    if (!jobId || (!fileUrl && !isUrl)) {
      throw new Error('Missing required parameters');
    }

    try {
      // Update job status (use set with merge to handle case where document might not exist yet)
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .set({
          status: 'processing',
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

      // Get job data to retrieve user instructions
      const jobDoc = await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .get();
      
      const jobData = jobDoc.data();
      const userInstructions = jobData?.userInstructions;

      // Initialize CV parser
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('Anthropic API key not configured');
      }
      
      const parser = new CVParser(apiKey);
      let parsedCV;
      let cvContent = '';
      let buffer: Buffer | undefined;

      // Skip CV parsing in development mode if we already have a reused CV
      if (!parsedCV) {
        // 🔧 DEVELOPMENT SKIP: Handle development skip requests
        if (fileUrl === 'development-skip' && mimeType === 'development/skip') {
          console.log('🔧 Development skip requested - using cached CV data...');
          
          // Only trigger development CV reuse for explicit skip requests
          const isDevelopment = process.env.FUNCTIONS_EMULATOR === 'true' || 
                               process.env.NODE_ENV === 'development' ||
                               process.env.FIRESTORE_EMULATOR_HOST;
          
          if (isDevelopment) {
            console.log('📌 Development environment detected - processing skip request');
            console.log('   FUNCTIONS_EMULATOR:', process.env.FUNCTIONS_EMULATOR);
            console.log('   NODE_ENV:', process.env.NODE_ENV);
            console.log('   FIRESTORE_EMULATOR_HOST:', process.env.FIRESTORE_EMULATOR_HOST);
            
            // 🚀 DEVELOPMENT OPTIMIZATION: Skip LLM parsing and reuse last saved parsed CV
            console.log('🔧 Development mode: Skipping LLM CV parsing and reusing last saved CV...');
            
            try {
              // 🔍 DYNAMIC QUERY: Fetch the latest parsed CV from Firebase (as requested by user)
              console.log('🔍 Searching for latest parsed CV in Firebase database...');
              
              const recentJobsSnapshot = await admin.firestore()
                .collection('jobs')
                .where('status', 'in', ['analyzed', 'completed'])
                .where('parsedData', '!=', null)
                .orderBy('parsedData')
                .orderBy('updatedAt', 'desc')
                .limit(1)
                .get();
              
              if (!recentJobsSnapshot.empty) {
                const lastJobDoc = recentJobsSnapshot.docs[0];
                const lastJobData = lastJobDoc?.data();
                const reusedCV = lastJobData?.parsedData;
                
                console.log('✅ Found latest parsed CV to reuse:');
                console.log('   - From job:', lastJobDoc?.id || 'unknown');
                console.log('   - Name:', reusedCV?.personalInfo?.name || 'Unknown');
                console.log('   - Updated:', lastJobData?.updatedAt?.toDate?.() || 'Unknown');
                
                // Create a development-optimized parsed CV with timestamp
                parsedCV = {
                  ...reusedCV,
                  // Add development markers
                  _developmentMode: true,
                  _reusedFromJob: lastJobDoc?.id || 'unknown',
                  _reusedAt: new Date(),
                  // Update personal info to show this is development
                  personalInfo: {
                    ...reusedCV.personalInfo,
                    name: `${reusedCV.personalInfo?.name || 'Real User'} (Dev Mode)`
                  }
                };
                
                // Set cvContent for policy checking (simplified for dev)
                cvContent = JSON.stringify(parsedCV);
                
                console.log('🎯 Development optimization: LLM parsing skipped, using cached CV');
              } else {
                console.log('❌ No latest parsed CVs found in database for development skip');
                
                // Update job status to indicate no cached CV is available
                await admin.firestore()
                  .collection('jobs')
                  .doc(jobId)
                  .set({
                    status: 'failed',
                    error: 'Development skip requested but no parsed CV data found in Firebase database. Please upload and process a CV first to create data for development mode.',
                    errorType: 'no_cached_data',
                    developmentSkipFailed: true,
                    updatedAt: FieldValue.serverTimestamp()
                  }, { merge: true });

                // Return immediately to prevent further execution
                return {
                  success: false,
                  error: 'Development skip requested but no parsed CV data found in Firebase database. Please upload and process a CV first to create data for development mode.'
                };
              }
            } catch (reuseError) {
              const errorMessage = reuseError instanceof Error ? reuseError.message : 'Unknown error';
              console.log('❌ Failed to fetch latest parsed CV for development skip:', errorMessage);
              
              // Update job status to indicate reuse failure
              await admin.firestore()
                .collection('jobs')
                .doc(jobId)
                .set({
                  status: 'failed',
                  error: 'Development skip failed: Unable to fetch latest parsed CV from Firebase database. Please check database connectivity.',
                  errorType: 'cache_access_failed',
                  technicalError: errorMessage,
                  developmentSkipFailed: true,
                  updatedAt: FieldValue.serverTimestamp()
                }, { merge: true });

              // Return immediately to prevent further execution
              return {
                success: false,
                error: 'Development skip failed: Unable to fetch latest parsed CV from Firebase database. Please check database connectivity.'
              };
            }
          } else {
            // Not in development environment - can't process skip request
            throw new Error('Development skip is only available in development environment');
          }
        } else if (isUrl) {
          // Parse from URL
          parsedCV = await parser.parseFromURL(fileUrl, userInstructions);
          cvContent = JSON.stringify(parsedCV); // Use parsed data as content for policy check
        } else {
          // Download file from storage
          const bucket = admin.storage().bucket();
          
          // Extract the file path from the download URL
          // The URL format is: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded-path}?alt=media&token=...
          const urlObj = new URL(fileUrl);
          const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
          if (!pathMatch) {
            throw new Error('Invalid storage URL format');
          }
          
          // Decode the file path
          const filePath = decodeURIComponent(pathMatch[1] || '');
          
          const file = bucket.file(filePath);
          [buffer] = await file.download();
          
          // Convert buffer to string for policy checking
          cvContent = buffer.toString('utf-8');
          
          // Parse the CV
          parsedCV = await parser.parseCV(buffer, mimeType, userInstructions);
        }
      } else {
        console.log('⚡ Development mode: Skipped LLM CV parsing, using reused CV');
      }

      // 🚨 POLICY ENFORCEMENT: Check upload policy before processing
      const policyService = new PolicyEnforcementService();
      
      // Get request metadata for policy check
      const requestInfo = {
        ipAddress: request.rawRequest.ip || request.rawRequest.connection?.remoteAddress,
        userAgent: request.rawRequest.headers?.['user-agent']
      };

      const policyCheckRequest = {
        userId: user.uid,
        cvContent: cvContent,
        fileName: fileName || 'unknown.pdf',
        fileSize: fileSize || buffer?.length || cvContent.length,
        fileType: mimeType || 'application/octet-stream',
        requestInfo
      };

      console.log('🔍 Running policy enforcement check for user:', user.uid);
      
      // Note: Development optimization is now handled only for explicit skip requests above
      // Regular CV uploads will proceed with normal processing regardless of development mode
      
      const policyResult = await policyService.checkUploadPolicy(policyCheckRequest);
      
      // Handle policy violations
      if (!policyResult.allowed) {
        const criticalViolations = policyResult.violations.filter(v => 
          v.severity === 'critical' || (v.severity === 'high' && v.requiresAction)
        );

        if (criticalViolations.length > 0) {
          // Block the upload completely
          const blockingViolation = criticalViolations[0];
          
          console.warn('🚨 Upload blocked due to policy violation:', {
            userId: user.uid,
            violationType: blockingViolation.type,
            severity: blockingViolation.severity
          });
          
          // Update job with policy violation status
          await admin.firestore()
            .collection('jobs')
            .doc(jobId)
            .set({
              status: 'policy_violation',
              policyViolation: {
                type: blockingViolation.type,
                message: blockingViolation.message,
                severity: blockingViolation.severity,
                details: blockingViolation.details,
                suggestedActions: blockingViolation.suggestedActions
              },
              updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });

          throw new Error(`Upload blocked: ${blockingViolation.message}`);
        }
      }

      // Log policy check results (for monitoring)
      console.log('✅ Policy check completed:', {
        userId: user.uid,
        allowed: policyResult.allowed,
        violations: policyResult.violations.length,
        warnings: policyResult.warnings.length,
        cvHash: policyResult.metadata.cvHash.substring(0, 8) + '...'
      });

      // Detect PII
      const piiDetector = new PIIDetector(apiKey);
      const piiResult = await piiDetector.detectAndMaskPII(parsedCV);

      // Save parsed data with PII information, policy results, and user association
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .set({
          status: 'analyzed',
          parsedData: parsedCV,
          piiDetection: {
            hasPII: piiResult.hasPII,
            detectedTypes: piiResult.detectedTypes,
            recommendations: piiResult.recommendations
          },
          privacyVersion: piiResult.maskedData,
          policyCheck: {
            allowed: policyResult.allowed,
            violations: policyResult.violations,
            warnings: policyResult.warnings,
            cvHash: policyResult.metadata.cvHash,
            extractedNames: policyResult.metadata.extractedNames,
            usageStats: policyResult.metadata.usageStats,
            checkedAt: new Date()
          },
          userId: user.uid, // Associate job with authenticated user
          userEmail: user.email,
          hasCalendarPermissions: user.hasCalendarPermissions || false,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

      // ALL users should get access to interactive features through the normal workflow
      // QuickCreate just means "auto-select all features and generate immediately"
      console.log('🔍 [DEBUG] ProcessCV completed for job:', jobId, {
        quickCreate: jobData?.quickCreate,
        hasSettings: !!jobData?.settings,
        allJobDataKeys: Object.keys(jobData || {})
      });
      
      // If quick create, automatically initiate feature generation with default features
      if (jobData?.quickCreate || jobData?.settings?.applyAllEnhancements) {
        
        // Import the generateCVCore function for background processing
        const { generateCVCore } = await import('./generateCV');
        
        // Default features for Quick Create users
        const defaultFeatures = [
          'ats-optimization',
          'achievement-highlighting', 
          'skills-visualization',
          'interactive-timeline',
          'certification-badges'
        ];
        
        // Initialize feature tracking
        const enhancedFeatures: Record<string, any> = {};
        for (const feature of defaultFeatures) {
          enhancedFeatures[feature] = {
            status: 'pending',
            progress: 0,
            currentStep: 'Queued for processing',
            enabled: true,
            queuedAt: new Date()
          };
        }
        
        await admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .set({
            status: 'generating',
            selectedFeatures: defaultFeatures,
            enhancedFeatures: enhancedFeatures,
            quickCreateInProgress: true,
            generationStartedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
          
        // Trigger background feature generation
        setImmediate(async () => {
          try {
            
            await generateCVCore(jobId, 'modern-professional', defaultFeatures, user.uid);
            
          } catch (error: any) {
            
            // Update job with failure status
            await admin.firestore()
              .collection('jobs')
              .doc(jobId)
              .set({
                status: 'failed',
                error: `Quick Create generation failed: ${error.message}`,
                quickCreateInProgress: false,
                updatedAt: FieldValue.serverTimestamp()
              }, { merge: true });
          }
        });
        
      }
      
      // For regular users, initialize basic enhanced features to show in preview
      if (!jobData?.quickCreate && !jobData?.settings?.applyAllEnhancements) {
        
        // Basic features that are fast and don't require generation
        const basicFeatures = ['skills-visualization', 'ats-optimization'];
        const enhancedFeatures: Record<string, any> = {};
        
        for (const feature of basicFeatures) {
          enhancedFeatures[feature] = {
            status: 'pending',
            progress: 0,
            currentStep: 'Ready for generation',
            enabled: false, // Not auto-enabled, user can choose to generate
            queuedAt: new Date()
          };
        }
        
        await admin.firestore()
          .collection('jobs')
          .doc(jobId)
          .set({
            enhancedFeatures: enhancedFeatures,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
          
      }
      
      // Note: Regular users will go through normal flow:
      // 1. ProcessCV completes → status: 'analyzed' 
      // 2. User goes to analysis page → selects features
      // 3. User generates CV with selected features → ALL features available

      return {
        success: true,
        jobId,
        parsedData: parsedCV
      };

    } catch (error: any) {
      
      // Determine error type and provide appropriate user message
      let userMessage = error.message;
      let errorType = 'unknown';
      
      if (error.message.includes('credit balance is too low') || error.message.includes('billing issues')) {
        errorType = 'billing';
        userMessage = 'The AI service is temporarily unavailable due to billing issues. Please try again later or contact support.';
      } else if (error.message.includes('Authentication failed')) {
        errorType = 'auth';
        userMessage = 'Authentication failed with the AI service. Please try again later or contact support.';
      } else if (error.message.includes('overloaded') || error.message.includes('429')) {
        errorType = 'rate_limit';
        userMessage = 'The AI service is currently overloaded. Please try again in a few moments.';
      } else if (error.message.includes('service is temporarily')) {
        errorType = 'service_unavailable';
        userMessage = 'The AI service is temporarily experiencing issues. Please try again later.';
      }
      
      // Update job status to failed with detailed error info
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .set({
          status: 'failed',
          error: userMessage,
          errorType: errorType,
          technicalError: error.message, // Keep original error for debugging
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

      throw new Error(userMessage);
    }
  });

/**
 * Type definitions for this function
 */
export type { CVProcessingRequest, CVProcessingResponse };