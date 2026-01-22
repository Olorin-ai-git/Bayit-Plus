import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GlassCard, GlassButton, GlassTabs } from '@/components/glass';
import { useCVStatus } from '@/hooks/useCVUpload';
import { AnalysisTab, CustomizeTab, PreviewTab } from '@/components/enhance';

type TabType = 'analysis' | 'customize' | 'preview';

export function EnhancePage() {
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
          <h1 className="text-4xl font-bold mb-2">Analyzing Your CV</h1>
          <p className="text-gray-400 mb-8">Step 2 of 3</p>
        </div>

        <GlassCard className="p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-6" />
          <p className="text-xl mb-2">Processing your CV...</p>
          <p className="text-gray-400">
            Our AI is analyzing your experience, skills, and qualifications
          </p>
        </GlassCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <GlassCard className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-400">Analysis Failed</h2>
          <p className="text-gray-300 mb-6">
            {error instanceof Error ? error.message : 'Unable to analyze CV'}
          </p>
          <GlassButton onClick={() => navigate('/upload')}>
            Upload Another CV
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  if (!cvData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <GlassCard className="p-8 text-center">
          <p className="text-gray-300">No analysis data available</p>
          <GlassButton onClick={() => navigate('/upload')} className="mt-4">
            Upload CV
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Enhance Your CV</h1>
        <p className="text-gray-400">Step 2 of 3</p>
      </div>

      <GlassTabs
        tabs={[
          { id: 'analysis', label: 'AI Analysis' },
          { id: 'customize', label: 'Customize' },
          { id: 'preview', label: 'Preview' },
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
            <h3 className="text-lg font-semibold mb-4">Actions</h3>
            <div className="space-y-3">
              <GlassButton
                variant="primary"
                onClick={handleProceedToShare}
                className="w-full"
              >
                Proceed to Share →
              </GlassButton>
              <GlassButton variant="secondary" className="w-full">
                Save Draft
              </GlassButton>
              <GlassButton variant="outline" className="w-full">
                Start Over
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
