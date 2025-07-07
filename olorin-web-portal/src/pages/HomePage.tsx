import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Brain, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  Zap,
  Database
} from 'lucide-react';

const HomePage: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Brain className="h-6 w-6" />,
      title: t('features.agent.title'),
      description: t('features.agent.description')
    },
    {
      icon: <Search className="h-6 w-6" />,
      title: t('features.realtime.title'),
      description: t('features.realtime.description')
    },
    {
      icon: <AlertTriangle className="h-6 w-6" />,
      title: t('features.proactive.title'),
      description: t('features.proactive.description')
    },
    {
      icon: <Database className="h-6 w-6" />,
      title: t('features.intelligence.title'),
      description: t('features.intelligence.description')
    }
  ];

  const benefits = t('benefits.items', { returnObjects: true }) as string[];

  const stats = [
    { number: t('stats.accuracy'), label: t('stats.accuracyLabel') },
    { number: t('stats.reduction'), label: t('stats.reductionLabel') },
    { number: t('stats.monitoring'), label: t('stats.monitoringLabel') },
    { number: t('stats.response'), label: t('stats.responseLabel') }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-primary-100 to-purple-200 py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
              <img 
                src={`${process.env.PUBLIC_URL}/assets/images/Olorin-Logo-Wizard-Only-transparent.png`}
                alt="Olorin.ai Wizard Logo" 
                className="h-24 sm:h-32 w-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `${process.env.PUBLIC_URL}/logo.png`;
                }}
              />
              <div className="text-4xl sm:text-6xl md:text-7xl font-bold text-secondary-900">
                Olorin<span className="text-primary-600">.ai</span>
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-secondary-900 mb-6 animate-fade-in">
              {t('hero.title')}
              <span className="block text-primary-600">{t('hero.titleHighlight')}</span>
            </h1>
            <p className="text-xl text-secondary-600 mb-8 max-w-3xl mx-auto animate-slide-up">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
              <Link
                to="/contact"
                className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>{t('hero.ctaStart')}</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="https://olorin-ai.web.app/investigation?demo=true"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-purple-600 to-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-purple-700 hover:to-primary-700 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>{t('hero.ctaDemo')}</span>
                <Zap className="h-5 w-5" />
              </a>
              <Link
                to="/services"
                className="border-2 border-primary-600 text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-50 transition-all duration-200"
              >
                {t('hero.ctaLearn')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

      {/* Features Section */}
      <section className="py-20 bg-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              {t('features.title')}
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 bg-primary-100 p-3 rounded-lg">
                    <div className="text-primary-600">
                      {feature.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-secondary-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-6">
                {t('benefits.title')}
              </h2>
              <p className="text-lg text-secondary-600 mb-8">
                {t('benefits.subtitle')}
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-secondary-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl p-8 text-white">
                <div className="flex items-center space-x-3 mb-6">
                  <Zap className="h-8 w-8" />
                  <h3 className="text-2xl font-bold">{t('benefits.cta.title')}</h3>
                </div>
                <p className="text-primary-100 mb-6">
                  {t('benefits.cta.description')}
                </p>
                <Link
                  to="/contact"
                  className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors duration-200 inline-flex items-center space-x-2"
                >
                  <span>{t('benefits.cta.button')}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-800 to-primary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t('cta.title')}
          </h2>
          <p className="text-xl text-primary-200 mb-8 max-w-2xl mx-auto">
            {t('cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <span>{t('cta.startJourney')}</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
                          <Link
                to="/about"
                className="border-2 border-primary-200 text-primary-200 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-200 hover:text-primary-900 transition-all duration-200"
              >
              {t('cta.learnAbout')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage; 