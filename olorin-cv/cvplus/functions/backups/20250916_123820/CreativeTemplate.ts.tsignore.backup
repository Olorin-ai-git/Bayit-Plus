// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { ParsedCV } from '../../cvParser';
import { CVTemplate, InteractiveFeatureResult } from '../types';

/**
 * Creative CV template generator with modern, colorful design
 * Features: Gradient backgrounds, animations, modern layout, vibrant colors
 */
export class CreativeTemplate implements CVTemplate {
  
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
        <div class="content">
            ${this.generateSummary(cv)}
            ${this.generateExperience(cv)}
            ${this.generateEducation(cv)}
            ${this.generateSkills(cv)}
            ${this.generateInteractiveFeatures(featuresObj)}
            ${this.generateDownloadSection()}
        </div>
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
            background: #f5f5f5;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 30px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 60px 40px;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(255,255,255,0.05) 10px,
                rgba(255,255,255,0.05) 20px
            );
            animation: slide 20s linear infinite;
        }
        @keyframes slide {
            0% { transform: translate(0, 0); }
            100% { transform: translate(-50px, -50px); }
        }
        .name {
            font-size: 42px;
            font-weight: 700;
            margin-bottom: 10px;
            z-index: 2;
            position: relative;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .title {
            font-size: 20px;
            margin-bottom: 20px;
            opacity: 0.9;
            z-index: 2;
            position: relative;
        }
        .contact-creative {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            z-index: 2;
            position: relative;
        }
        .contact-item {
            background: rgba(255,255,255,0.1);
            padding: 10px 15px;
            border-radius: 25px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .content {
            padding: 40px;
        }
        .section {
            margin-bottom: 50px;
        }
        .section-title {
            font-size: 28px;
            font-weight: 600;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 25px;
            position: relative;
        }
        .section-title::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 0;
            width: 50px;
            height: 3px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 2px;
        }
        .summary-creative {
            font-size: 18px;
            line-height: 1.8;
            color: #555;
            padding: 30px;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border-radius: 15px;
            border-left: 5px solid #667eea;
            position: relative;
        }
        .summary-creative::before {
            content: '"';
            position: absolute;
            top: 10px;
            left: 15px;
            font-size: 40px;
            color: #667eea;
            font-family: serif;
        }
        .experience-card, .education-card {
            background: white;
            margin-bottom: 25px;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            border-left: 5px solid #667eea;
            position: relative;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .experience-card:hover, .education-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
        }
        .position-title, .degree-title {
            font-size: 20px;
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        .company-name, .institution-name {
            font-size: 16px;
            color: #667eea;
            font-weight: 500;
        }
        .duration-badge {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
        }
        .skills-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 25px;
        }
        .skills-category-creative {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 25px;
            border-radius: 15px;
            border-top: 4px solid #667eea;
        }
        .skills-category-creative h4 {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 15px;
        }
        .skill-tag {
            display: inline-block;
            background: white;
            color: #667eea;
            padding: 8px 15px;
            margin: 4px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 500;
            border: 2px solid #667eea;
            transition: all 0.3s ease;
        }
        .skill-tag:hover {
            background: #667eea;
            color: white;
            transform: scale(1.05);
        }
        @media (max-width: 768px) {
            .header {
                padding: 40px 20px;
            }
            .content {
                padding: 20px;
            }
            .name {
                font-size: 32px;
            }
            .card-header {
                flex-direction: column;
                align-items: flex-start;
            }
            .duration-badge {
                margin-top: 10px;
            }
        }
    `;
  }

  private generateHeader(cv: ParsedCV): string {
    const contact = cv.personalInfo;
    const contactItems = [];
    
    if (contact.email) contactItems.push(`<div class="contact-item">📧 ${contact.email}</div>`);
    if (contact.phone) contactItems.push(`<div class="contact-item">📱 ${contact.phone}</div>`);
    if (contact.location) contactItems.push(`<div class="contact-item">📍 ${contact.location}</div>`);
    if (contact.linkedin) contactItems.push(`<div class="contact-item">🔗 ${contact.linkedin}</div>`);
    
    return `
        <header class="header">
            <h1 class="name">${contact.name}</h1>
            <div class="title">Professional CV</div>
            <div class="contact-creative">
                ${contactItems.join('')}
            </div>
        </header>
    `;
  }

  private generateSummary(cv: ParsedCV): string {
    if (!cv.summary) return '';
    
    return `
        <section class="section">
            <h2 class="section-title">Professional Summary</h2>
            <div class="summary-creative">${cv.summary}</div>
        </section>
    `;
  }

  private generateExperience(cv: ParsedCV): string {
    if (!cv.experience || cv.experience.length === 0) return '';
    
    const experienceItems = cv.experience.map(exp => `
        <div class="experience-card">
            <div class="card-header">
                <div>
                    <div class="position-title">${exp.position}</div>
                    <div class="company-name">${exp.company}</div>
                </div>
                <div class="duration-badge">${exp.duration}</div>
            </div>
            ${exp.description ? `<div style="color: #555; line-height: 1.7; margin-top: 10px;">${exp.description}</div>` : ''}
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
        <div class="education-card">
            <div class="card-header">
                <div>
                    <div class="degree-title">${edu.degree}</div>
                    <div class="institution-name">${edu.institution}</div>
                </div>
                <div class="duration-badge">${edu.graduationDate}</div>
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
        `<span class="skill-tag">${skill}</span>`
      ).join('');
      skillsContent += `
        <div class="skills-category-creative">
            <h4>Technical Skills</h4>
            <div>${technicalSkills}</div>
        </div>
      `;
    }
    
    if (cv.skills.soft && cv.skills.soft.length > 0) {
      const softSkills = cv.skills.soft.map((skill: any) => 
        `<span class="skill-tag">${skill}</span>`
      ).join('');
      skillsContent += `
        <div class="skills-category-creative">
            <h4>Soft Skills</h4>
            <div>${softSkills}</div>
        </div>
      `;
    }
    
    if (!skillsContent) return '';
    
    return `
        <section class="section">
            <h2 class="section-title">Skills & Expertise</h2>
            <div class="skills-grid">
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
        <div style="margin: 50px 0; padding: 30px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 20px; text-align: center;">
            <h3 style="margin-bottom: 20px; color: #333; font-size: 24px; font-weight: 600;">Download Your CV</h3>
            <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                <button onclick="window.print()" style="padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">📄 Print/Save PDF</button>
                <button onclick="downloadPDF()" style="padding: 15px 30px; background: linear-gradient(135deg, #764ba2 0%, #667eea 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(118, 75, 162, 0.4);">📑 Download PDF</button>
                <button onclick="downloadDOCX()" style="padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">📝 Download DOCX</button>
            </div>
            <p style="margin-top: 15px; font-size: 14px; color: #666;">Downloads will be available once processing is complete</p>
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
        <footer style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; font-size: 14px;">
            <p>✨ Generated with CVPlus - From Paper to Powerful: Your CV, Reinvented ✨</p>
        </footer>
    `;
  }
}