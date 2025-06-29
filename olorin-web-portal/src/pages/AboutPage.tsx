import React from 'react';
import { Shield, Brain, Target, Users, Award, TrendingUp } from 'lucide-react';

const AboutPage: React.FC = () => {
  const values = [
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Security First",
      description: "We prioritize the highest levels of security and privacy in everything we build."
    },
    {
      icon: <Brain className="h-8 w-8" />,
      title: "AI Innovation",
      description: "Pushing the boundaries of what's possible with artificial intelligence and machine learning."
    },
    {
      icon: <Target className="h-8 w-8" />,
      title: "Precision",
      description: "Delivering accurate, reliable solutions that minimize false positives and maximize effectiveness."
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Partnership",
      description: "Building long-term relationships with our clients as trusted security partners."
    }
  ];

  const stats = [
    { number: "2025", label: "Founded" },
    { number: "50+", label: "Enterprise Clients" },
    { number: "99.9%", label: "System Uptime" },
    { number: "$2B+", label: "Fraud Prevented" }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 to-secondary-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">
              About <span className="text-primary-600">Olorin.ai</span>
            </h1>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              We're pioneering the future of enterprise security with autonomous AI agents 
              that revolutionize fraud prevention and investigation processes.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-secondary-600 mb-6">
                At Olorin.ai, we believe that every enterprise deserves protection from evolving 
                fraud threats. Our mission is to democratize access to cutting-edge AI technology 
                that can autonomously detect, investigate, and prevent fraud with unprecedented accuracy.
              </p>
              <p className="text-lg text-secondary-600 mb-8">
                Named after the wise protector from Tolkien's world, Olorin represents our commitment 
                to being the guardian of your digital assets, watching over your business with 
                intelligence, vigilance, and unwavering dedication.
              </p>
              <div className="flex items-center space-x-4">
                <Award className="h-12 w-12 text-primary-600" />
                <div>
                  <h3 className="text-xl font-semibold text-secondary-900">
                    Industry Recognition
                  </h3>
                  <p className="text-secondary-600">
                    Recognized as a leader in AI-powered fraud prevention solutions
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl p-8">
                <div className="text-center">
                  <div className="flex justify-center items-center space-x-4 mb-6">
                    <img 
                      src={`${process.env.PUBLIC_URL}/assets/images/Olorin-Logo-Wizard-Only-transparent.png`}
                      alt="Olorin.ai Wizard Logo" 
                      className="h-20 w-auto"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `${process.env.PUBLIC_URL}/logo.png`;
                      }}
                    />
                    <div className="text-3xl font-bold text-secondary-900">
                      Olorin<span className="text-primary-600">.ai</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-secondary-900 mb-4">
                    Protecting Enterprises Worldwide
                  </h3>
                  <p className="text-secondary-700">
                    Our AI agents work tirelessly to safeguard businesses across industries, 
                    from financial services to e-commerce and beyond.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary-900 mb-4">
              Our Impact
            </h2>
            <p className="text-lg text-secondary-600">
              Numbers that demonstrate our commitment to excellence
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-secondary-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Our Core Values
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              The principles that guide everything we do and shape how we serve our clients
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-secondary-50 p-8 rounded-xl">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 bg-primary-100 p-3 rounded-lg">
                    <div className="text-primary-600">
                      {value.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                      {value.title}
                    </h3>
                    <p className="text-secondary-600">
                      {value.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-20 bg-secondary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Cutting-Edge Technology
              </h2>
              <p className="text-lg text-secondary-300 mb-6">
                Our platform leverages the latest advances in artificial intelligence, 
                machine learning, and generative AI to create autonomous agents that 
                think and act like expert fraud investigators.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-5 w-5 text-primary-400 flex-shrink-0" />
                  <span>Advanced Machine Learning Algorithms</span>
                </div>
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-5 w-5 text-primary-400 flex-shrink-0" />
                  <span>Natural Language Processing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-5 w-5 text-primary-400 flex-shrink-0" />
                  <span>Behavioral Pattern Recognition</span>
                </div>
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-5 w-5 text-primary-400 flex-shrink-0" />
                  <span>Real-time Data Processing</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-8">
                <div className="text-center">
                  <Brain className="h-16 w-16 text-primary-200 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold mb-4">AI-First Approach</h3>
                  <p className="text-primary-100">
                    Every solution we build starts with AI at its core, ensuring 
                    maximum effectiveness and continuous learning capabilities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-6">
              Meet Our Team
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto mb-12">
              Our diverse team of AI researchers, security experts, and industry veterans 
              is dedicated to building the future of fraud prevention.
            </p>
            <div className="bg-secondary-50 rounded-2xl p-8">
              <div className="flex justify-center mb-6">
                <Users className="h-16 w-16 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-secondary-900 mb-4">
                World-Class Expertise
              </h3>
              <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
                Our team combines decades of experience in cybersecurity, artificial intelligence, 
                and enterprise software to deliver solutions that truly make a difference.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage; 