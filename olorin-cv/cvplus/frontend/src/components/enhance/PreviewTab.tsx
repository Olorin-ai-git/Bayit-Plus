import { GlassCard } from '@/components/glass';
import { CVAnalysisResult } from '@/services/api';

interface PreviewTabProps {
  cvData: CVAnalysisResult['analysis'];
}

export function PreviewTab({ cvData }: PreviewTabProps) {
  if (!cvData) return null;

  return (
    <GlassCard className="p-6 bg-white text-black">
      <h2 className="text-2xl font-bold mb-4">CV Preview</h2>
      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">Experience:</span>
            <span className="text-gray-600">
              {cvData?.experience_years ? `${cvData.experience_years} years` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">Education:</span>
            <span className="text-gray-600">{cvData?.education_level || 'N/A'}</span>
          </div>
        </div>

        {cvData?.work_history && cvData.work_history.length > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-2">Work History</h3>
            {cvData.work_history.map((work, idx) => (
              <div key={idx} className="mb-4">
                <h4 className="font-semibold">{work.role}</h4>
                <p className="text-gray-600">{work.company}</p>
                <p className="text-sm text-gray-500">
                  {work.start_date} - {work.end_date || 'Present'}
                </p>
                <p className="mt-1">{work.responsibilities}</p>
              </div>
            ))}
          </div>
        )}

        {cvData?.education && cvData.education.length > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-2">Education</h3>
            {cvData.education.map((edu, idx) => (
              <div key={idx} className="mb-3">
                <h4 className="font-semibold">{edu.degree} in {edu.field}</h4>
                <p className="text-gray-600">{edu.institution}</p>
                <p className="text-sm text-gray-500">{edu.year}</p>
              </div>
            ))}
          </div>
        )}

        {cvData?.skills && cvData.skills.length > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {cvData.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-500/20 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
