import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton, GlassTabs } from '@/components/glass';
import { useCVStatus } from '@/hooks/useCVUpload';
import { AnalysisTab, CustomizeTab, PreviewTab } from '@/components/enhance';

type TabType = 'analysis' | 'customize' | 'preview';

export function EnhancePage() {
  const { t } = useTranslation();
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('analysis');

  const { data: cvStatus, isLoading, error } = useCVStatus(jobId || null);
  const cvData = cvStatus?.analysis;

  const handleProceedToShare = () => {
    navigate(`/share/${jobId}`);
  };

  if (isLoading || cvStatus?.status === 'processing' || cvStatus?.status === 'pending') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">{t('enhance.analyzing')}</h1>
          <p className="text-gray-400 mb-8">{t('upload.step', { number: 2 })}</p>
        </div>

        <GlassCard className="p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-6" />
          <p className="text-xl mb-2">{t('enhance.processing')}</p>
          <p className="text-gray-400">
            {t('enhance.aiAnalyzing')}
          </p>
        </GlassCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-400">{t('enhance.analysisFailed')}</h2>
          <p className="text-gray-300 mb-6">
            {error instanceof Error ? error.message : t('enhance.analysisFailed')}
          </p>
          <GlassButton onClick={() => navigate('/upload')}>
            {t('enhance.uploadAnother')}
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  if (!cvData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <GlassCard className="p-8 text-center">
          <p className="text-gray-300">{t('enhance.noData')}</p>
          <GlassButton onClick={() => navigate('/upload')} className="mt-4">
            {t('enhance.uploadCV')}
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">{t('enhance.title')}</h1>
        <p className="text-gray-400">{t('upload.step', { number: 2 })}</p>
      </div>

      <GlassTabs
        tabs={[
          { id: 'analysis', label: t('enhance.tabs.analysis') },
          { id: 'customize', label: t('enhance.tabs.customize') },
          { id: 'preview', label: t('enhance.tabs.preview') },
        ]}
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as TabType)}
        className="mb-6"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === 'analysis' && <AnalysisTab cvData={cvData} />}
          {activeTab === 'customize' && <CustomizeTab cvData={cvData} />}
          {activeTab === 'preview' && <PreviewTab cvData={cvData} />}
        </div>

        <div className="lg:col-span-1">
          <GlassCard className="p-6 sticky top-4">
            <h3 className="text-lg font-semibold mb-4">{t('enhance.actions')}</h3>
            <div className="space-y-3">
              <GlassButton
                variant="primary"
                onClick={handleProceedToShare}
                className="w-full"
              >
                {t('enhance.proceedToShare')}
              </GlassButton>
              <GlassButton variant="secondary" className="w-full">
                {t('enhance.saveDraft')}
              </GlassButton>
              <GlassButton variant="outline" className="w-full">
                {t('enhance.startOver')}
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
