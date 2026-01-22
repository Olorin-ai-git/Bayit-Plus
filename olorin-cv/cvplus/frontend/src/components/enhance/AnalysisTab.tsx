import { GlassCard } from '@/components/glass';
import { CVAnalysisResult } from '@/services/api';

interface AnalysisTabProps {
  cvData: CVAnalysisResult['analysis'];
}

export function AnalysisTab({ cvData }: AnalysisTabProps) {
  if (!cvData) return null;

  return (
    <GlassCard className="p-6">
      <h2 className="text-2xl font-bold mb-4">Analysis Results</h2>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Top Skills Detected</h3>
          <div className="flex flex-wrap gap-2">
            {cvData?.skills.map((skill: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-500/20 rounded-full text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Analysis Scores</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Completeness Score:</span>
              <span className="font-bold">{cvData?.completeness_score}%</span>
            </div>
            <div className="flex justify-between">
              <span>ATS Compatibility:</span>
              <span className="font-bold">{cvData?.ats_score}%</span>
            </div>
          </div>
        </div>

        {cvData?.recommendations && cvData.recommendations.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Recommendations</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              {cvData.recommendations.map((rec: string, idx: number) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {cvData?.missing_sections && cvData.missing_sections.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Missing Sections</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              {cvData.missing_sections.map((section: string, idx: number) => (
                <li key={idx}>{section}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
