/**
 * AI Agent Showcase Page
 *
 * Deep dive into the 6 specialized AI agents powering Olorin's
 * fraud detection capabilities.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AgentCard, AGENTS, TOTAL_TOOLS } from '../components/agents';

const AIAgentShowcasePage: React.FC = () => {
  const { t } = useTranslation();
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const handleToggle = (agentId: string) => {
    setExpandedAgent(expandedAgent === agentId ? null : agentId);
  };

  return (
    <div className="min-h-screen bg-corporate-bgPrimary">
      {/* Header spacing */}
      <div className="h-20" />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 mb-4 text-sm font-medium text-corporate-accentPrimary bg-corporate-accentPrimary/10 rounded-full border border-corporate-accentPrimary/20">
            AI-Powered Protection
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-corporate-textPrimary mb-6">
            6 Specialized AI Agents
            <span className="text-corporate-accentPrimary"> Working Together</span>
          </h1>
          <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
            Our multi-agent architecture combines {TOTAL_TOOLS}+ specialized tools across
            device, location, network, logs, authentication, and risk domains.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="glass-card p-6 rounded-xl mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <span className="text-3xl font-bold text-corporate-accentPrimary">6</span>
              <p className="text-corporate-textMuted text-sm mt-1">Specialized Agents</p>
            </div>
            <div>
              <span className="text-3xl font-bold text-corporate-accentPrimary">{TOTAL_TOOLS}+</span>
              <p className="text-corporate-textMuted text-sm mt-1">Detection Tools</p>
            </div>
            <div>
              <span className="text-3xl font-bold text-corporate-accentPrimary">&lt;1s</span>
              <p className="text-corporate-textMuted text-sm mt-1">Response Time</p>
            </div>
            <div>
              <span className="text-3xl font-bold text-corporate-accentPrimary">24/7</span>
              <p className="text-corporate-textMuted text-sm mt-1">Monitoring</p>
            </div>
          </div>
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {AGENTS.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isExpanded={expandedAgent === agent.id}
              onToggle={() => handleToggle(agent.id)}
            />
          ))}
        </div>

        {/* Architecture Section */}
        <div className="glass-card p-8 rounded-xl mb-12">
          <h2 className="text-2xl font-bold text-corporate-textPrimary mb-6 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-corporate-accentPrimary/20 flex items-center justify-center">
                <span className="text-2xl">📥</span>
              </div>
              <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">1. Data Ingestion</h3>
              <p className="text-corporate-textSecondary text-sm">
                Transaction and entity data flows into the system from multiple sources
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-corporate-accentPrimary/20 flex items-center justify-center">
                <span className="text-2xl">🔄</span>
              </div>
              <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">2. Parallel Analysis</h3>
              <p className="text-corporate-textSecondary text-sm">
                All 6 agents analyze data simultaneously using specialized tools
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-corporate-accentPrimary/20 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">3. Risk Aggregation</h3>
              <p className="text-corporate-textSecondary text-sm">
                Findings are synthesized into a unified risk score with explanations
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="glass-card p-8 rounded-xl bg-gradient-to-r from-corporate-accentPrimary/10 to-corporate-accentSecondary/10 border-corporate-accentPrimary/30 text-center">
          <h2 className="text-2xl font-bold text-corporate-textPrimary mb-4">See Our Agents in Action</h2>
          <p className="text-corporate-textSecondary mb-6 max-w-2xl mx-auto">
            Experience the power of our multi-agent system with an interactive demo
            or schedule a personalized walkthrough.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/demo/live"
              className="px-6 py-3 bg-corporate-accentPrimary hover:bg-corporate-accentSecondary text-white font-medium rounded-lg transition-colors"
            >
              Try Interactive Demo
            </Link>
            <Link
              to="/contact"
              className="px-6 py-3 border border-white/20 hover:bg-white/10 text-corporate-textPrimary font-medium rounded-lg transition-colors"
            >
              Schedule Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAgentShowcasePage;
