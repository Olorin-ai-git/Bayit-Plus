// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport * as admin from 'firebase-admin';
import { FileGenerationResult, EnhancedFileGenerationResult } from '../types';

/**
 * File management service for CV generation
 * Handles saving HTML, PDF, and DOCX files to Firebase Storage
 */
export class FileManager {
  private _bucket?: any;
  
  /**
   * Get Firebase Storage bucket (lazy initialization)
   */
  private getBucket() {
    if (!this._bucket) {
      this._bucket = admin.storage().bucket();
    }
    return this._bucket;
  }

  /**
   * Save generated CV files to Firebase Storage with comprehensive error handling
   */
  async saveGeneratedFiles(
    jobId: string,
    userId: string,
    htmlContent: string
  ): Promise<EnhancedFileGenerationResult> {
    
    let htmlUrl = '';
    let pdfUrl = '';
    let docxUrl = '';
    const errors: string[] = [];
    
    try {
      // Save HTML file first (critical - must succeed)
      htmlUrl = await this.saveHtmlFile(userId, jobId, htmlContent);
      
    } catch (htmlError: any) {
      errors.push(`HTML save failed: ${htmlError.message}`);
      throw new Error(`Critical failure: Could not save HTML file: ${htmlError.message}`);
    }
    
    // Generate and save PDF (non-critical - continue if it fails)
    try {
      pdfUrl = await this.generateAndSavePdf(userId, jobId, htmlContent);
      if (pdfUrl) {
      } else {
        errors.push('PDF generation returned empty URL');
      }
    } catch (pdfError: any) {
      errors.push(`PDF generation failed: ${pdfError.message}`);
      // Don't throw - PDF failure shouldn't break the entire process
    }
    
    // DOCX generation placeholder - to be implemented
    try {
      docxUrl = '';
    } catch (docxError: any) {
      errors.push(`DOCX generation failed: ${docxError.message}`);
    }
    
    // Log summary of file generation
    const successCount = [htmlUrl, pdfUrl, docxUrl].filter(Boolean).length;
    
    if (errors.length > 0) {
    }
    
    return { 
      pdfUrl, 
      docxUrl, 
      htmlUrl,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Save HTML content to Firebase Storage
   */
  private async saveHtmlFile(userId: string, jobId: string, htmlContent: string): Promise<string> {
    const htmlFileName = `users/${userId}/generated/${jobId}/cv.html`;
    const htmlFile = this.getBucket().file(htmlFileName);
    
    await htmlFile.save(htmlContent, {
      metadata: {
        contentType: 'text/html',
        cacheControl: 'public, max-age=31536000'
      },
    });
    
    // Check if we're in emulator environment
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
    let htmlUrl: string;
    
    if (isEmulator) {
      // Use emulator URL format
      htmlUrl = `http://localhost:9199/v0/b/${this.getBucket().name}/o/${encodeURIComponent(htmlFileName)}?alt=media`;
    } else {
      // Use signed URL for production
      const [signedUrl] = await htmlFile.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });
      htmlUrl = signedUrl;
    }
    
    return htmlUrl;
  }

  /**
   * Generate PDF and save to Firebase Storage with comprehensive error handling and timeout protection
   */
  private async generateAndSavePdf(userId: string, jobId: string, htmlContent: string): Promise<string> {
    let browser: any = null;
    const startTime = Date.now();
    
    try {
      
      // Check if Puppeteer is available
      let puppeteer: any;
      try {
        puppeteer = require('puppeteer');
      } catch (requireError) {
        throw new Error('Puppeteer dependency not available for PDF generation');
      }
      
      // Launch browser with comprehensive settings and timeout protection
      browser = await Promise.race([
        puppeteer.launch({ 
          headless: true,
          args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--run-all-compositor-stages-before-draw',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows'
          ],
          timeout: 30000 // 30 second timeout for browser launch
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Browser launch timed out after 30 seconds')), 30000);
        })
      ]);
      
      
      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({ width: 794, height: 1123 }); // A4 size in pixels
      
      // Create PDF-optimized HTML content
      const pdfOptimizedHtml = this.optimizeHtmlForPdf(htmlContent);
      
      // Set content and wait for resources with timeout protection
      await Promise.race([
        page.setContent(pdfOptimizedHtml, { 
          waitUntil: ['networkidle0', 'domcontentloaded'],
          timeout: 45000
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Content loading timed out after 45 seconds')), 45000);
        })
      ]);
      
      
      // Generate PDF with proper settings and timeout protection
      const pdfBuffer = await Promise.race([
        page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in'
          },
          displayHeaderFooter: false,
          preferCSSPageSize: true,
          timeout: 60000 // 60 second timeout for PDF generation
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('PDF generation timed out after 60 seconds')), 60000);
        })
      ]);
      
      
      // Close browser as soon as possible to free resources
      await browser.close();
      browser = null;
      
      // Save PDF to Firebase Storage
      const pdfFileName = `users/${userId}/generated/${jobId}/cv.pdf`;
      const pdfFile = this.getBucket().file(pdfFileName);
      
      await pdfFile.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
          cacheControl: 'public, max-age=31536000'
        },
      });
      
      
      // Generate signed URL
      const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
      let pdfSignedUrl: string;
      
      if (isEmulator) {
        // Use emulator URL format
        pdfSignedUrl = `http://localhost:9199/v0/b/${this.getBucket().name}/o/${encodeURIComponent(pdfFileName)}?alt=media`;
      } else {
        // Use signed URL for production
        const [signedUrl] = await pdfFile.getSignedUrl({
          action: 'read',
          expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
        });
        pdfSignedUrl = signedUrl;
      }
      
      const totalTime = Date.now() - startTime;
      return pdfSignedUrl;
      
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      
      // Ensure browser is closed even in error cases
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
        }
      }
      
      // Log error details for debugging
      if (error.message.includes('timeout')) {
      } else if (error.message.includes('memory') || error.message.includes('heap')) {
      } else if (error.message.includes('puppeteer') || error.message.includes('browser')) {
      }
      
      // Return empty string to indicate failure (don't throw to allow graceful degradation)
      return '';
    }
  }

  /**
   * Optimize HTML content for PDF generation
   * Converts interactive elements to static PDF-friendly versions
   */
  private optimizeHtmlForPdf(htmlContent: string): string {
    let optimizedHtml = htmlContent;
    
    // Remove or modify interactive elements that don't work in PDF
    optimizedHtml = optimizedHtml.replace(
      /<audio[^>]*>.*?<\/audio>/g, 
      '<div style="background: #f0f0f0; padding: 10px; border-radius: 5px; text-align: center; color: #666;">🎧 Audio content available in online version</div>'
    );
    
    optimizedHtml = optimizedHtml.replace(
      /<video[^>]*>.*?<\/video>/g, 
      '<div style="background: #f0f0f0; padding: 10px; border-radius: 5px; text-align: center; color: #666;">🎬 Video content available in online version</div>'
    );
    
    // Convert buttons to static text where appropriate
    optimizedHtml = optimizedHtml.replace(
      /<button[^>]*onclick="[^"]*"[^>]*>([^<]+)<\/button>/g, 
      '<span style="display: inline-block; padding: 8px 16px; background: #e0e0e0; border-radius: 4px; color: #333;">$1</span>'
    );
    
    // Remove scripts that might interfere with PDF generation
    optimizedHtml = optimizedHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Add PDF-specific styles
    const pdfStyles = `
      <style>
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .container {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .no-print {
            display: none !important;
          }
          
          /* Ensure proper layout for PDF */
          .qr-code {
            position: static !important;
            float: right !important;
            margin: 10px !important;
          }
          
          /* Hide download buttons in PDF */
          .download-section, .download-btn {
            display: none !important;
          }
        }
      </style>
    `;
    
    // Insert PDF styles before closing head tag
    optimizedHtml = optimizedHtml.replace(
      '</head>', 
      pdfStyles + '</head>'
    );
    
    // Add PDF notice
    optimizedHtml = optimizedHtml.replace(
      '<body>',
      `<body>
        <div style="background: #f9f9f9; padding: 10px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; color: #666; margin-bottom: 20px;">
        <strong>📄 PDF Version Notice:</strong> 
        This PDF contains static content. For interactive features (podcast, forms, animations), 
        please visit the online version.
        </div>`
    );
    
    return optimizedHtml;
  }


  /**
   * Delete generated files for a job
   */
  async deleteGeneratedFiles(userId: string, jobId: string): Promise<void> {
    try {
      const filePaths = [
        `users/${userId}/generated/${jobId}/cv.html`,
        `users/${userId}/generated/${jobId}/cv.pdf`,
        `users/${userId}/generated/${jobId}/cv.docx`
      ];
      
      for (const filePath of filePaths) {
        try {
          await this.getBucket().file(filePath).delete();
        } catch (error: any) {
          // File might not exist, continue with others
        }
      }
    } catch (error) {
      // Don't throw error for cleanup operations
    }
  }

  /**
   * Check if files exist for a job
   */
  async checkFilesExist(userId: string, jobId: string): Promise<{
    htmlExists: boolean;
    pdfExists: boolean;
    docxExists: boolean;
  }> {
    try {
      const [htmlExists] = await this.getBucket().file(`users/${userId}/generated/${jobId}/cv.html`).exists();
      const [pdfExists] = await this.getBucket().file(`users/${userId}/generated/${jobId}/cv.pdf`).exists();
      const [docxExists] = await this.getBucket().file(`users/${userId}/generated/${jobId}/cv.docx`).exists();
      
      return { htmlExists, pdfExists, docxExists };
    } catch (error: any) {
      return { htmlExists: false, pdfExists: false, docxExists: false };
    }
  }
}