// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { onRequest } from 'firebase-functions/v2/https';
import { Request } from 'firebase-functions/v2/https';
import { Response } from 'express';
import * as admin from 'firebase-admin';
import { getCVJob, JobStatus } from '../../../models/cv-job.service';
import { getProcessedCV } from '../../../models/processed-cv.service';
import { authenticateUser } from '../../services/cv-generator/integrations/AuthIntegration';

interface CVDownloadResponse {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  expiresAt?: string;
  message?: string;
}

export const downloadProcessedCV = onRequest(
  {
    timeoutSeconds: 60,
    memory: '1GiB',
    maxInstances: 100,
    cors: true
  },
  async (req: Request, res: Response) => {
    try {
      console.log('CV download request received');

      // Handle preflight OPTIONS request
      if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.status(200).send('');
        return;
      }

      // Only allow GET method
      if (req.method !== 'GET') {
        res.status(405).json({
          success: false,
          message: 'Method not allowed. Use GET.'
        } as CVDownloadResponse);
        return;
      }

      // Authenticate user
      const authUser = await authenticateUser(req);
      if (!authUser || !authUser.uid) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        } as CVDownloadResponse);
        return;
      }

      const userId = authUser.uid;

      // Extract jobId from URL path
      const urlParts = req.path.split('/');
      const jobId = urlParts[urlParts.length - 1];

      if (!jobId || jobId.length < 10) {
        res.status(400).json({
          success: false,
          message: 'Valid jobId is required'
        } as CVDownloadResponse);
        return;
      }

      // Get query parameters
      const format = (req.query.format as string) || 'pdf';
      const includeAnalytics = req.query.includeAnalytics === 'true';

      console.log(`Processing CV download for job: ${jobId}, format: ${format}`);

      // Get CV job data
      const cvJob = await getCVJob(jobId);

      if (!cvJob) {
        res.status(404).json({
          success: false,
          message: 'CV job not found'
        } as CVDownloadResponse);
        return;
      }

      // Verify ownership
      if (cvJob.userId !== userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only download your own CVs.'
        } as CVDownloadResponse);
        return;
      }

      // Check if job is completed
      if (cvJob.status !== JobStatus.COMPLETED) {
        res.status(400).json({
          success: false,
          message: `CV processing is not complete. Current status: ${cvJob.status}`
        } as CVDownloadResponse);
        return;
      }

      // Get processed CV data
      if (!cvJob.processedCVId) {
        res.status(500).json({
          success: false,
          message: 'Processed CV data not found'
        } as CVDownloadResponse);
        return;
      }

      const processedCV = await getProcessedCV(cvJob.processedCVId);
      if (!processedCV) {
        res.status(500).json({
          success: false,
          message: 'Processed CV data not found'
        } as CVDownloadResponse);
        return;
      }

      console.log(`Generating ${format} download for processed CV: ${processedCV.id}`);

      // Generate download based on format
      let downloadResult: {
        buffer: Buffer;
        fileName: string;
        contentType: string;
      };

      switch (format.toLowerCase()) {
        case 'pdf':
          downloadResult = await generatePDFDownload(processedCV, includeAnalytics);
          break;
        case 'docx':
          downloadResult = await generateDocxDownload(processedCV, includeAnalytics);
          break;
        case 'json':
          downloadResult = await generateJSONDownload(processedCV, includeAnalytics);
          break;
        case 'html':
          downloadResult = await generateHTMLDownload(processedCV, includeAnalytics);
          break;
        default:
          res.status(400).json({
            success: false,
            message: 'Unsupported format. Supported formats: pdf, docx, json, html'
          } as CVDownloadResponse);
          return;
      }

      // Upload to Firebase Storage with expiration
      const storage = admin.storage();
      const bucket = storage.bucket();
      const fileName = `downloads/${userId}/${jobId}/${downloadResult.fileName}`;
      const file = bucket.file(fileName);

      await file.save(downloadResult.buffer, {
        metadata: {
          contentType: downloadResult.contentType,
          metadata: {
            jobId,
            userId,
            format,
            generatedAt: new Date().toISOString(),
            includeAnalytics: includeAnalytics.toString()
          }
        }
      });

      // Generate signed URL with 24 hour expiration
      const expirationTime = new Date();
      expirationTime.setHours(expirationTime.getHours() + 24);

      const [downloadUrl] = await file.getSignedUrl({
        action: 'read',
        expires: expirationTime
      });

      // TODO: Track download event when analytics module is properly integrated
      console.log('CV download completed', {
        userId,
        jobId,
        format,
        fileSize: downloadResult.buffer.length
      });

      // Set appropriate headers
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
      });

      res.status(200).json({
        success: true,
        downloadUrl,
        fileName: downloadResult.fileName,
        fileSize: downloadResult.buffer.length,
        expiresAt: expirationTime.toISOString(),
        message: 'Download URL generated successfully'
      } as CVDownloadResponse);

      console.log(`CV download URL generated successfully for job: ${jobId}`);

    } catch (error) {
      console.error('CV download error:', error);

      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error during CV download'
      } as CVDownloadResponse);
    }
  }
);

/**
 * Generate PDF download
 */
async function generatePDFDownload(
  processedCV: any,
  includeAnalytics: boolean
): Promise<{ buffer: Buffer; fileName: string; contentType: string; }> {
  // In production, use Puppeteer, jsPDF, or similar for PDF generation
  // For now, create a simple PDF representation

  const pdfContent = generatePDFContent(processedCV, includeAnalytics);
  const buffer = Buffer.from(pdfContent, 'utf-8');

  return {
    buffer,
    fileName: `${processedCV.structuredData.personalInfo.fullName.replace(/\s+/g, '_')}_CV.pdf`,
    contentType: 'application/pdf'
  };
}

/**
 * Generate DOCX download
 */
async function generateDocxDownload(
  processedCV: any,
  includeAnalytics: boolean
): Promise<{ buffer: Buffer; fileName: string; contentType: string; }> {
  // In production, use docx or similar for DOCX generation
  const docxContent = generateDocxContent(processedCV, includeAnalytics);
  const buffer = Buffer.from(docxContent, 'utf-8');

  return {
    buffer,
    fileName: `${processedCV.structuredData.personalInfo.fullName.replace(/\s+/g, '_')}_CV.docx`,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
}

/**
 * Generate JSON download
 */
async function generateJSONDownload(
  processedCV: any,
  includeAnalytics: boolean
): Promise<{ buffer: Buffer; fileName: string; contentType: string; }> {
  const jsonData = {
    ...processedCV,
    exportedAt: new Date().toISOString(),
    includeAnalytics
  };

  // Remove sensitive or unnecessary data if analytics not requested
  if (!includeAnalytics) {
    delete jsonData.aiAnalysis?.rawResponses;
    delete jsonData.metadata?.processingLogs;
  }

  const jsonString = JSON.stringify(jsonData, null, 2);
  const buffer = Buffer.from(jsonString, 'utf-8');

  return {
    buffer,
    fileName: `${processedCV.structuredData.personalInfo.fullName.replace(/\s+/g, '_')}_CV_Data.json`,
    contentType: 'application/json'
  };
}

/**
 * Generate HTML download
 */
async function generateHTMLDownload(
  processedCV: any,
  includeAnalytics: boolean
): Promise<{ buffer: Buffer; fileName: string; contentType: string; }> {
  const htmlContent = generateHTMLContent(processedCV, includeAnalytics);
  const buffer = Buffer.from(htmlContent, 'utf-8');

  return {
    buffer,
    fileName: `${processedCV.structuredData.personalInfo.fullName.replace(/\s+/g, '_')}_CV.html`,
    contentType: 'text/html'
  };
}

/**
 * Generate PDF content (simplified placeholder)
 */
function generatePDFContent(processedCV: any, includeAnalytics: boolean): string {
  // This is a placeholder. In production, use proper PDF generation
  return `PDF: Enhanced CV for ${processedCV.structuredData.personalInfo.fullName}`;
}

/**
 * Generate DOCX content (simplified placeholder)
 */
function generateDocxContent(processedCV: any, includeAnalytics: boolean): string {
  // This is a placeholder. In production, use proper DOCX generation
  return `DOCX: Enhanced CV for ${processedCV.structuredData.personalInfo.fullName}`;
}

/**
 * Generate HTML content
 */
function generateHTMLContent(processedCV: any, includeAnalytics: boolean): string {
  const { personalInfo, summary, experience, skills, education } = processedCV.structuredData;
  const { atsAnalysis, aiAnalysis } = processedCV;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${personalInfo.fullName} - Enhanced CV</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
        }
        .header .contact {
            margin-top: 15px;
            opacity: 0.9;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            border-radius: 5px;
        }
        .section h2 {
            color: #667eea;
            margin-top: 0;
            font-size: 1.5em;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .experience-item {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #ddd;
        }
        .experience-item:last-child {
            border-bottom: none;
        }
        .experience-title {
            font-weight: bold;
            color: #333;
            font-size: 1.1em;
        }
        .experience-company {
            color: #667eea;
            font-weight: 600;
        }
        .experience-dates {
            color: #666;
            font-style: italic;
        }
        .skills {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .skill-tag {
            background: #667eea;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.9em;
        }
        .analytics {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 20px;
            border-radius: 5px;
            margin-top: 30px;
        }
        .ats-score {
            font-size: 2em;
            font-weight: bold;
            color: ${atsAnalysis?.score >= 80 ? '#27ae60' : atsAnalysis?.score >= 60 ? '#f39c12' : '#e74c3c'};
        }
        .export-info {
            text-align: center;
            color: #666;
            font-size: 0.9em;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${personalInfo.fullName}</h1>
        <div class="contact">
            ${personalInfo.email} | ${personalInfo.phone} | ${personalInfo.location}
            ${personalInfo.linkedin ? `| <a href="${personalInfo.linkedin}" style="color: white;">${personalInfo.linkedin}</a>` : ''}
        </div>
    </div>

    <div class="section">
        <h2>Professional Summary</h2>
        <p>${summary || 'Professional with demonstrated experience and skills.'}</p>
    </div>

    ${includeAnalytics && atsAnalysis ? `
    <div class="analytics">
        <h2>📊 ATS Analysis</h2>
        <div style="display: flex; align-items: center; gap: 20px;">
            <div class="ats-score">${atsAnalysis.score}/100</div>
            <div>
                <strong>ATS Compatibility Score</strong><br>
                <small>How well your CV performs with Applicant Tracking Systems</small>
            </div>
        </div>
        ${atsAnalysis.suggestedImprovements ? `
        <h3>💡 Improvement Suggestions:</h3>
        <ul>
            ${atsAnalysis.suggestedImprovements.map(improvement => `<li>${improvement}</li>`).join('')}
        </ul>
        ` : ''}
    </div>
    ` : ''}

    <div class="section">
        <h2>Professional Experience</h2>
        ${experience.map(exp => `
            <div class="experience-item">
                <div class="experience-title">${exp.title}</div>
                <div class="experience-company">${exp.company}</div>
                <div class="experience-dates">${exp.startDate} - ${exp.endDate || 'Present'}</div>
                <p>${exp.description}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>Skills</h2>
        <div class="skills">
            ${skills.technical.concat(skills.soft).map(skill => `
                <span class="skill-tag">${skill}</span>
            `).join('')}
        </div>
    </div>

    <div class="section">
        <h2>Education</h2>
        ${education.map(edu => `
            <div style="margin-bottom: 15px;">
                <strong>${edu.degree}</strong><br>
                ${edu.institution} (${edu.year})<br>
                ${edu.grade ? `Grade: ${edu.grade}` : ''}
            </div>
        `).join('')}
    </div>

    ${includeAnalytics && aiAnalysis?.personalityProfile ? `
    <div class="analytics">
        <h2>🧠 Personality Insights</h2>
        <p><strong>Type:</strong> ${aiAnalysis.personalityProfile.mbtiType}</p>
        <p><strong>Summary:</strong> ${aiAnalysis.personalityProfile.summary}</p>
        <h3>Key Traits:</h3>
        <ul>
            ${Object.entries(aiAnalysis.personalityProfile.traits || {}).map(([trait, score]) => `
                <li><strong>${trait}:</strong> ${score}/10</li>
            `).join('')}
        </ul>
    </div>
    ` : ''}

    <div class="export-info">
        Exported from CVPlus on ${new Date().toLocaleDateString()}<br>
        <small>Transform your CV from paper to powerful with AI-driven insights</small>
    </div>
</body>
</html>
  `.trim();
}