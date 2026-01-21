import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { UseCasesPageTemplate, UseCase, IndustryStat } from '@olorin/shared';
import { Tv, GraduationCap, Building2, Radio, Play } from 'lucide-react';

const UseCasesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const s = (key: string) => String(t(key));

  const useCases: UseCase[] = [
    {
      id: 'ott',
      title: s('useCasesPage.ott.title'), industry: s('useCasesPage.ott.industry'), icon: <Tv className="w-8 h-8" />,
      challenge: s('useCasesPage.ott.challenge'), solution: s('useCasesPage.ott.solution'),
      results: [
        { metric: s('useCasesPage.ott.r1.metric'), value: s('useCasesPage.ott.r1.value') },
        { metric: s('useCasesPage.ott.r2.metric'), value: s('useCasesPage.ott.r2.value') },
        { metric: s('useCasesPage.ott.r3.metric'), value: s('useCasesPage.ott.r3.value') },
        { metric: s('useCasesPage.ott.r4.metric'), value: s('useCasesPage.ott.r4.value') },
      ],
      features: [s('useCasesPage.ott.f1'), s('useCasesPage.ott.f2'), s('useCasesPage.ott.f3'), s('useCasesPage.ott.f4')],
      testimonial: { quote: s('useCasesPage.ott.testimonial.quote'), author: s('useCasesPage.ott.testimonial.author'), role: s('useCasesPage.ott.testimonial.role') },
    },
    {
      id: 'live',
      title: s('useCasesPage.live.title'), industry: s('useCasesPage.live.industry'), icon: <Radio className="w-8 h-8" />,
      challenge: s('useCasesPage.live.challenge'), solution: s('useCasesPage.live.solution'),
      results: [
        { metric: s('useCasesPage.live.r1.metric'), value: s('useCasesPage.live.r1.value') },
        { metric: s('useCasesPage.live.r2.metric'), value: s('useCasesPage.live.r2.value') },
        { metric: s('useCasesPage.live.r3.metric'), value: s('useCasesPage.live.r3.value') },
        { metric: s('useCasesPage.live.r4.metric'), value: s('useCasesPage.live.r4.value') },
      ],
      features: [s('useCasesPage.live.f1'), s('useCasesPage.live.f2'), s('useCasesPage.live.f3'), s('useCasesPage.live.f4')],
    },
    {
      id: 'education',
      title: s('useCasesPage.education.title'), industry: s('useCasesPage.education.industry'), icon: <GraduationCap className="w-8 h-8" />,
      challenge: s('useCasesPage.education.challenge'), solution: s('useCasesPage.education.solution'),
      results: [
        { metric: s('useCasesPage.education.r1.metric'), value: s('useCasesPage.education.r1.value') },
        { metric: s('useCasesPage.education.r2.metric'), value: s('useCasesPage.education.r2.value') },
        { metric: s('useCasesPage.education.r3.metric'), value: s('useCasesPage.education.r3.value') },
        { metric: s('useCasesPage.education.r4.metric'), value: s('useCasesPage.education.r4.value') },
      ],
      features: [s('useCasesPage.education.f1'), s('useCasesPage.education.f2'), s('useCasesPage.education.f3'), s('useCasesPage.education.f4')],
    },
    {
      id: 'enterprise',
      title: s('useCasesPage.enterprise.title'), industry: s('useCasesPage.enterprise.industry'), icon: <Building2 className="w-8 h-8" />,
      challenge: s('useCasesPage.enterprise.challenge'), solution: s('useCasesPage.enterprise.solution'),
      results: [
        { metric: s('useCasesPage.enterprise.r1.metric'), value: s('useCasesPage.enterprise.r1.value') },
        { metric: s('useCasesPage.enterprise.r2.metric'), value: s('useCasesPage.enterprise.r2.value') },
        { metric: s('useCasesPage.enterprise.r3.metric'), value: s('useCasesPage.enterprise.r3.value') },
        { metric: s('useCasesPage.enterprise.r4.metric'), value: s('useCasesPage.enterprise.r4.value') },
      ],
      features: [s('useCasesPage.enterprise.f1'), s('useCasesPage.enterprise.f2'), s('useCasesPage.enterprise.f3'), s('useCasesPage.enterprise.f4')],
    },
  ];

  const industryStats: IndustryStat[] = [
    { value: '50%', label: s('useCasesPage.stats.buffer') },
    { value: '40%', label: s('useCasesPage.stats.cdn') },
    { value: '30%', label: s('useCasesPage.stats.engagement') },
    { value: '99.99%', label: s('useCasesPage.stats.uptime') },
  ];

  return (
    <UseCasesPageTemplate
      title={s('useCasesPage.title')} titleHighlight={s('useCasesPage.titleHighlight')} subtitle={s('useCasesPage.subtitle')}
      heroIcon={<Play className="w-24 h-24" />} useCases={useCases}
      industryStats={industryStats} statsTitle={s('useCasesPage.statsTitle')}
      ctaTitle={s('useCasesPage.ctaTitle')} ctaSubtitle={s('useCasesPage.ctaSubtitle')} ctaButton={s('useCasesPage.ctaButton')}
      ctaAction={() => navigate('/contact')} accentColor="streaming"
    />
  );
};

export default UseCasesPage;
