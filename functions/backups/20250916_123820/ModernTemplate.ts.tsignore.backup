// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { ParsedCV } from '../../cvParser';
import { CVTemplate, InteractiveFeatureResult } from '../types';

/**
 * Modern CV template generator with clean, professional design
 * Features: Modern typography, blue accent colors, clean sections
 */
export class ModernTemplate implements CVTemplate {
  
  async generateHTML(cv: ParsedCV, jobId: string, features?: string[], interactiveFeatures?: InteractiveFeatureResult): Promise<string> {
    // Use provided interactive features or default to empty object
    const featuresObj: InteractiveFeatureResult = interactiveFeatures || {};
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cv.personalInfo.name} - CV</title>
    ${features?.includes('generate-podcast') ? '<meta name="job-id" content="{{JOB_ID}}">' : ''}
    <style>
        ${this.getStyles()}
        ${featuresObj.additionalStyles || ''}
    </style>
</head>
<body>
    <div class="container">
        ${this.generateHeader(cv)}
        ${this.generateSummary(cv)}
        ${this.generateExperience(cv)}
        ${this.generateEducation(cv)}
        ${this.generateSkills(cv)}
        ${this.generateInteractiveFeatures(featuresObj)}
        ${this.generateDownloadSection()}
        ${this.generateFooter()}
    </div>
    
    ${this.getScripts()}
    ${featuresObj.additionalScripts ? `<script>${featuresObj.additionalScripts}</script>` : ''}
</body>
</html>`;
  }

  private getStyles(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            position: relative;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 2px solid #e0e0e0;
        }
        .name {
            font-size: 36px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .contact {
            font-size: 14px;
            color: #666;
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        .section {
            margin-bottom: 40px;
        }
        .section-title {
            font-size: 24px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .section-title::before {
            content: '';
            width: 4px;
            height: 24px;
            background: #3498db;
            border-radius: 2px;
        }
        .summary-content {
            margin-top: 5px;
        }
        .summary {
            font-size: 16px;
            line-height: 1.8;
            color: #555;
            text-align: justify;
            margin: 0;
            padding: 0;
        }
        .experience-item, .education-item {
            margin-bottom: 25px;
            padding-left: 20px;
            border-left: 2px solid #e0e0e0;
        }
        .item-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 8px;
        }
        .position, .degree {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
        }
        .company, .institution {
            font-size: 16px;
            color: #3498db;
            margin-bottom: 5px;
        }
        .duration {
            font-size: 14px;
            color: #666;
            font-weight: 500;
            white-space: nowrap;
        }
        .skills-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
        }
        .skills-category {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        .skills-category h4 {
            font-size: 16px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .skill-item {
            display: inline-block;
            background: white;
            padding: 6px 12px;
            margin: 4px 6px 4px 0;
            border-radius: 20px;
            font-size: 14px;
            border: 1px solid #e0e0e0;
            color: #2c3e50;
        }
    `;
  }

  private generateHeader(cv: ParsedCV): string {
    const contact = cv.personalInfo;
    return `
        <header class="header">
            <h1 class="name">${contact.name}</h1>
            <div class="contact">
                ${contact.email ? `<span>📧 ${contact.email}</span>` : ''}
                ${contact.phone ? `<span>📱 ${contact.phone}</span>` : ''}
                ${contact.location ? `<span>📍 ${contact.location}</span>` : ''}
                ${contact.linkedin ? `<span>🔗 ${contact.linkedin}</span>` : ''}
            </div>
        </header>
    `;
  }

  private generateSummary(cv: ParsedCV): string {
    if (!cv.summary) return '';
    
    return `
        <section class="section">
            <h2 class="section-title">Professional Summary</h2>
            <div class="summary-content">
                <p class="summary">${cv.summary}</p>
            </div>
        </section>
    `;
  }

  private generateExperience(cv: ParsedCV): string {
    if (!cv.experience || cv.experience.length === 0) return '';
    
    const experienceItems = cv.experience.map(exp => `
        <div class="experience-item">
            <div class="item-header">
                <div>
                    <div class="position">${exp.position}</div>
                    <div class="company">${exp.company}</div>
                </div>
                <div class="duration">${exp.duration}</div>
            </div>
            ${exp.description ? `<p style="color: #555; line-height: 1.6; margin-top: 8px;">${exp.description}</p>` : ''}
        </div>
    `).join('');
    
    return `
        <section class="section">
            <h2 class="section-title">Professional Experience</h2>
            ${experienceItems}
        </section>
    `;
  }

  private generateEducation(cv: ParsedCV): string {
    if (!cv.education || cv.education.length === 0) return '';
    
    const educationItems = cv.education.map((edu: any) => `
        <div class="education-item">
            <div class="item-header">
                <div>
                    <div class="degree">${edu.degree}</div>
                    <div class="institution">${edu.institution}</div>
                </div>
                <div class="duration">${edu.graduationDate}</div>
            </div>
        </div>
    `).join('');
    
    return `
        <section class="section">
            <h2 class="section-title">Education</h2>
            ${educationItems}
        </section>
    `;
  }

  private generateSkills(cv: ParsedCV): string {
    if (!cv.skills) return '';
    
    let skillsContent = '';
    
    if (cv.skills.technical && cv.skills.technical.length > 0) {
      const technicalSkills = cv.skills.technical.map((skill: any) => 
        `<span class="skill-item">${skill}</span>`
      ).join('');
      skillsContent += `
        <div class="skills-category">
            <h4>Technical Skills</h4>
            <div>${technicalSkills}</div>
        </div>
      `;
    }
    
    if (cv.skills.soft && cv.skills.soft.length > 0) {
      const softSkills = cv.skills.soft.map((skill: any) => 
        `<span class="skill-item">${skill}</span>`
      ).join('');
      skillsContent += `
        <div class="skills-category">
            <h4>Soft Skills</h4>
            <div>${softSkills}</div>
        </div>
      `;
    }
    
    if (!skillsContent) return '';
    
    return `
        <section class="section">
            <h2 class="section-title">Skills</h2>
            <div class="skills-container">
                ${skillsContent}
            </div>
        </section>
    `;
  }

  private generateInteractiveFeatures(features: InteractiveFeatureResult): string {
    return `
        ${features.qrCode || ''}
        ${features.podcastPlayer || ''}
        ${features.timeline || ''}
        ${features.skillsChart || ''}
        ${features.socialLinks || ''}
        ${features.achievementsShowcase || ''}
        ${features.languageProficiency || ''}
        ${features.certificationBadges || ''}
        ${features.videoIntroduction || ''}
        ${features.calendar || ''}
        ${features.contactForm || ''}
        ${features.portfolioGallery || ''}
        ${features.testimonialsCarousel || ''}
    `;
  }

  private generateDownloadSection(): string {
    return `
        <div class="download-section" style="margin: 40px 0; padding: 20px; background: #f8f9fa; border-radius: 12px; text-align: center;">
          <h3 style="margin-bottom: 15px; color: #2c3e50;">Download Options</h3>
          <div class="download-buttons" style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
            <button onclick="window.print()" class="download-btn" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">📄 Print/Save as PDF</button>
            <button onclick="downloadPDF()" class="download-btn" style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">📑 Download PDF</button>
            <button onclick="downloadDOCX()" class="download-btn" style="padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">📝 Download DOCX</button>
          </div>
          <p style="margin-top: 10px; font-size: 12px; color: #666;">PDF and DOCX downloads will be available when processing is complete</p>
        </div>
    `;
  }

  private getScripts(): string {
    return `
        <!-- Firebase SDK Scripts -->
        <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
        <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-functions-compat.js"></script>
        
        <script>
          function downloadPDF() {
            const pdfUrl = localStorage.getItem('pdfUrl');
            if (pdfUrl) {
              window.open(pdfUrl, '_blank');
            } else {
              alert('PDF is being generated. Please try again in a moment.');
            }
          }
          
          function downloadDOCX() {
            const docxUrl = localStorage.getItem('docxUrl');
            if (docxUrl) {
              window.open(docxUrl, '_blank');
            } else {
              alert('DOCX is being generated. Please try again in a moment.');
            }
          }
        </script>
    `;
  }

  private generateFooter(): string {
    return `
        <footer style="margin-top: 60px; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0; color: #666; font-size: 12px;">
            <p>Generated with CVPlus - From Paper to Powerful: Your CV, Reinvented</p>
        </footer>
    `;
  }
}