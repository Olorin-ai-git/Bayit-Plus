import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Search, TrendingUp, Edit3, Users, DollarSign, MessageSquare, Linkedin, BookOpen } from 'lucide-react';

const HomePage = () => {
  const { t } = useTranslation();

  const enhancementFeatures = [
    {
      icon: Search,
      title: t('features.enhancement.keyword.title'),
      description: t('features.enhancement.keyword.description'),
    },
    {
      icon: TrendingUp,
      title: t('features.enhancement.skillGap.title'),
      description: t('features.enhancement.skillGap.description'),
    },
    {
      icon: Edit3,
      title: t('features.enhancement.formatting.title'),
      description: t('features.enhancement.formatting.description'),
    },
  ];

  const matchingFeatures = [
    {
      icon: FileText,
      title: t('features.matching.personalized.title'),
      description: t('features.matching.personalized.description'),
    },
    {
      icon: Users,
      title: t('features.matching.culture.title'),
      description: t('features.matching.culture.description'),
    },
    {
      icon: DollarSign,
      title: t('features.matching.salary.title'),
      description: t('features.matching.salary.description'),
    },
  ];

  const growthFeatures = [
    {
      icon: MessageSquare,
      title: t('features.growth.interview.title'),
      description: t('features.growth.interview.description'),
    },
    {
      icon: Linkedin,
      title: t('features.growth.presence.title'),
      description: t('features.growth.presence.description'),
    },
    {
      icon: BookOpen,
      title: t('features.growth.learning.title'),
      description: t('features.growth.learning.description'),
    },
  ];

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-wizard-bg-deep via-purple-950 to-wizard-bg-deep py-20 px-4">
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="w-48 h-48 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-violet-600 rounded-3xl opacity-20 blur-2xl animate-pulse" />
              <div className="relative w-full h-full bg-gradient-to-br from-purple-500/30 to-violet-600/30 rounded-2xl backdrop-blur-xl border border-purple-400/20 flex items-center justify-center">
                <FileText className="w-24 h-24 text-purple-300" strokeWidth={1.5} />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight">
                OLORIN.AI:<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">
                  CVPLUS - AI-POWERED
                </span><br />
                CAREER ACCELERATION
              </h1>
              <p className="text-xl md:text-2xl text-purple-200 max-w-3xl mx-auto">
                {t('hero.subtitle')}
              </p>
            </div>

            <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg font-semibold text-lg hover:from-purple-500 hover:to-violet-500 transition-all transform hover:scale-105 shadow-lg shadow-purple-500/50">
              {t('hero.cta')}
            </button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-wizard-bg-deep">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-16">
            {t('features.enhancement.title')}
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {enhancementFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-purple-900/30 to-violet-900/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 hover:border-purple-400/40 transition-all hover:scale-105"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-violet-600/20 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-purple-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-purple-200">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-br from-purple-950/50 to-wizard-bg-deep">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-16">
            {t('features.matching.title')}
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {matchingFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-purple-900/30 to-violet-900/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 hover:border-purple-400/40 transition-all hover:scale-105"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-violet-600/20 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-purple-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-purple-200">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-wizard-bg-deep">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-16">
            {t('features.growth.title')}
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {growthFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-purple-900/30 to-violet-900/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 hover:border-purple-400/40 transition-all hover:scale-105"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-violet-600/20 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-purple-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-purple-200">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
