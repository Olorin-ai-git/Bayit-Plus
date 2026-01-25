import { z } from 'zod'
import { colors } from '@olorin/design-tokens'

// Category colors for chapter markers (shared with ChapterCard)
export const categoryColors: Record<string, string> = {
  intro: '#3B82F6',      // blue-500
  news: '#EF4444',       // red-500
  security: '#F97316',   // orange-500
  politics: '#A855F7',   // purple-500
  economy: '#22C55E',    // green-500
  sports: '#EAB308',     // yellow-500
  weather: '#06B6D4',    // cyan-500
  culture: '#EC4899',    // pink-500
  conclusion: '#6B7280', // gray-500
  flashback: '#6366F1',  // indigo-500
  journey: '#14B8A6',    // teal-500
  climax: '#F43F5E',     // rose-500
  setup: '#F59E0B',      // amber-500
  action: '#DC2626',     // red-600
  conflict: '#EA580C',   // orange-600
  cliffhanger: '#8B5CF6', // violet-500
  main: '#2563EB',       // blue-600
}

// Format seconds to MM:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Get color for chapter category
export function getChapterColor(category: string): string {
  return categoryColors[category] || colors.primary
}

// Zod schemas
export const ChapterSchema = z.object({
  title: z.string(),
  category: z.string(),
  start_time: z.number().min(0),
  end_time: z.number().min(0),
}).refine(
  (data) => data.end_time > data.start_time,
  { message: 'end_time must be greater than start_time' }
)

export type Chapter = z.infer<typeof ChapterSchema>
