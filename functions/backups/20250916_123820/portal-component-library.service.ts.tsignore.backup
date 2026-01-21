// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsimport { ParsedCV } from '../types/job';
import { PortalTemplate, PortalTheme, ComponentConfiguration } from '../types/portal';
import { TemplateCustomizationService } from './template-customization.service';
import { logger } from 'firebase-functions';

export interface ComponentLibraryConfig {
  platform: 'gradio' | 'streamlit' | 'react' | 'static';
  theme: PortalTheme;
  cvData: ParsedCV;
  features: {
    chat: boolean;
    contact: boolean;
    portfolio: boolean;
    analytics: boolean;
  };
}

export interface GeneratedComponent {
  id: string;
  name: string;
  type: 'hero' | 'experience' | 'skills' | 'portfolio' | 'contact' | 'chat' | 'navigation' | 'footer';
  platform: string;
  code: {
    html?: string;
    css?: string;
    js?: string;
    python?: string;
    react?: string;
  };
  dependencies: string[];
  metadata: {
    responsive: boolean;
    accessible: boolean;
    interactive: boolean;
    performance: 'high' | 'medium' | 'low';
  };
}

export class PortalComponentLibraryService {
  private templateService: TemplateCustomizationService;

  constructor() {
    this.templateService = new TemplateCustomizationService();
  }

  /**
   * Generate all components for a portal
   */
  async generatePortalComponents(config: ComponentLibraryConfig): Promise<GeneratedComponent[]> {
    logger.info('[COMPONENT-LIBRARY] Generating portal components', {
      platform: config.platform,
      features: config.features
    });

    const components: GeneratedComponent[] = [];

    try {
      // Generate core components
      components.push(await this.generateHeroComponent(config));
      components.push(await this.generateExperienceComponent(config));
      components.push(await this.generateSkillsComponent(config));
      components.push(await this.generateNavigationComponent(config));
      components.push(await this.generateFooterComponent(config));

      // Generate optional components based on features
      if (config.features.portfolio) {
        components.push(await this.generatePortfolioComponent(config));
      }

      if (config.features.contact) {
        components.push(await this.generateContactComponent(config));
      }

      if (config.features.chat) {
        components.push(await this.generateChatComponent(config));
      }

      logger.info('[COMPONENT-LIBRARY] Generated components successfully', {
        count: components.length,
        types: components.map(c => c.type)
      });

      return components;
    } catch (error) {
      logger.error('[COMPONENT-LIBRARY] Error generating components:', error);
      throw new Error('Failed to generate portal components');
    }
  }

  /**
   * Generate hero section component
   */
  private async generateHeroComponent(config: ComponentLibraryConfig): Promise<GeneratedComponent> {
    const cvData = config.cvData;
    const theme = config.theme;
    const name = cvData.personalInfo?.name || 'Professional';
    const title = cvData.personalInfo?.title || 'Experienced Professional';
    const summary = cvData.summary || 'Passionate professional with expertise in multiple domains.';

    switch (config.platform) {
      case 'gradio':
        return {
          id: 'hero-gradio',
          name: 'Hero Section',
          type: 'hero',
          platform: 'gradio',
          code: {
            python: `
import gradio as gr

def create_hero_section():
    with gr.Column(elem_classes=["hero-section"]):
        with gr.Row():
            with gr.Column(scale=2):
                gr.Markdown(f"# {name}")
                gr.Markdown(f"## {title}")
                gr.Markdown(f"{summary}")
                
                with gr.Row():
                    chat_btn = gr.Button("💬 Chat with AI", variant="primary")
                    contact_btn = gr.Button("📧 Contact", variant="secondary")
                    
            with gr.Column(scale=1):
                gr.Image("assets/profile-photo.jpg", label="", show_label=False, 
                        height=300, width=300, elem_classes=["profile-photo"])
    
    return chat_btn, contact_btn

# Hero section CSS
hero_css = """
.hero-section {
    background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary});
    color: white;
    padding: 4rem 2rem;
    border-radius: 1rem;
    margin-bottom: 2rem;
}

.profile-photo {
    border-radius: 50%;
    border: 4px solid white;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}

@media (max-width: 768px) {
    .hero-section {
        padding: 2rem 1rem;
        text-align: center;
    }
}
"""
            `
          },
          dependencies: ['gradio'],
          metadata: {
            responsive: true,
            accessible: true,
            interactive: true,
            performance: 'high'
          }
        };

      case 'react':
        return {
          id: 'hero-react',
          name: 'Hero Section',
          type: 'hero',
          platform: 'react',
          code: {
            react: `
import React from 'react';

interface HeroSectionProps {
  name: string;
  title: string;
  summary: string;
  photoUrl?: string;
  onChatClick: () => void;
  onContactClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  name,
  title,
  summary,
  photoUrl,
  onChatClick,
  onContactClick
}) => {
  return (
    <section className="hero-section">
      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-name">{name}</h1>
            <h2 className="hero-title">{title}</h2>
            <p className="hero-summary">{summary}</p>
            
            <div className="hero-actions">
              <button 
                onClick={onChatClick}
                className="btn btn-primary"
                aria-label="Start AI chat"
              >
                💬 Chat with AI
              </button>
              <button 
                onClick={onContactClick}
                className="btn btn-secondary"
                aria-label="Contact form"
              >
                📧 Contact
              </button>
            </div>
          </div>
          
          <div className="hero-photo">
            <img 
              src={photoUrl || '/assets/default-avatar.jpg'} 
              alt={name}
              className="profile-photo"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
            `,
            css: `
.hero-section {
  background: linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary});
  color: white;
  padding: 4rem 2rem;
  border-radius: 1rem;
  margin-bottom: 2rem;
  position: relative;
  overflow: hidden;
}

.hero-container {
  max-width: 1200px;
  margin: 0 auto;
}

.hero-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 3rem;
  align-items: center;
}

.hero-name {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  line-height: 1.1;
}

.hero-title {
  font-size: 1.5rem;
  font-weight: 400;
  margin-bottom: 1.5rem;
  opacity: 0.9;
}

.hero-summary {
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 600px;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  font-size: 1rem;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.3);
}

.btn-primary {
  background: rgba(255,255,255,0.2);
  color: white;
  backdrop-filter: blur(10px);
}

.btn-secondary {
  background: transparent;
  color: white;
  border: 2px solid rgba(255,255,255,0.3);
}

.profile-photo {
  width: 300px;
  height: 300px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid white;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}

@media (max-width: 768px) {
  .hero-content {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 2rem;
  }
  
  .hero-name {
    font-size: 2.5rem;
  }
  
  .profile-photo {
    width: 200px;
    height: 200px;
  }
  
  .hero-actions {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .hero-section {
    padding: 2rem 1rem;
  }
  
  .hero-name {
    font-size: 2rem;
  }
  
  .btn {
    width: 100%;
    margin-bottom: 0.5rem;
  }
}
            `
          },
          dependencies: ['react'],
          metadata: {
            responsive: true,
            accessible: true,
            interactive: true,
            performance: 'high'
          }
        };

      default:
        return {
          id: 'hero-static',
          name: 'Hero Section',
          type: 'hero',
          platform: 'static',
          code: {
            html: `
<section class="hero-section" role="banner">
  <div class="hero-container">
    <div class="hero-content">
      <div class="hero-text">
        <h1 class="hero-name">${name}</h1>
        <h2 class="hero-title">${title}</h2>
        <p class="hero-summary">${summary}</p>
        
        <div class="hero-actions">
          <button onclick="openChat()" class="btn btn-primary" aria-label="Start AI chat">
            💬 Chat with AI
          </button>
          <button onclick="openContact()" class="btn btn-secondary" aria-label="Contact form">
            📧 Contact
          </button>
        </div>
      </div>
      
      <div class="hero-photo">
        <img 
          src="assets/profile-photo.jpg" 
          alt="${name}"
          class="profile-photo"
          loading="lazy"
        />
      </div>
    </div>
  </div>
</section>
            `,
            css: `/* Hero section styles included above */`,
            js: `
function openChat() {
  const chatWidget = document.getElementById('chat-widget');
  if (chatWidget) {
    chatWidget.style.display = 'block';
    chatWidget.scrollIntoView({ behavior: 'smooth' });
  }
}

function openContact() {
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.scrollIntoView({ behavior: 'smooth' });
  }
}
            `
          },
          dependencies: [],
          metadata: {
            responsive: true,
            accessible: true,
            interactive: true,
            performance: 'high'
          }
        };
    }
  }

  /**
   * Generate experience timeline component
   */
  private async generateExperienceComponent(config: ComponentLibraryConfig): Promise<GeneratedComponent> {
    const experiences = config.cvData.experience || [];
    
    return {
      id: 'experience-component',
      name: 'Experience Timeline',
      type: 'experience',
      platform: config.platform,
      code: {
        react: `
export const ExperienceTimeline = ({ experiences }) => {
  return (
    <section className="experience-section">
      <h2>Professional Experience</h2>
      <div className="timeline">
        {experiences.map((exp, index) => (
          <div key={index} className="timeline-item">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <h3>{exp.position}</h3>
              <h4>{exp.company}</h4>
              <span className="duration">{exp.duration}</span>
              <p>{exp.description}</p>
              {exp.achievements && (
                <ul className="achievements">
                  {exp.achievements.map((achievement, i) => (
                    <li key={i}>{achievement}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
        `,
        css: `
.experience-section {
  padding: 3rem 0;
}

.timeline {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 30px;
  top: 0;
  height: 100%;
  width: 2px;
  background: ${config.theme.colors.primary};
}

.timeline-item {
  position: relative;
  margin-bottom: 3rem;
  padding-left: 4rem;
}

.timeline-marker {
  position: absolute;
  left: 22px;
  top: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${config.theme.colors.primary};
  border: 3px solid white;
  box-shadow: 0 0 0 3px ${config.theme.colors.primary};
}

.timeline-content h3 {
  margin-bottom: 0.5rem;
  color: ${config.theme.colors.text};
}

.timeline-content h4 {
  color: ${config.theme.colors.primary};
  margin-bottom: 0.25rem;
}

.duration {
  color: ${config.theme.colors.textSecondary};
  font-size: 0.9rem;
}

.achievements {
  margin-top: 1rem;
  padding-left: 1.5rem;
}

.achievements li {
  margin-bottom: 0.5rem;
  position: relative;
}

.achievements li::before {
  content: '▸';
  color: ${config.theme.colors.primary};
  position: absolute;
  left: -1.5rem;
}

@media (max-width: 768px) {
  .timeline::before {
    left: 15px;
  }
  
  .timeline-item {
    padding-left: 2.5rem;
  }
  
  .timeline-marker {
    left: 7px;
  }
}
        `
      },
      dependencies: ['react'],
      metadata: {
        responsive: true,
        accessible: true,
        interactive: false,
        performance: 'high'
      }
    };
  }

  /**
   * Generate skills matrix component
   */
  private async generateSkillsComponent(config: ComponentLibraryConfig): Promise<GeneratedComponent> {
    const skills = config.cvData.skills || [];
    
    return {
      id: 'skills-component',
      name: 'Skills Matrix',
      type: 'skills',
      platform: config.platform,
      code: {
        react: `
export const SkillsMatrix = ({ skills }) => {
  const skillCategories = Array.isArray(skills) 
    ? [{ category: 'Skills', items: skills }]
    : Object.entries(skills).map(([category, items]) => ({ category, items }));

  return (
    <section className="skills-section">
      <h2>Skills & Expertise</h2>
      <div className="skills-grid">
        {skillCategories.map((category, index) => (
          <div key={index} className="skill-category">
            <h3>{category.category}</h3>
            <div className="skill-tags">
              {category.items.map((skill, i) => (
                <span key={i} className="skill-tag">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
        `,
        css: `
.skills-section {
  padding: 3rem 0;
  background: ${config.theme.colors.background};
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.skill-category h3 {
  margin-bottom: 1rem;
  color: ${config.theme.colors.primary};
  border-bottom: 2px solid ${config.theme.colors.primary};
  padding-bottom: 0.5rem;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.skill-tag {
  background: ${config.theme.colors.primary};
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  font-size: 0.9rem;
  font-weight: 500;
  transition: transform 0.2s;
}

.skill-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

@media (max-width: 768px) {
  .skills-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}
        `
      },
      dependencies: ['react'],
      metadata: {
        responsive: true,
        accessible: true,
        interactive: true,
        performance: 'high'
      }
    };
  }

  /**
   * Generate navigation component
   */
  private async generateNavigationComponent(config: ComponentLibraryConfig): Promise<GeneratedComponent> {
    return {
      id: 'navigation-component',
      name: 'Navigation',
      type: 'navigation',
      platform: config.platform,
      code: {
        react: `
export const Navigation = ({ sections }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <nav className="main-navigation" role="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <span className="nav-logo">${config.cvData.personalInfo?.name || 'Portfolio'}</span>
        </div>
        
        <button 
          className="nav-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation"
          aria-expanded={isOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        
        <div className={\`nav-menu \${isOpen ? 'nav-menu-open' : ''}\`}>
          <a href="#hero" className="nav-link">Home</a>
          <a href="#experience" className="nav-link">Experience</a>
          <a href="#skills" className="nav-link">Skills</a>
          {config.features.portfolio && (
            <a href="#portfolio" className="nav-link">Portfolio</a>
          )}
          {config.features.contact && (
            <a href="#contact" className="nav-link">Contact</a>
          )}
          {config.features.chat && (
            <a href="#chat" className="nav-link nav-link-primary">Chat</a>
          )}
        </div>
      </div>
    </nav>
  );
};
        `,
        css: `
.main-navigation {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  z-index: 1000;
  border-bottom: 1px solid rgba(0,0,0,0.1);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: ${config.theme.colors.primary};
}

.nav-menu {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.nav-link {
  text-decoration: none;
  color: ${config.theme.colors.text};
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.nav-link:hover {
  background: ${config.theme.colors.primary};
  color: white;
}

.nav-link-primary {
  background: ${config.theme.colors.primary};
  color: white;
}

.nav-toggle {
  display: none;
  flex-direction: column;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
}

.nav-toggle span {
  width: 25px;
  height: 3px;
  background: ${config.theme.colors.text};
  margin: 3px 0;
  transition: 0.3s;
}

@media (max-width: 768px) {
  .nav-toggle {
    display: flex;
  }
  
  .nav-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    flex-direction: column;
    padding: 1rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transform: translateY(-100%);
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s;
  }
  
  .nav-menu-open {
    transform: translateY(0);
    opacity: 1;
    visibility: visible;
  }
}
        `
      },
      dependencies: ['react'],
      metadata: {
        responsive: true,
        accessible: true,
        interactive: true,
        performance: 'high'
      }
    };
  }

  /**
   * Generate footer component
   */
  private async generateFooterComponent(config: ComponentLibraryConfig): Promise<GeneratedComponent> {
    const currentYear = new Date().getFullYear();
    const name = config.cvData.personalInfo?.name || 'Professional';
    
    return {
      id: 'footer-component',
      name: 'Footer',
      type: 'footer',
      platform: config.platform,
      code: {
        react: `
export const Footer = ({ qrCodeUrl, socialLinks }) => {
  return (
    <footer className="main-footer" role="contentinfo">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-info">
            <h3>${name}</h3>
            <p>Professional Portfolio</p>
            <p>© ${currentYear} ${name}. All rights reserved.</p>
          </div>
          
          <div className="footer-links">
            <h4>Connect</h4>
            <div className="social-links">
              {socialLinks?.linkedin && (
                <a href={socialLinks.linkedin} target="_blank" rel="noopener">
                  LinkedIn
                </a>
              )}
              {socialLinks?.github && (
                <a href={socialLinks.github} target="_blank" rel="noopener">
                  GitHub
                </a>
              )}
              {socialLinks?.website && (
                <a href={socialLinks.website} target="_blank" rel="noopener">
                  Website
                </a>
              )}
            </div>
          </div>
          
          {qrCodeUrl && (
            <div className="footer-qr">
              <h4>Share Portfolio</h4>
              <img src={qrCodeUrl} alt="QR Code to Portfolio" className="qr-code" />
              <p>Scan to visit</p>
            </div>
          )}
        </div>
        
        <div className="footer-bottom">
          <p>Powered by CVPlus AI</p>
        </div>
      </div>
    </footer>
  );
};
        `,
        css: `
.main-footer {
  background: ${config.theme.colors.backgroundDark || '#1a1a1a'};
  color: white;
  padding: 3rem 0 1rem;
  margin-top: 4rem;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.footer-content {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 3rem;
  margin-bottom: 2rem;
}

.footer-info h3 {
  margin-bottom: 0.5rem;
  color: ${config.theme.colors.primary};
}

.footer-links h4 {
  margin-bottom: 1rem;
  color: ${config.theme.colors.primary};
}

.social-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.social-links a {
  color: #ccc;
  text-decoration: none;
  transition: color 0.2s;
}

.social-links a:hover {
  color: ${config.theme.colors.primary};
}

.footer-qr {
  text-align: center;
}

.qr-code {
  width: 120px;
  height: 120px;
  margin: 1rem 0;
  border-radius: 0.5rem;
  background: white;
  padding: 0.5rem;
}

.footer-bottom {
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid #333;
  color: #888;
}

@media (max-width: 768px) {
  .footer-content {
    grid-template-columns: 1fr;
    gap: 2rem;
    text-align: center;
  }
}
        `
      },
      dependencies: ['react'],
      metadata: {
        responsive: true,
        accessible: true,
        interactive: false,
        performance: 'high'
      }
    };
  }

  /**
   * Generate portfolio gallery component
   */
  private async generatePortfolioComponent(config: ComponentLibraryConfig): Promise<GeneratedComponent> {
    return {
      id: 'portfolio-component',
      name: 'Portfolio Gallery',
      type: 'portfolio',
      platform: config.platform,
      code: {
        react: `
export const PortfolioGallery = ({ projects }) => {
  const [filter, setFilter] = React.useState('all');
  const [selectedProject, setSelectedProject] = React.useState(null);

  const categories = ['all', ...new Set(projects.map(p => p.category))];
  const filteredProjects = filter === 'all' 
    ? projects 
    : projects.filter(p => p.category === filter);

  return (
    <section className="portfolio-section">
      <h2>Portfolio</h2>
      
      <div className="portfolio-filters">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            className={\`filter-btn \${filter === category ? 'active' : ''}\`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>
      
      <div className="portfolio-grid">
        {filteredProjects.map((project, index) => (
          <div 
            key={index} 
            className="portfolio-item"
            onClick={() => setSelectedProject(project)}
          >
            <div className="portfolio-image">
              <img src={project.image} alt={project.title} />
              <div className="portfolio-overlay">
                <h3>{project.title}</h3>
                <p>{project.category}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {selectedProject && (
        <ProjectModal 
          project={selectedProject} 
          onClose={() => setSelectedProject(null)} 
        />
      )}
    </section>
  );
};
        `
      },
      dependencies: ['react'],
      metadata: {
        responsive: true,
        accessible: true,
        interactive: true,
        performance: 'medium'
      }
    };
  }

  /**
   * Generate contact form component
   */
  private async generateContactComponent(config: ComponentLibraryConfig): Promise<GeneratedComponent> {
    return {
      id: 'contact-component',
      name: 'Contact Form',
      type: 'contact',
      platform: config.platform,
      code: {
        react: `
export const ContactForm = () => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Integration with CVPlus contact form functionality
      await submitContactForm(formData);
      setSubmitted(true);
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="contact-success">
        <h3>Thank you for your message!</h3>
        <p>I'll get back to you within 24 hours.</p>
      </div>
    );
  }

  return (
    <section className="contact-section">
      <h2>Get In Touch</h2>
      <form onSubmit={handleSubmit} className="contact-form">
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input
            type="email"
            id="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="subject">Subject</label>
          <input
            type="text"
            id="subject"
            value={formData.subject}
            onChange={(e) => setFormData({...formData, subject: e.target.value})}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="message">Message *</label>
          <textarea
            id="message"
            required
            rows={6}
            value={formData.message}
            onChange={(e) => setFormData({...formData, message: e.target.value})}
          />
        </div>
        
        <button type="submit" disabled={isSubmitting} className="submit-btn">
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </section>
  );
};
        `
      },
      dependencies: ['react'],
      metadata: {
        responsive: true,
        accessible: true,
        interactive: true,
        performance: 'high'
      }
    };
  }

  /**
   * Generate chat widget component
   */
  private async generateChatComponent(config: ComponentLibraryConfig): Promise<GeneratedComponent> {
    return {
      id: 'chat-component',
      name: 'AI Chat Widget',
      type: 'chat',
      platform: config.platform,
      code: {
        react: `
export const ChatWidget = ({ portalId }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([]);
  const [inputMessage, setInputMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      // Integration with portal chat API from Phase 2
      const response = await fetch('/api/portal-chat-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portalId,
          message: inputMessage,
          sessionId: getSessionId()
        })
      });
      
      const data = await response.json();
      const aiMessage = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        className="chat-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle chat"
      >
        💬
      </button>
      
      {isOpen && (
        <div className="chat-widget">
          <div className="chat-header">
            <h3>Ask me anything!</h3>
            <button onClick={() => setIsOpen(false)}>×</button>
          </div>
          
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={\`message \${msg.role}\`}>
                {msg.content}
              </div>
            ))}
            {isLoading && <div className="message assistant">Thinking...</div>}
          </div>
          
          <div className="chat-input">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </>
  );
};
        `
      },
      dependencies: ['react'],
      metadata: {
        responsive: true,
        accessible: true,
        interactive: true,
        performance: 'medium'
      }
    };
  }

  /**
   * Generate complete portal page
   */
  async generateCompletePortal(config: ComponentLibraryConfig): Promise<string> {
    const components = await this.generatePortalComponents(config);
    
    // Generate complete page based on platform
    switch (config.platform) {
      case 'react':
        return this.generateReactPortal(components, config);
      case 'gradio':
        return this.generateGradioPortal(components, config);
      default:
        return this.generateStaticPortal(components, config);
    }
  }

  private generateReactPortal(components: GeneratedComponent[], config: ComponentLibraryConfig): string {
    return `
import React from 'react';
import './styles/portal.css';

// Component imports
${components.map(c => `// ${c.name} component would be imported here`).join('\n')}

export const Portfolio = () => {
  return (
    <div className="portfolio-app">
      {/* Navigation */}
      <Navigation />
      
      {/* Main Content */}
      <main>
        <HeroSection />
        <ExperienceTimeline />
        <SkillsMatrix />
        ${config.features.portfolio ? '<PortfolioGallery />' : ''}
        ${config.features.contact ? '<ContactForm />' : ''}
      </main>
      
      {/* Footer */}
      <Footer />
      
      {/* Chat Widget */}
      ${config.features.chat ? '<ChatWidget portalId="' + config.cvData.personalInfo?.name + '" />' : ''}
    </div>
  );
};

export default Portfolio;
    `;
  }

  private generateGradioPortal(components: GeneratedComponent[], config: ComponentLibraryConfig): string {
    return `
import gradio as gr
import os

# Portal configuration
PORTAL_CONFIG = {
    'name': '${config.cvData.personalInfo?.name || 'Professional'}',
    'title': '${config.cvData.personalInfo?.title || 'Professional Portfolio'}',
    'theme': gr.themes.Soft()
}

def create_portfolio_app():
    with gr.Blocks(
        title=PORTAL_CONFIG['name'],
        theme=PORTAL_CONFIG['theme'],
        css="portal-styles.css"
    ) as app:
        
        # Hero Section
        ${components.find(c => c.type === 'hero')?.code.python || '# Hero section code'}
        
        # Experience Section
        with gr.Row():
            gr.Markdown("## Professional Experience")
        # Experience timeline code here
        
        # Skills Section
        with gr.Row():
            gr.Markdown("## Skills & Expertise")
        # Skills matrix code here
        
        ${config.features.chat ? `
        # Chat Section
        with gr.Row():
            gr.Markdown("## Ask Me Anything")
        chatbot = gr.Chatbot()
        msg = gr.Textbox(placeholder="Type your message...")
        msg.submit(chat_fn, [msg, chatbot], [msg, chatbot])
        ` : ''}
        
        ${config.features.contact ? `
        # Contact Section
        with gr.Row():
            gr.Markdown("## Get In Touch")
        # Contact form code here
        ` : ''}
    
    return app

if __name__ == "__main__":
    app = create_portfolio_app()
    app.launch(server_name="0.0.0.0", server_port=7860)
    `;
  }

  private generateStaticPortal(components: GeneratedComponent[], config: ComponentLibraryConfig): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.cvData.personalInfo?.name || 'Professional Portfolio'}</title>
    <meta name="description" content="Professional portfolio of ${config.cvData.personalInfo?.name}">
    <link rel="stylesheet" href="styles/portal.css">
</head>
<body>
    <!-- Navigation -->
    ${components.find(c => c.type === 'navigation')?.code.html || ''}
    
    <!-- Main Content -->
    <main>
        <!-- Hero Section -->
        ${components.find(c => c.type === 'hero')?.code.html || ''}
        
        <!-- Experience Section -->
        ${components.find(c => c.type === 'experience')?.code.html || ''}
        
        <!-- Skills Section -->
        ${components.find(c => c.type === 'skills')?.code.html || ''}
        
        ${config.features.portfolio ? components.find(c => c.type === 'portfolio')?.code.html || '' : ''}
        
        ${config.features.contact ? components.find(c => c.type === 'contact')?.code.html || '' : ''}
    </main>
    
    <!-- Footer -->
    ${components.find(c => c.type === 'footer')?.code.html || ''}
    
    ${config.features.chat ? components.find(c => c.type === 'chat')?.code.html || '' : ''}
    
    <script src="scripts/portal.js"></script>
</body>
</html>
    `;
  }
}