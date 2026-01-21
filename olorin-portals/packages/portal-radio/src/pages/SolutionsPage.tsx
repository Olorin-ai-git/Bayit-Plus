import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { UseCasesPageTemplate, UseCase, IndustryStat } from '@olorin/shared';
import { Radio, Volume2, Music, MessageCircle, Users } from 'lucide-react';

const SolutionsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const s = (key: string) => String(t(key));

  const useCases: UseCase[] = [
    {
      id: 'commercial',
      title: s('solutionsPage.commercial.title'), industry: s('solutionsPage.commercial.industry'), icon: <Volume2 className="w-8 h-8" />,
      challenge: s('solutionsPage.commercial.challenge'), solution: s('solutionsPage.commercial.solution'),
      results: [
        { metric: s('solutionsPage.commercial.r1.metric'), value: s('solutionsPage.commercial.r1.value') },
        { metric: s('solutionsPage.commercial.r2.metric'), value: s('solutionsPage.commercial.r2.value') },
        { metric: s('solutionsPage.commercial.r3.metric'), value: s('solutionsPage.commercial.r3.value') },
        { metric: s('solutionsPage.commercial.r4.metric'), value: s('solutionsPage.commercial.r4.value') },
      ],
      features: [s('solutionsPage.commercial.f1'), s('solutionsPage.commercial.f2'), s('solutionsPage.commercial.f3'), s('solutionsPage.commercial.f4')],
      testimonial: { quote: s('solutionsPage.commercial.testimonial.quote'), author: s('solutionsPage.commercial.testimonial.author'), role: s('solutionsPage.commercial.testimonial.role') },
    },
    {
      id: 'music',
      title: s('solutionsPage.music.title'), industry: s('solutionsPage.music.industry'), icon: <Music className="w-8 h-8" />,
      challenge: s('solutionsPage.music.challenge'), solution: s('solutionsPage.music.solution'),
      results: [
        { metric: s('solutionsPage.music.r1.metric'), value: s('solutionsPage.music.r1.value') },
        { metric: s('solutionsPage.music.r2.metric'), value: s('solutionsPage.music.r2.value') },
        { metric: s('solutionsPage.music.r3.metric'), value: s('solutionsPage.music.r3.value') },
        { metric: s('solutionsPage.music.r4.metric'), value: s('solutionsPage.music.r4.value') },
      ],
      features: [s('solutionsPage.music.f1'), s('solutionsPage.music.f2'), s('solutionsPage.music.f3'), s('solutionsPage.music.f4')],
    },
    {
      id: 'talk',
      title: s('solutionsPage.talk.title'), industry: s('solutionsPage.talk.industry'), icon: <MessageCircle className="w-8 h-8" />,
      challenge: s('solutionsPage.talk.challenge'), solution: s('solutionsPage.talk.solution'),
      results: [
        { metric: s('solutionsPage.talk.r1.metric'), value: s('solutionsPage.talk.r1.value') },
        { metric: s('solutionsPage.talk.r2.metric'), value: s('solutionsPage.talk.r2.value') },
        { metric: s('solutionsPage.talk.r3.metric'), value: s('solutionsPage.talk.r3.value') },
        { metric: s('solutionsPage.talk.r4.metric'), value: s('solutionsPage.talk.r4.value') },
      ],
      features: [s('solutionsPage.talk.f1'), s('solutionsPage.talk.f2'), s('solutionsPage.talk.f3'), s('solutionsPage.talk.f4')],
    },
    {
      id: 'community',
      title: s('solutionsPage.community.title'), industry: s('solutionsPage.community.industry'), icon: <Users className="w-8 h-8" />,
      challenge: s('solutionsPage.community.challenge'), solution: s('solutionsPage.community.solution'),
      results: [
        { metric: s('solutionsPage.community.r1.metric'), value: s('solutionsPage.community.r1.value') },
        { metric: s('solutionsPage.community.r2.metric'), value: s('solutionsPage.community.r2.value') },
        { metric: s('solutionsPage.community.r3.metric'), value: s('solutionsPage.community.r3.value') },
        { metric: s('solutionsPage.community.r4.metric'), value: s('solutionsPage.community.r4.value') },
      ],
      features: [s('solutionsPage.community.f1'), s('solutionsPage.community.f2'), s('solutionsPage.community.f3'), s('solutionsPage.community.f4')],
    },
  ];

  const industryStats: IndustryStat[] = [
    { value: '50%', label: s('solutionsPage.stats.retention') },
    { value: '40%', label: s('solutionsPage.stats.scheduling') },
    { value: '30%', label: s('solutionsPage.stats.revenue') },
    { value: '99.9%', label: s('solutionsPage.stats.uptime') },
  ];

  return (
    <UseCasesPageTemplate
      title={s('solutionsPage.title')} titleHighlight={s('solutionsPage.titleHighlight')} subtitle={s('solutionsPage.subtitle')}
      heroIcon={<Radio className="w-24 h-24" />} useCases={useCases}
      industryStats={industryStats} statsTitle={s('solutionsPage.statsTitle')}
      ctaTitle={s('solutionsPage.ctaTitle')} ctaSubtitle={s('solutionsPage.ctaSubtitle')} ctaButton={s('solutionsPage.ctaButton')}
      ctaAction={() => navigate('/contact')} accentColor="radio"
    />
  );
};

export default SolutionsPage;
