import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@/components/glass';
import { useCVUpload } from '../hooks/useCVUpload';
import { CVAnalysisResult } from '@/services/api';

const VALID_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_SIZE = 10 * 1024 * 1024;

export function UploadPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useCVUpload();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFile(droppedFile)) {
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const isValidFile = (file: File): boolean => {
    if (!VALID_TYPES.includes(file.type)) {
      setError(t('upload.invalidType'));
      return false;
    }

    if (file.size > MAX_SIZE) {
      setError(t('upload.fileTooBig'));
      return false;
    }

    return true;
  };

  const handleUpload = async () => {
    if (!file) return;

    setError(null);

    uploadMutation.mutate(file, {
      onSuccess: (data: CVAnalysisResult) => {
        navigate(`/enhance/${data.job_id}`);
      },
      onError: (error) => {
        setError(error instanceof Error ? error.message : t('upload.uploadFailed'));
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">{t('upload.title')}</h1>
        <p className="text-gray-400">{t('upload.step', { number: 1 })}</p>
      </div>

      <GlassCard className="p-8">
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-600 hover:border-gray-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {file ? (
            <div>
              <div className="text-6xl mb-4">📄</div>
              <p className="text-xl font-semibold mb-2">{file.name}</p>
              <p className="text-gray-400 mb-4">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <GlassButton
                variant="secondary"
                onClick={() => setFile(null)}
                className="mr-2"
              >
                {t('upload.remove')}
              </GlassButton>
              <GlassButton
                variant="primary"
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? t('upload.uploading') : t('upload.uploadAnalyze')}
              </GlassButton>
            </div>
          ) : (
            <div>
              <div className="text-6xl mb-4">📤</div>
              <p className="text-xl mb-4">
                {t('upload.dragDrop')}
              </p>
              <input
                type="file"
                id="cv-upload"
                className="hidden"
                accept=".pdf,.docx"
                onChange={handleFileSelect}
              />
              <label htmlFor="cv-upload">
                <GlassButton variant="primary" as="span">
                  {t('upload.chooseFile')}
                </GlassButton>
              </label>
              <p className="text-sm text-gray-500 mt-4">
                {t('upload.supportedFormats')}
              </p>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
