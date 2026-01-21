import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { UseCasesPageTemplate, UseCase, IndustryStat } from '@olorin/shared';
import { Plane, Briefcase, Accessibility, GraduationCap, Languages } from 'lucide-react';

const TranslationPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const s = (key: string) => String(t(key));

  const useCases: UseCase[] = [
    {
      id: 'travel',
      title: s('translationPage.travel.title'), industry: s('translationPage.travel.industry'), icon: <Plane className="w-8 h-8" />,
      challenge: s('translationPage.travel.challenge'), solution: s('translationPage.travel.solution'),
      results: [
        { metric: s('translationPage.travel.r1.metric'), value: s('translationPage.travel.r1.value') },
        { metric: s('translationPage.travel.r2.metric'), value: s('translationPage.travel.r2.value') },
        { metric: s('translationPage.travel.r3.metric'), value: s('translationPage.travel.r3.value') },
        { metric: s('translationPage.travel.r4.metric'), value: s('translationPage.travel.r4.value') },
      ],
      features: [s('translationPage.travel.f1'), s('translationPage.travel.f2'), s('translationPage.travel.f3'), s('translationPage.travel.f4')],
      testimonial: { quote: s('translationPage.travel.testimonial.quote'), author: s('translationPage.travel.testimonial.author'), role: s('translationPage.travel.testimonial.role') },
    },
    {
      id: 'business',
      title: s('translationPage.business.title'), industry: s('translationPage.business.industry'), icon: <Briefcase className="w-8 h-8" />,
      challenge: s('translationPage.business.challenge'), solution: s('translationPage.business.solution'),
      results: [
        { metric: s('translationPage.business.r1.metric'), value: s('translationPage.business.r1.value') },
        { metric: s('translationPage.business.r2.metric'), value: s('translationPage.business.r2.value') },
        { metric: s('translationPage.business.r3.metric'), value: s('translationPage.business.r3.value') },
        { metric: s('translationPage.business.r4.metric'), value: s('translationPage.business.r4.value') },
      ],
      features: [s('translationPage.business.f1'), s('translationPage.business.f2'), s('translationPage.business.f3'), s('translationPage.business.f4')],
    },
    {
      id: 'accessibility',
      title: s('translationPage.accessibility.title'), industry: s('translationPage.accessibility.industry'), icon: <Accessibility className="w-8 h-8" />,
      challenge: s('translationPage.accessibility.challenge'), solution: s('translationPage.accessibility.solution'),
      results: [
        { metric: s('translationPage.accessibility.r1.metric'), value: s('translationPage.accessibility.r1.value') },
        { metric: s('translationPage.accessibility.r2.metric'), value: s('translationPage.accessibility.r2.value') },
        { metric: s('translationPage.accessibility.r3.metric'), value: s('translationPage.accessibility.r3.value') },
        { metric: s('translationPage.accessibility.r4.metric'), value: s('translationPage.accessibility.r4.value') },
      ],
      features: [s('translationPage.accessibility.f1'), s('translationPage.accessibility.f2'), s('translationPage.accessibility.f3'), s('translationPage.accessibility.f4')],
    },
    {
      id: 'learning',
      title: s('translationPage.learning.title'), industry: s('translationPage.learning.industry'), icon: <GraduationCap className="w-8 h-8" />,
      challenge: s('translationPage.learning.challenge'), solution: s('translationPage.learning.solution'),
      results: [
        { metric: s('translationPage.learning.r1.metric'), value: s('translationPage.learning.r1.value') },
        { metric: s('translationPage.learning.r2.metric'), value: s('translationPage.learning.r2.value') },
        { metric: s('translationPage.learning.r3.metric'), value: s('translationPage.learning.r3.value') },
        { metric: s('translationPage.learning.r4.metric'), value: s('translationPage.learning.r4.value') },
      ],
      features: [s('translationPage.learning.f1'), s('translationPage.learning.f2'), s('translationPage.learning.f3'), s('translationPage.learning.f4')],
    },
  ];

  const industryStats: IndustryStat[] = [
    { value: '5', label: s('translationPage.stats.languages') },
    { value: '<100ms', label: s('translationPage.stats.latency') },
    { value: '4', label: s('translationPage.stats.voices') },
    { value: '24/7', label: s('translationPage.stats.availability') },
  ];

  return (
    <UseCasesPageTemplate
      title={s('translationPage.title')} titleHighlight={s('translationPage.titleHighlight')} subtitle={s('translationPage.subtitle')}
      heroIcon={<Languages className="w-24 h-24" />} useCases={useCases}
      industryStats={industryStats} statsTitle={s('translationPage.statsTitle')}
      ctaTitle={s('translationPage.ctaTitle')} ctaSubtitle={s('translationPage.ctaSubtitle')} ctaButton={s('translationPage.ctaButton')}
      ctaAction={() => navigate('/contact')} accentColor="omen"
    />
  );
};

export default TranslationPage;
