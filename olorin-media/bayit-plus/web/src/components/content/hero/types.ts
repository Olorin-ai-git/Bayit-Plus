import { z } from 'zod'

/**
 * Content item schema for hero section
 */
export const ContentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  backdrop: z.string().optional(),
  thumbnail: z.string().optional(),
  category: z.string().optional(),
  year: z.number().optional(),
  duration: z.string().optional(),
  rating: z.string().optional(),
})

export type Content = z.infer<typeof ContentSchema>

/**
 * Hero section props schema
 */
export const HeroSectionPropsSchema = z.object({
  content: ContentSchema.nullable(),
})

export type HeroSectionProps = z.infer<typeof HeroSectionPropsSchema>

/**
 * Hero background props schema
 */
export const HeroBackgroundPropsSchema = z.object({
  imageUri: z.string().optional(),
  height: z.number(),
})

export type HeroBackgroundProps = z.infer<typeof HeroBackgroundPropsSchema>

/**
 * Hero metadata props schema
 */
export const HeroMetadataPropsSchema = z.object({
  year: z.number().optional(),
  duration: z.string().optional(),
  rating: z.string().optional(),
})

export type HeroMetadataProps = z.infer<typeof HeroMetadataPropsSchema>

/**
 * Hero actions props schema
 */
export const HeroActionsPropsSchema = z.object({
  contentId: z.string(),
  onPlay: z.function().args().returns(z.void()),
})

export type HeroActionsProps = z.infer<typeof HeroActionsPropsSchema>
