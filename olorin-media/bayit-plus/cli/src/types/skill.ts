/**
 * Type definitions for Claude skills
 */

export interface Skill {
  name: string;
  description: string;
  path: string;
  markdownPath: string;
  usage?: string;
  examples?: string[];
}

export interface SkillMetadata {
  name: string;
  description: string;
  usage: string;
  examples: string[];
}
