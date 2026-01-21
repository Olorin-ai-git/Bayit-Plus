// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { ParsedCV } from '../../cvParser';
import { CVTemplate, InteractiveFeatureResult } from '../types';

/**
 * Classic CV template generator with traditional, professional design
 * Features: Serif fonts, formal layout, double borders, classic styling
 */
export class ClassicTemplate implements CVTemplate {
  
  async generateHTML(cv: ParsedCV, jobId: string, features?: string[], interactiveFeatures?: InteractiveFeatureResult): Promise<string> {
    // Use provided interactive features or default to empty object
    const featuresObj: InteractiveFeatureResult = interactiveFeatures || {};
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cv.personalInfo.name} - CV</title>
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
            font-family: Georgia, 'Times New Roman', serif;
            line-height: 1.8;
            color: #222;
            background: white;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 60px 40px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 3px double #333;
        }
        .name {
            font-size: 32px;
            font-weight: 400;
            color: #000;
            margin-bottom: 15px;
            letter-spacing: 2px;
            text-transform: uppercase;
        }
        .contact {
            font-size: 14px;
            color: #555;
            line-height: 1.6;
        }
        .contact span {
            margin: 0 10px;
        }
        .section {
            margin-bottom: 40px;
        }
        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #000;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 1px solid #333;
            padding-bottom: 5px;
        }
        .summary {
            font-size: 16px;
            line-height: 1.8;
            color: #333;
            text-align: justify;
            text-indent: 30px;
        }
        .experience-item, .education-item {
            margin-bottom: 25px;
            border-left: 2px solid #ddd;
            padding-left: 20px;
        }
        .item-header {
            margin-bottom: 10px;
        }
        .position, .degree {
            font-size: 18px;
            font-weight: 600;
            color: #000;
            margin-bottom: 5px;
        }
        .company, .institution {
            font-size: 16px;
            color: #555;
            font-style: italic;
            margin-bottom: 3px;
        }
        .duration {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }
        .description {
            font-size: 15px;
            line-height: 1.7;
            color: #333;
            text-align: justify;
        }
        .skills-list {
            list-style: none;
            columns: 2;
            column-gap: 40px;
        }
        .skills-list li {
            font-size: 15px;
            line-height: 2;
            color: #333;
            page-break-inside: avoid;
            break-inside: avoid;
            position: relative;
            padding-left: 15px;
        }
        .skills-list li::before {
            content: '•';
            position: absolute;
            left: 0;
            color: #666;
        }
    `;
  }

  private generateHeader(cv: ParsedCV): string {
    const contact = cv.personalInfo;
    const contactInfo = [];
    
    if (contact.email) contactInfo.push(`Email: ${contact.email}`);
    if (contact.phone) contactInfo.push(`Phone: ${contact.phone}`);
    if (contact.location) contactInfo.push(`Location: ${contact.location}`);
    if (contact.linkedin) contactInfo.push(`LinkedIn: ${contact.linkedin}`);
    
    return `
        <header class="header">
            <h1 class="name">${contact.name}</h1>
            <div class="contact">
                ${contactInfo.join(' | ')}
            </div>
        </header>
    `;
  }

  private generateSummary(cv: ParsedCV): string {
    if (!cv.summary) return '';
    
    return `
        <section class="section">
            <h2 class="section-title">Professional Summary</h2>
            <p class="summary">${cv.summary}</p>
        </section>
    `;
  }

  private generateExperience(cv: ParsedCV): string {
    if (!cv.experience || cv.experience.length === 0) return '';
    
    const experienceItems = cv.experience.map(exp => `
        <div class="experience-item">
            <div class="item-header">
                <div class="position">${exp.position}</div>
                <div class="company">${exp.company}</div>
                <div class="duration">${exp.duration}</div>
            </div>
            ${exp.description ? `<div class="description">${exp.description}</div>` : ''}
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
                <div class="degree">${edu.degree}</div>
                <div class="institution">${edu.institution}</div>
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
    
    const allSkills = [];
    if (cv.skills.technical) allSkills.push(...cv.skills.technical);
    if (cv.skills.soft) allSkills.push(...cv.skills.soft);
    if (cv.skills.languages) {
      if (Array.isArray(cv.skills.languages)) {
        // Handle array of strings or objects
        const languages = cv.skills.languages.map((l: any) => 
          typeof l === 'string' ? l : l.language || l
        );
        allSkills.push(...languages);
      }
    }
    
    if (allSkills.length === 0) return '';
    
    const skillsList = allSkills.map((skill: any) => `<li>${skill}</li>`).join('');
    
    return `
        <section class="section">
            <h2 class="section-title">Skills & Competencies</h2>
            <ul class="skills-list">
                ${skillsList}
            </ul>
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
        <div style="margin: 50px 0; padding: 25px; border: 2px solid #333; text-align: center; page-break-inside: avoid;">
            <h3 style="margin-bottom: 15px; color: #000; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">Document Downloads</h3>
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <button onclick="window.print()" style="padding: 12px 24px; background: #333; color: white; border: none; cursor: pointer; font-family: Georgia, serif; text-transform: uppercase; letter-spacing: 0.5px;">Print/Save PDF</button>
                <button onclick="downloadPDF()" style="padding: 12px 24px; background: #666; color: white; border: none; cursor: pointer; font-family: Georgia, serif; text-transform: uppercase; letter-spacing: 0.5px;">Download PDF</button>
                <button onclick="downloadDOCX()" style="padding: 12px 24px; background: #999; color: white; border: none; cursor: pointer; font-family: Georgia, serif; text-transform: uppercase; letter-spacing: 0.5px;">Download DOCX</button>
            </div>
            <p style="margin-top: 15px; font-size: 12px; color: #666; font-style: italic;">Downloads available upon processing completion</p>
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
        <footer style="margin-top: 60px; padding: 25px 0; text-align: center; border-top: 3px double #333; color: #555; font-size: 12px; font-style: italic;">
            <p>Generated with CVPlus - Professional CV Generation Platform</p>
        </footer>
    `;
  }
}