import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { GlassCard, GlassButton } from '@/components/glass';

export function SharePage() {
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
    setDownloadError('PDF download feature coming soon');
    setTimeout(() => setDownloadError(null), 3000);
  };

  const handleDownloadDOCX = () => {
    setDownloadError('DOCX download feature coming soon');
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
        <h1 className="text-4xl font-bold mb-2">Share Your CV</h1>
        <p className="text-gray-400">Step 3 of 3 - You're done! 🎉</p>
      </div>

      <div className="grid gap-6">
        <GlassCard className="p-6">
          <h2 className="text-2xl font-bold mb-4">Download</h2>
          <p className="text-gray-400 mb-6">
            Download your enhanced CV in your preferred format
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
              📄 Download PDF
            </GlassButton>
            <GlassButton
              variant="secondary"
              onClick={handleDownloadDOCX}
              className="flex-1"
            >
              📝 Download DOCX
            </GlassButton>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-2xl font-bold mb-4">Public Profile</h2>
          <p className="text-gray-400 mb-6">
            Share a beautiful online version of your CV
          </p>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={publicUrl}
              readOnly
              className="flex-1 bg-white/5 border border-gray-600 rounded-lg px-4 py-2 text-white"
            />
            <GlassButton variant="primary" onClick={handleCopyLink}>
              {copied ? '✓ Copied!' : 'Copy Link'}
            </GlassButton>
          </div>
          <div className="flex gap-2">
            <GlassButton
              variant="outline"
              onClick={() => window.open(publicUrl, '_blank')}
              className="flex-1"
            >
              👁️ Preview
            </GlassButton>
            <GlassButton variant="outline" className="flex-1">
              ⚙️ Customize
            </GlassButton>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-2xl font-bold mb-4">Share on Social Media</h2>
          <p className="text-gray-400 mb-6">
            Let your network know about your updated CV
          </p>
          <div className="flex gap-4">
            <GlassButton
              variant="primary"
              onClick={handleShareLinkedIn}
              className="flex-1"
            >
              <span className="mr-2">in</span> LinkedIn
            </GlassButton>
            <GlassButton
              variant="secondary"
              onClick={handleShareTwitter}
              className="flex-1"
            >
              <span className="mr-2">𝕏</span> Twitter
            </GlassButton>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-2xl font-bold mb-4">QR Code</h2>
          <p className="text-gray-400 mb-6">
            QR code for your CV to use on business cards or resumes
          </p>
          <div className="flex justify-center mb-4">
            <div className="w-48 h-48 bg-white/10 backdrop-blur-lg rounded-lg flex items-center justify-center border border-gray-600">
              <span className="text-gray-400">QR Code Generation Coming Soon</span>
            </div>
          </div>
          <div className="flex justify-center">
            <GlassButton variant="outline" disabled>Download QR Code</GlassButton>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-blue-500/10 border border-blue-500/30">
          <h3 className="text-xl font-semibold mb-2">What's Next?</h3>
          <ul className="space-y-2 text-gray-300">
            <li>✓ Your CV is saved and ready to share</li>
            <li>✓ Download and use it for your job applications</li>
            <li>✓ Share your public profile link with recruiters</li>
            <li>✓ Come back anytime to update or create a new version</li>
          </ul>
          <div className="mt-6 flex gap-4">
            <GlassButton variant="primary" onClick={() => (window.location.href = '/upload')}>
              Create Another CV
            </GlassButton>
            <GlassButton variant="secondary">
              View My Dashboard
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
