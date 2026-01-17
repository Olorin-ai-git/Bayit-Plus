import React from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlowingIcon } from '@olorin/shared';
import { FileText, TrendingUp, Video, BookOpen, Download, ExternalLink } from 'lucide-react';

const KnowledgeHubPage: React.FC = () => {
  const { t } = useTranslation();

  // Placeholder resources (will be populated with real content later)
  const resources = {
    whitePapers: [
      {
        title: 'The Future of AI-Powered Fraud Detection',
        description: 'Comprehensive analysis of emerging fraud patterns and AI countermeasures',
        downloadUrl: '#',
      },
      {
        title: 'Agentic AI: A New Paradigm',
        description: 'Deep dive into autonomous AI agent architectures and applications',
        downloadUrl: '#',
      },
      {
        title: 'Real-Time Streaming Optimization',
        description: 'Technical whitepaper on AI-driven content delivery networks',
        downloadUrl: '#',
      },
    ],
    caseStudies: [
      {
        title: 'Reducing Fraud by 80% in Financial Services',
        description: 'How a major bank leveraged Olorin.AI to transform fraud prevention',
        readUrl: '#',
      },
      {
        title: 'Scaling Media Streaming to 10M+ Concurrent Users',
        description: 'E-commerce platform achieves unprecedented streaming performance',
        readUrl: '#',
      },
      {
        title: 'Automating Radio Station Operations',
        description: 'Regional broadcaster cuts manual work by 60% with AI automation',
        readUrl: '#',
      },
    ],
    webinars: [
      {
        title: 'Getting Started with Agentic AI',
        description: 'Introduction to implementing AI agents in your organization',
        watchUrl: '#',
        date: '2026-02-15',
      },
      {
        title: 'Advanced Fraud Detection Strategies',
        description: 'Expert panel discussion on combating sophisticated fraud',
        watchUrl: '#',
        date: '2026-02-22',
      },
      {
        title: 'The Future of Intelligent Media Distribution',
        description: 'Trends and predictions for AI-powered content delivery',
        watchUrl: '#',
        date: '2026-03-01',
      },
    ],
    ebooks: [
      {
        title: 'The Complete Guide to AI-Powered Fraud Prevention',
        description: 'Essential strategies for modern fraud detection and prevention',
        downloadUrl: '#',
        pages: '120 pages',
      },
      {
        title: 'Building Scalable Streaming Infrastructure',
        description: 'Architecture patterns for high-performance media delivery',
        downloadUrl: '#',
        pages: '95 pages',
      },
      {
        title: 'AI in Broadcast Management',
        description: 'Transforming radio and broadcast operations with intelligent automation',
        downloadUrl: '#',
        pages: '80 pages',
      },
    ],
  };

  return (
    <div className="knowledge-hub-page">
      {/* Hero Section */}
      <section className="wizard-gradient-bg wizard-particles py-20 md:py-32">
        <div className="wizard-container">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-wizard-text-primary mb-6 animate-fade-in-up">
              {t('knowledgeHub.title')}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-wizard-text-secondary animate-fade-in-up animate-delay-100">
              {t('knowledgeHub.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* White Papers Section */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="mb-12 flex items-center space-x-4">
            <GlowingIcon
              icon={<FileText className="w-12 h-12" />}
              color="purple"
              size="lg"
            />
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-wizard-text-primary">
                {t('knowledgeHub.whitePapers.title')}
              </h2>
              <p className="text-wizard-text-secondary">
                {t('knowledgeHub.whitePapers.description')}
              </p>
            </div>
          </div>

          <div className="wizard-grid-3">
            {resources.whitePapers.map((paper, index) => (
              <GlassCard
                key={paper.title}
                className={`p-6 animate-fade-in-up animate-delay-${index + 1}00`}
              >
                <FileText className="w-10 h-10 text-wizard-accent-purple mb-4 glow-icon" />
                <h3 className="text-xl font-bold text-wizard-text-primary mb-3">
                  {paper.title}
                </h3>
                <p className="text-wizard-text-secondary mb-6">
                  {paper.description}
                </p>
                <a
                  href={paper.downloadUrl}
                  className="inline-flex items-center space-x-2 wizard-text font-semibold hover:underline"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </a>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies Section */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="mb-12 flex items-center space-x-4">
            <GlowingIcon
              icon={<TrendingUp className="w-12 h-12" />}
              color="main"
              size="lg"
            />
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-wizard-text-primary">
                {t('knowledgeHub.caseStudies.title')}
              </h2>
              <p className="text-wizard-text-secondary">
                {t('knowledgeHub.caseStudies.description')}
              </p>
            </div>
          </div>

          <div className="wizard-grid-3">
            {resources.caseStudies.map((study, index) => (
              <GlassCard
                key={study.title}
                variant="interactive"
                className={`p-6 animate-fade-in-up animate-delay-${index + 1}00`}
              >
                <TrendingUp className="w-10 h-10 text-wizard-accent-pink mb-4 glow-icon" />
                <h3 className="text-xl font-bold text-wizard-text-primary mb-3">
                  {study.title}
                </h3>
                <p className="text-wizard-text-secondary mb-6">
                  {study.description}
                </p>
                <a
                  href={study.readUrl}
                  className="inline-flex items-center space-x-2 wizard-text font-semibold hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Read Case Study</span>
                </a>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Webinars Section */}
      <section className="wizard-section bg-wizard-bg-primary">
        <div className="wizard-container">
          <div className="mb-12 flex items-center space-x-4">
            <GlowingIcon
              icon={<Video className="w-12 h-12" />}
              color="main"
              size="lg"
            />
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-wizard-text-primary">
                {t('knowledgeHub.webinars.title')}
              </h2>
              <p className="text-wizard-text-secondary">
                {t('knowledgeHub.webinars.description')}
              </p>
            </div>
          </div>

          <div className="wizard-grid-3">
            {resources.webinars.map((webinar, index) => (
              <GlassCard
                key={webinar.title}
                variant="interactive"
                className={`p-6 animate-fade-in-up animate-delay-${index + 1}00`}
              >
                <Video className="w-10 h-10 text-wizard-accent-cyan mb-4 glow-icon" />
                <div className="text-sm text-wizard-accent-purple mb-2">
                  {new Date(webinar.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                <h3 className="text-xl font-bold text-wizard-text-primary mb-3">
                  {webinar.title}
                </h3>
                <p className="text-wizard-text-secondary mb-6">
                  {webinar.description}
                </p>
                <a
                  href={webinar.watchUrl}
                  className="inline-flex items-center space-x-2 wizard-text font-semibold hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Watch Webinar</span>
                </a>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* E-Books Section */}
      <section className="wizard-section bg-wizard-bg-deep">
        <div className="wizard-container">
          <div className="mb-12 flex items-center space-x-4">
            <GlowingIcon
              icon={<BookOpen className="w-12 h-12" />}
              color="purple"
              size="lg"
            />
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-wizard-text-primary">
                {t('knowledgeHub.ebooks.title')}
              </h2>
              <p className="text-wizard-text-secondary">
                {t('knowledgeHub.ebooks.description')}
              </p>
            </div>
          </div>

          <div className="wizard-grid-3">
            {resources.ebooks.map((ebook, index) => (
              <GlassCard
                key={ebook.title}
                className={`p-6 animate-fade-in-up animate-delay-${index + 1}00`}
              >
                <BookOpen className="w-10 h-10 text-wizard-accent-purple mb-4 glow-icon" />
                <div className="text-sm text-wizard-text-muted mb-2">
                  {ebook.pages}
                </div>
                <h3 className="text-xl font-bold text-wizard-text-primary mb-3">
                  {ebook.title}
                </h3>
                <p className="text-wizard-text-secondary mb-6">
                  {ebook.description}
                </p>
                <a
                  href={ebook.downloadUrl}
                  className="inline-flex items-center space-x-2 wizard-text font-semibold hover:underline"
                >
                  <Download className="w-4 h-4" />
                  <span>Download E-Book</span>
                </a>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="wizard-section wizard-gradient-bg">
        <div className="wizard-container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-wizard-text-primary mb-6">
              Stay Updated
            </h2>
            <p className="text-lg md:text-xl text-wizard-text-secondary mb-10">
              Subscribe to our newsletter for the latest insights on AI and fraud prevention
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="wizard-input flex-1"
              />
              <button className="wizard-button">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default KnowledgeHubPage;
