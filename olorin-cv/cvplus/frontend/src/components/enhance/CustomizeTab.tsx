import { GlassCard } from '@/components/glass';
import { CVAnalysisResult } from '@/services/api';

interface CustomizeTabProps {
  cvData: CVAnalysisResult['analysis'];
}

export function CustomizeTab({ cvData }: CustomizeTabProps) {
  if (!cvData) return null;

  return (
    <GlassCard className="p-6">
      <h2 className="text-2xl font-bold mb-4">Customize Content</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Experience Level
          </label>
          <p className="text-gray-300">
            {cvData?.experience_years ? `${cvData.experience_years} years` : 'Not specified'}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Education Level
          </label>
          <p className="text-gray-300">{cvData?.education_level || 'Not specified'}</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Key Skills
          </label>
          <div className="flex flex-wrap gap-2">
            {cvData?.skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-500/20 rounded-full text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
        {cvData?.certifications && cvData.certifications.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Certifications
            </label>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              {cvData.certifications.map((cert, idx) => (
                <li key={idx}>{cert}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
