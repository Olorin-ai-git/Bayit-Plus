/**
 * Type definitions and Zod schemas for Youngsters feature
 */

import { z } from 'zod';

// Zod Schemas
export const YoungstersContentItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  age_group: z.string().optional(),
  age_rating: z.number().optional(),
  duration: z.string().optional(),
  educational_tags: z.array(z.string()).optional(),
});

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const SubcategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  name_en: z.string().optional(),
  icon: z.string().optional(),
  parent_category: z.string(),
  content_count: z.number(),
});

export const AgeGroupSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  name_en: z.string().optional(),
  min_age: z.number(),
  max_age: z.number(),
  content_count: z.number(),
});

// TypeScript Types (inferred from schemas)
export type YoungstersContentItem = z.infer<typeof YoungstersContentItemSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Subcategory = z.infer<typeof SubcategorySchema>;
export type AgeGroup = z.infer<typeof AgeGroupSchema>;
