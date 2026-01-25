import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@/components/glass';

export function SharePage() {
  const { t } = useTranslation();
  const { jobId } = useParams<{ jobId: string }>();
  const [copied, setCopied] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const publicUrl = `${window.location.origin}/cv/${jobId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    setDownloadError(t('share.featureComingSoon', { feature: 'PDF download' }));
    setTimeout(() => setDownloadError(null), 3000);
  };

  const handleDownloadDOCX = () => {
    setDownloadError(t('share.featureComingSoon', { feature: 'DOCX download' }));
    setTimeout(() => setDownloadError(null), 3000);
  };

  const handleShareLinkedIn = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      publicUrl
    )}`;
    window.open(linkedInUrl, '_blank');
  };

  const handleShareTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
      publicUrl
    )}&text=Check out my professional CV`;
    window.open(twitterUrl, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">{t('share.title')}</h1>
        <p className="text-gray-400">{t('share.stepComplete')}</p>
      </div>

      <div className="grid gap-6">
        <GlassCard className="p-6">
          <h2 className="text-2xl font-bold mb-4">{t('share.download')}</h2>
          <p className="text-gray-400 mb-6">
            {t('share.downloadDescription')}
          </p>

          {downloadError && (
            <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
              <p className="text-blue-200">{downloadError}</p>
            </div>
          )}

          <div className="flex gap-4">
            <GlassButton
              variant="primary"
              onClick={handleDownloadPDF}
              className="flex-1"
            >
              {t('share.downloadPDF')}
            </GlassButton>
            <GlassButton
              variant="secondary"
              onClick={handleDownloadDOCX}
              className="flex-1"
            >
              {t('share.downloadDOCX')}
            </GlassButton>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-2xl font-bold mb-4">{t('share.publicProfile')}</h2>
          <p className="text-gray-400 mb-6">
            {t('share.publicProfileDescription')}
          </p>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={publicUrl}
              readOnly
              className="flex-1 bg-white/5 border border-gray-600 rounded-lg px-4 py-2 text-white"
            />
            <GlassButton variant="primary" onClick={handleCopyLink}>
              {copied ? t('share.copied') : t('share.copyLink')}
            </GlassButton>
          </div>
          <div className="flex gap-2">
            <GlassButton
              variant="outline"
              onClick={() => window.open(publicUrl, '_blank')}
              className="flex-1"
            >
              {t('share.preview')}
            </GlassButton>
            <GlassButton variant="outline" className="flex-1">
              {t('share.customize')}
            </GlassButton>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-2xl font-bold mb-4">{t('share.socialShare')}</h2>
          <p className="text-gray-400 mb-6">
            {t('share.socialShareDescription')}
          </p>
          <div className="flex gap-4">
            <GlassButton
              variant="primary"
              onClick={handleShareLinkedIn}
              className="flex-1"
            >
              <span className="mr-2">in</span> {t('share.linkedin')}
            </GlassButton>
            <GlassButton
              variant="secondary"
              onClick={handleShareTwitter}
              className="flex-1"
            >
              <span className="mr-2">𝕏</span> {t('share.twitter')}
            </GlassButton>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-2xl font-bold mb-4">{t('share.qrCode')}</h2>
          <p className="text-gray-400 mb-6">
            {t('share.qrCodeDescription')}
          </p>
          <div className="flex justify-center mb-4">
            <div className="w-48 h-48 bg-white/10 backdrop-blur-lg rounded-lg flex items-center justify-center border border-gray-600">
              <span className="text-gray-400">{t('share.qrCodeComingSoon')}</span>
            </div>
          </div>
          <div className="flex justify-center">
            <GlassButton variant="outline" disabled>{t('share.downloadQR')}</GlassButton>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-blue-500/10 border border-blue-500/30">
          <h3 className="text-xl font-semibold mb-2">{t('share.whatsNext')}</h3>
          <ul className="space-y-2 text-gray-300">
            <li>{t('share.whatsNextItems.saved')}</li>
            <li>{t('share.whatsNextItems.download')}</li>
            <li>{t('share.whatsNextItems.shareProfile')}</li>
            <li>{t('share.whatsNextItems.comeback')}</li>
          </ul>
          <div className="mt-6 flex gap-4">
            <GlassButton variant="primary" onClick={() => (window.location.href = '/upload')}>
              {t('share.createAnother')}
            </GlassButton>
            <GlassButton variant="secondary">
              {t('share.viewDashboard')}
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
