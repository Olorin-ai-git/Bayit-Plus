import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Brain, 
  Search, 
  AlertTriangle, 
  Database, 
  Settings, 
  CheckCircle, 
  ArrowRight,
  Zap,
  Clock,
  TrendingUp,
  Lock,
  Monitor,
  MapPin,
  Network,
  FileText,
  Eye,
  Bot,
  Target,
  Layers,
  Server,
  Globe,
  Users,
  BarChart3,
  Cpu,
  Cloud,
  Code,
  Workflow
} from 'lucide-react';

const ServicesPage: React.FC = () => {
  const domainAgents = [
    {
      icon: <Monitor className="h-8 w-8" />,
      title: "Device Agent",
      description: "Analyzes device fingerprinting and behavioral patterns to identify device-based fraud indicators.",
      focusAreas: [
        "Device identification and consistency",
        "Browser and OS fingerprinting", 
        "Device reputation scoring",
        "Cross-device correlation"
      ],
      tools: [
        "Splunk query engine for device telemetry",
        "Vector search for behavioral pattern matching",
        "Device fingerprinting algorithms"
      ],
      dataSources: [
        "RSS (Risk Scoring Service) logs",
        "ThreatMetrix device data",
        "Browser fingerprinting data"
      ],
      apiEndpoint: "/api/device/{entity_id}",
      migrationPotential: "High - Self-contained with well-defined APIs"
    },
    {
      icon: <MapPin className="h-8 w-8" />,
      title: "Location Agent",
      description: "Detects geographic anomalies and impossible travel patterns to identify location-based fraud.",
      focusAreas: [
        "Geographic risk assessment",
        "Impossible travel detection",
        "Location consistency analysis",
        "VPN/proxy detection"
      ],
      tools: [
        "Identity Service integration",
        "Splunk geographic data analysis",
        "Vector search for location patterns"
      ],
      dataSources: [
        "Business location data",
        "Phone location services",
        "IP geolocation data",
        "Historical location patterns"
      ],
      apiEndpoint: "/api/location/{entity_id}",
      migrationPotential: "High - Modular design with external service integrations"
    },
    {
      icon: <Network className="h-8 w-8" />,
      title: "Network Agent",
      description: "Analyzes network-based risk indicators and ISP patterns for comprehensive network security.",
      focusAreas: [
        "ISP reputation analysis",
        "Network volatility detection",
        "Proxy/VPN identification",
        "IP address risk scoring"
      ],
      tools: [
        "Splunk network data queries",
        "ISP analysis algorithms",
        "Geographic network mapping"
      ],
      dataSources: [
        "Network telemetry logs",
        "ISP databases",
        "IP reputation services",
        "Proxy detection services"
      ],
      apiEndpoint: "/api/network/{entity_id}",
      migrationPotential: "High - Standard network analysis patterns"
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: "Logs Agent",
      description: "Examines authentication patterns and user behavior through comprehensive log analysis.",
      focusAreas: [
        "Authentication failure analysis",
        "Login pattern detection",
        "Session behavior analysis",
        "Account takeover indicators"
      ],
      tools: [
        "Splunk log analysis",
        "Database service integration",
        "Pattern recognition algorithms"
      ],
      dataSources: [
        "Authentication logs",
        "Session management data",
        "User activity logs",
        "Security event streams"
      ],
      apiEndpoint: "/api/logs/{entity_id}",
      migrationPotential: "Medium - Depends on log format standardization"
    }
  ];

  const investigationModes = [
    {
      icon: <Eye className="h-8 w-8" />,
      title: "Manual Investigation Mode",
      description: "Targeted investigation of specific risk domains with precise control and faster response times.",
      useCases: [
        "Targeted investigation of specific risk domains",
        "Deep-dive analysis for escalated cases",
        "Integration with existing security workflows",
        "Custom investigation scenarios"
      ],
      benefits: [
        "Precise control over investigation scope",
        "Faster response times for specific queries",
        "Easy integration with existing tools",
        "Granular risk assessment"
      ]
    },
    {
      icon: <Bot className="h-8 w-8" />,
      title: "Structured Investigation Mode",
      description: "Automated fraud detection workflows providing comprehensive 360-degree view with consistent methodology.",
      useCases: [
        "Automated fraud detection workflows",
        "Real-time risk scoring",
        "Bulk account analysis",
        "Proactive threat hunting"
      ],
      benefits: [
        "Comprehensive 360-degree view",
        "Automated decision making",
        "Consistent investigation methodology",
        "Scalable fraud detection"
      ]
    }
  ];

  const aiCapabilities = [
    {
      icon: <Brain className="h-6 w-6" />,
      title: "Pattern Recognition",
      description: "Identify subtle fraud indicators across complex data sets"
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Contextual Analysis",
      description: "Understand relationships between different risk factors"
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Natural Language Insights",
      description: "Generate human-readable explanations for risk decisions"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Adaptive Learning",
      description: "Improve detection accuracy based on new fraud patterns"
    }
  ];

  const businessValue = [
    {
      category: "Security Teams",
      icon: <Shield className="h-8 w-8" />,
      benefits: [
        "Reduced Investigation Time: Automated analysis across multiple domains",
        "Improved Accuracy: AI-powered pattern recognition reduces false positives",
        "Comprehensive Coverage: No blind spots in fraud detection",
        "Scalable Operations: Handle high-volume investigations efficiently"
      ]
    },
    {
      category: "Product Teams",
      icon: <Code className="h-8 w-8" />,
      benefits: [
        "Modular Architecture: Easy to extend with new domain agents",
        "API-First Design: Simple integration with existing products",
        "Real-time Capabilities: Support for both batch and streaming analysis",
        "Flexible Deployment: Can be deployed as microservices or monolith"
      ]
    },
    {
      category: "Business Operations",
      icon: <BarChart3 className="h-8 w-8" />,
      benefits: [
        "Cost Reduction: Automated fraud detection reduces manual review costs",
        "Risk Mitigation: Proactive identification of account takeover attempts",
        "Compliance Support: Detailed audit trails and risk documentation",
        "Customer Protection: Faster response to potential security threats"
      ]
    }
  ];

  const technicalCapabilities = [
    {
      category: "Data Processing",
      icon: <Database className="h-8 w-8" />,
      features: [
        "Multi-source Integration: Connects to Splunk, Database service, and identity services",
        "Real-time Analysis: Sub-second response times for individual domain queries",
        "Batch Processing: Support for bulk investigation workflows",
        "Data Privacy: Secure handling of sensitive user information"
      ]
    },
    {
      category: "Scalability Features",
      icon: <Layers className="h-8 w-8" />,
      features: [
        "Horizontal Scaling: Each domain agent can scale independently",
        "Load Balancing: Intelligent routing of investigation requests",
        "Caching Strategy: Optimized data retrieval and response times",
        "Fault Tolerance: Graceful degradation when services are unavailable"
      ]
    },
    {
      category: "Integration Options",
      icon: <Workflow className="h-8 w-8" />,
      features: [
        "REST APIs: Standard HTTP endpoints for all functionality",
        "Webhook Support: Real-time notifications for investigation results",
        "SDK Availability: Client libraries for common programming languages",
        "Documentation: Comprehensive API documentation and examples"
      ]
    }
  ];

  const futureIntegrations = [
    {
      category: "Enhanced Data Source Connectivity",
      items: [
        "Real-time Streaming Data: Integration with Kafka and other streaming platforms for live data analysis",
        "Third-party Intelligence Feeds: Connection to external threat intelligence and fraud databases",
        "Cloud Storage Integration: Direct access to AWS S3, Azure Blob, and Google Cloud Storage for historical data analysis",
        "API Gateway Expansion: Additional REST and GraphQL API integrations for extended data access"
      ]
    }
  ];

  const integrations = [
    {
      category: "Analytics & Data Platforms",
      icon: <Database className="h-8 w-8" />,
      items: [
        "Splunk: Enterprise security information and event management",
        "Salesforce: CRM integration for case management and customer data",
        "DataLake: Scalable data storage and analytics platform"
      ]
    },
    {
      category: "Database Systems",
      icon: <Server className="h-8 w-8" />,
      items: [
        "PostgreSQL: Advanced relational database with JSON support",
        "MongoDB: Document-oriented NoSQL database",
        "Redis: In-memory data structure store for caching",
        "Elasticsearch: Distributed search and analytics engine",
        "Cassandra: Wide-column NoSQL database for big data",
        "MySQL: Popular relational database management system",
        "Oracle Database: Enterprise-grade relational database",
        "Microsoft SQL Server: Comprehensive database platform",
        "Amazon DynamoDB: Fully managed NoSQL database service",
        "Google BigQuery: Serverless data warehouse solution"
      ]
    }
  ];

  const llmModels = [
    {
      category: "OpenAI Models",
      icon: <Brain className="h-8 w-8" />,
      models: [
        "GPT-4 Turbo: Latest high-performance language model",
        "GPT-4: Advanced reasoning and complex task handling",
        "GPT-3.5 Turbo: Fast and efficient for most applications",
        "GPT-4 Vision: Multimodal model with image understanding",
        "DALL-E 3: Advanced image generation capabilities"
      ]
    },
    {
      category: "Anthropic Models",
      icon: <Cpu className="h-8 w-8" />,
      models: [
        "Claude 3 Opus: Most capable model for complex tasks",
        "Claude 3 Sonnet: Balanced performance and speed",
        "Claude 3 Haiku: Fast and cost-effective option",
        "Claude 2.1: Enhanced reasoning and analysis",
        "Claude Instant: Quick responses for simple tasks"
      ]
    },
    {
      category: "Google Models",
      icon: <Globe className="h-8 w-8" />,
      models: [
        "Gemini Ultra: Most capable multimodal model",
        "Gemini Pro: High-performance for complex reasoning",
        "Gemini Pro Vision: Advanced image and video understanding",
        "PaLM 2: Large language model for diverse tasks",
        "Bard: Conversational AI with real-time information"
      ]
    },
    {
      category: "Meta & Open Source",
      icon: <Code className="h-8 w-8" />,
      models: [
        "Llama 2 70B: Large open-source language model",
        "Llama 2 13B: Medium-sized efficient model",
        "Llama 2 7B: Compact model for resource-constrained environments",
        "Code Llama: Specialized for code generation and analysis",
        "Mistral 7B: High-performance open-source model"
      ]
    },
    {
      category: "Specialized Models",
      icon: <Target className="h-8 w-8" />,
      models: [
        "Cohere Command: Enterprise-focused language model",
        "AI21 Jurassic-2: Advanced text generation and analysis",
        "Stability AI: Image and video generation models",
        "Hugging Face Transformers: Extensive model library",
        "Amazon Bedrock: Managed foundation model service"
      ]
    }
  ];

  const migrationPhases = [
    {
      phase: "Phase 1",
      title: "Deploy Individual Domain Agents",
      description: "Deploy individual domain agents for manual investigations"
    },
    {
      phase: "Phase 2", 
      title: "Implement Structured Workflows",
      description: "Implement structured investigation workflows"
    },
    {
      phase: "Phase 3",
      title: "System Integration",
      description: "Integrate with existing fraud detection systems"
    },
    {
      phase: "Phase 4",
      title: "Real-time Streaming",
      description: "Enable real-time streaming analysis"
    }
  ];

  return (
    <div className="min-h-screen bg-corporate-bgPrimary">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-corporate-bgPrimary via-corporate-bgSecondary to-corporate-bgPrimary py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-corporate-textPrimary mb-6">
              Intelligent <span className="text-corporate-accentPrimary">Fraud Investigation</span> Platform
            </h1>
            <p className="text-xl text-corporate-textSecondary max-w-4xl mx-auto mb-8">
              An intelligent fraud investigation platform that automates risk assessment across multiple data domains.
              Combines specialized domain agents with AI-powered analysis to provide comprehensive security insights
              for user accounts and devices.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center space-x-2 bg-corporate-accentPrimary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:brightness-110 transition-all duration-200 shadow-lg"
            >
              <span>Get Started Today</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* AI Capabilities Section */}
      <section className="py-16 bg-corporate-bgSecondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-4">
              AI Integration Strategy
            </h2>
            <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
              Our LLM Risk Assessment Layer leverages Large Language Models to provide intelligent fraud detection
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {aiCapabilities.map((capability, index) => (
              <div key={index} className="text-center glass-card p-6 hover:border-corporate-accentPrimary/60 transition-all duration-200">
                <div className="flex justify-center mb-4">
                  <div className="bg-corporate-accentPrimary/20 backdrop-blur-sm p-3 rounded-lg border border-corporate-accentPrimary/30">
                    <div className="text-corporate-accentPrimary">
                      {capability.icon}
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-corporate-textPrimary mb-2">
                  {capability.title}
                </h3>
                <p className="text-corporate-textSecondary">
                  {capability.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Domain Agents Section */}
      <section className="py-20 bg-corporate-bgPrimary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-4">
              Domain Agents Overview
            </h2>
            <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
              Specialized agents that analyze different aspects of fraud detection with independent usage capabilities
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {domainAgents.map((agent, index) => (
              <div key={index} className="glass-card p-8 hover:border-corporate-accentPrimary/60 transition-all duration-200">
                <div className="flex items-start space-x-4 mb-6">
                  <div className="flex-shrink-0 bg-corporate-accentPrimary/20 backdrop-blur-sm p-3 rounded-lg border border-corporate-accentPrimary/30">
                    <div className="text-corporate-accentPrimary">
                      {agent.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-corporate-textPrimary mb-2">
                      {agent.title}
                    </h3>
                    <p className="text-corporate-textSecondary mb-4">
                      {agent.description}
                    </p>
                    <div className="glass-panel p-3 mb-4">
                      <p className="text-sm font-medium text-corporate-textPrimary">
                        API Endpoint: <code className="bg-corporate-accentPrimary/20 px-2 py-1 rounded text-xs text-corporate-accentPrimary">{agent.apiEndpoint}</code>
                      </p>
                      <p className="text-sm text-corporate-textSecondary mt-1">
                        Migration: {agent.migrationPotential}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-corporate-textPrimary mb-2">Focus Areas:</h4>
                    <div className="space-y-1">
                      {agent.focusAreas.map((area, areaIndex) => (
                        <div key={areaIndex} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                          <span className="text-sm text-corporate-textSecondary">{area}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-corporate-textPrimary mb-2">Key Tools:</h4>
                    <div className="space-y-1">
                      {agent.tools.map((tool, toolIndex) => (
                        <div key={toolIndex} className="flex items-center space-x-2">
                          <Settings className="h-4 w-4 text-corporate-accentPrimary flex-shrink-0" />
                          <span className="text-sm text-corporate-textSecondary">{tool}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-corporate-textPrimary mb-2">Data Sources:</h4>
                    <div className="space-y-1">
                      {agent.dataSources.map((source, sourceIndex) => (
                        <div key={sourceIndex} className="flex items-center space-x-2">
                          <Database className="h-4 w-4 text-blue-400 flex-shrink-0" />
                          <span className="text-sm text-corporate-textSecondary">{source}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Investigation Modes Section */}
      <section className="py-20 bg-corporate-bgSecondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-4">
              Investigation Modes
            </h2>
            <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
              Choose between manual targeted investigations or fully structured fraud detection workflows
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {investigationModes.map((mode, index) => (
              <div key={index} className="glass-card p-8">
                <div className="flex items-start space-x-4 mb-6">
                  <div className="flex-shrink-0 bg-corporate-accentPrimary/20 backdrop-blur-sm p-3 rounded-lg border border-corporate-accentPrimary/30">
                    <div className="text-corporate-accentPrimary">
                      {mode.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-corporate-textPrimary mb-2">
                      {mode.title}
                    </h3>
                    <p className="text-corporate-textSecondary mb-4">
                      {mode.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-corporate-textPrimary mb-2">Use Cases:</h4>
                    <div className="space-y-1">
                      {mode.useCases.map((useCase, useCaseIndex) => (
                        <div key={useCaseIndex} className="flex items-center space-x-2">
                          <Target className="h-4 w-4 text-corporate-accentPrimary flex-shrink-0" />
                          <span className="text-sm text-corporate-textSecondary">{useCase}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-corporate-textPrimary mb-2">Benefits:</h4>
                    <div className="space-y-1">
                      {mode.benefits.map((benefit, benefitIndex) => (
                        <div key={benefitIndex} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                          <span className="text-sm text-corporate-textSecondary">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business Value Section */}
      <section className="py-20 bg-corporate-bgPrimary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-4">
              Business Value Proposition
            </h2>
            <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
              Comprehensive benefits for security teams, product teams, and business operations
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {businessValue.map((value, index) => (
              <div key={index} className="glass-card p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-corporate-accentPrimary/20 backdrop-blur-sm p-3 rounded-lg border border-corporate-accentPrimary/30">
                    <div className="text-corporate-accentPrimary">
                      {value.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-corporate-textPrimary">
                    {value.category}
                  </h3>
                </div>
                <div className="space-y-3">
                  {value.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-corporate-textSecondary">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Capabilities Section */}
      <section className="py-20 bg-corporate-bgSecondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-4">
              Technical Capabilities
            </h2>
            <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
              Enterprise-grade technical features designed for scalability, integration, and performance
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {technicalCapabilities.map((capability, index) => (
              <div key={index} className="glass-card p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-corporate-accentPrimary/20 backdrop-blur-sm p-3 rounded-lg border border-corporate-accentPrimary/30">
                    <div className="text-corporate-accentPrimary">
                      {capability.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-corporate-textPrimary">
                    {capability.category}
                  </h3>
                </div>
                <div className="space-y-3">
                  {capability.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-2">
                      <Cpu className="h-4 w-4 text-corporate-accentPrimary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-corporate-textSecondary">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-20 bg-corporate-bgSecondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-4">
              Platform Integrations
            </h2>
            <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
              Seamless connectivity with leading analytics platforms and database systems
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {integrations.map((integration, index) => (
              <div key={index} className="glass-card p-8 hover:border-corporate-accentPrimary/60 transition-all duration-200">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-corporate-accentPrimary/20 backdrop-blur-sm p-3 rounded-lg border border-corporate-accentPrimary/30">
                    <div className="text-corporate-accentPrimary">
                      {integration.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-corporate-textPrimary">
                    {integration.category}
                  </h3>
                </div>
                <div className="space-y-3">
                  {integration.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-corporate-textSecondary">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LLM Models Section */}
      <section className="py-20 bg-gradient-to-br from-corporate-bgPrimary via-corporate-bgSecondary to-corporate-bgPrimary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-4">
              Large Language Models (LLM)
            </h2>
            <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
              Integration with the latest and most advanced language models for superior AI-powered analysis
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {llmModels.map((provider, index) => (
              <div key={index} className="glass-card p-6 hover:border-corporate-accentPrimary/60 transition-all duration-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-corporate-accentPrimary/20 backdrop-blur-sm p-2 rounded-lg border border-corporate-accentPrimary/30">
                    <div className="text-corporate-accentPrimary">
                      {provider.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-corporate-textPrimary">
                    {provider.category}
                  </h3>
                </div>
                <div className="space-y-2">
                  {provider.models.map((model, modelIndex) => (
                    <div key={modelIndex} className="flex items-start space-x-2">
                      <Brain className="h-3 w-3 text-corporate-accentPrimary flex-shrink-0 mt-1" />
                      <span className="text-xs text-corporate-textSecondary">{model}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Migration Strategy Section */}
      <section className="py-20 bg-gradient-to-r from-corporate-accentPrimary/30 via-corporate-accentSecondary/30 to-corporate-accentPrimary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-4">
              Migration Strategy
            </h2>
            <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
              A phased approach to implementing our fraud investigation platform in your environment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {migrationPhases.map((phase, index) => (
              <div key={index} className="text-center glass-card p-6 hover:border-corporate-accentPrimary/60 transition-all duration-200">
                <div className="bg-corporate-accentPrimary backdrop-blur-sm rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-corporate-accentPrimary/50">
                  <span className="text-lg font-bold text-white">{phase.phase}</span>
                </div>
                <h3 className="text-lg font-semibold text-corporate-textPrimary mb-3">{phase.title}</h3>
                <p className="text-corporate-textSecondary text-sm">
                  {phase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Future Roadmap Section */}
      <section className="py-20 bg-corporate-bgSecondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-4">
              Future Roadmap
            </h2>
            <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
              Upcoming integrations and enhancements to expand platform capabilities
            </p>
          </div>

          <div className="space-y-8">
            {futureIntegrations.map((integration, index) => (
              <div key={index} className="glass-card p-8 hover:border-corporate-accentPrimary/60 transition-all duration-200">
                <h3 className="text-xl font-semibold text-corporate-textPrimary mb-4 flex items-center space-x-2">
                  <Globe className="h-6 w-6 text-corporate-accentPrimary" />
                  <span>{integration.category}</span>
                </h3>
                <div className="space-y-3">
                  {integration.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-start space-x-2">
                      <ArrowRight className="h-4 w-4 text-corporate-accentPrimary flex-shrink-0 mt-0.5" />
                      <span className="text-corporate-textSecondary">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System Requirements Section */}
      <section className="py-20 bg-gradient-to-br from-corporate-bgPrimary via-corporate-bgSecondary to-corporate-bgPrimary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-4">
              System Requirements
            </h2>
            <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
              Enterprise-ready infrastructure requirements for optimal performance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center glass-card p-6 hover:border-corporate-accentPrimary/60 transition-all duration-200">
              <div className="bg-corporate-accentPrimary/20 backdrop-blur-sm p-4 rounded-lg mb-4 border border-corporate-accentPrimary/30">
                <Server className="h-8 w-8 text-corporate-accentPrimary mx-auto" />
              </div>
              <h3 className="font-semibold text-corporate-textPrimary mb-2">Infrastructure</h3>
              <p className="text-sm text-corporate-textSecondary">Kubernetes-ready containerized deployment</p>
            </div>
            <div className="text-center glass-card p-6 hover:border-corporate-accentPrimary/60 transition-all duration-200">
              <div className="bg-corporate-accentPrimary/20 backdrop-blur-sm p-4 rounded-lg mb-4 border border-corporate-accentPrimary/30">
                <Layers className="h-8 w-8 text-corporate-accentPrimary mx-auto" />
              </div>
              <h3 className="font-semibold text-corporate-textPrimary mb-2">Dependencies</h3>
              <p className="text-sm text-corporate-textSecondary">Splunk, LLM services, identity providers</p>
            </div>
            <div className="text-center glass-card p-6 hover:border-corporate-accentPrimary/60 transition-all duration-200">
              <div className="bg-corporate-accentPrimary/20 backdrop-blur-sm p-4 rounded-lg mb-4 border border-corporate-accentPrimary/30">
                <Lock className="h-8 w-8 text-corporate-accentPrimary mx-auto" />
              </div>
              <h3 className="font-semibold text-corporate-textPrimary mb-2">Security</h3>
              <p className="text-sm text-corporate-textSecondary">OAuth 2.0, API key management, encrypted communications</p>
            </div>
            <div className="text-center glass-card p-6 hover:border-corporate-accentPrimary/60 transition-all duration-200">
              <div className="bg-corporate-accentPrimary/20 backdrop-blur-sm p-4 rounded-lg mb-4 border border-corporate-accentPrimary/30">
                <BarChart3 className="h-8 w-8 text-corporate-accentPrimary mx-auto" />
              </div>
              <h3 className="font-semibold text-corporate-textPrimary mb-2">Monitoring</h3>
              <p className="text-sm text-corporate-textSecondary">Health checks, metrics, and alerting capabilities</p>
            </div>
          </div>
        </div>
      </section>

      {/* Success Metrics Section */}
      <section className="py-20 bg-corporate-bgSecondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-corporate-textPrimary mb-4">
              Success Metrics
            </h2>
            <p className="text-xl text-corporate-textSecondary max-w-3xl mx-auto">
              Key performance indicators to measure platform effectiveness and business impact
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="glass-card p-6 text-center hover:border-corporate-accentPrimary/60 transition-all duration-200">
              <Clock className="h-8 w-8 text-corporate-accentPrimary mx-auto mb-3" />
              <h3 className="font-semibold text-corporate-textPrimary mb-2">Investigation Speed</h3>
              <p className="text-sm text-corporate-textSecondary">Time from trigger to final risk assessment</p>
            </div>
            <div className="glass-card p-6 text-center hover:border-corporate-accentPrimary/60 transition-all duration-200">
              <Target className="h-8 w-8 text-corporate-accentPrimary mx-auto mb-3" />
              <h3 className="font-semibold text-corporate-textPrimary mb-2">Accuracy Rates</h3>
              <p className="text-sm text-corporate-textSecondary">False positive and false negative percentages</p>
            </div>
            <div className="glass-card p-6 text-center hover:border-corporate-accentPrimary/60 transition-all duration-200">
              <Zap className="h-8 w-8 text-corporate-accentPrimary mx-auto mb-3" />
              <h3 className="font-semibold text-corporate-textPrimary mb-2">System Utilization</h3>
              <p className="text-sm text-corporate-textSecondary">API call volumes and response times</p>
            </div>
            <div className="glass-card p-6 text-center hover:border-corporate-accentPrimary/60 transition-all duration-200">
              <TrendingUp className="h-8 w-8 text-corporate-accentPrimary mx-auto mb-3" />
              <h3 className="font-semibold text-corporate-textPrimary mb-2">Business Impact</h3>
              <p className="text-sm text-corporate-textSecondary">Fraud detection rates and cost savings</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <ServicesCTASection />
    </div>
  );
};

export default ServicesPage; 