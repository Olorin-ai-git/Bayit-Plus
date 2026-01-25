/**
 * Skill Registry - Loads skills from ~/.claude/skills/
 *
 * Provides:
 * - List all skills
 * - Search skills
 * - Get skill metadata from SKILL.md
 */

import { join } from 'path';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { resolveClaudeDir } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { Skill, SkillMetadata } from '../types/skill.js';

export class SkillRegistry {
  private claudeDir: string;
  private skillsDir: string;
  private skillsCache: Skill[] | null = null;

  constructor() {
    this.claudeDir = resolveClaudeDir();
    this.skillsDir = join(this.claudeDir, 'skills');
  }

  /**
   * Load all skills from skills directory
   */
  private loadSkills(): Skill[] {
    if (this.skillsCache) {
      return this.skillsCache;
    }

    if (!existsSync(this.skillsDir)) {
      logger.warn(`Skills directory not found: ${this.skillsDir}`);
      this.skillsCache = [];
      return [];
    }

    const skills: Skill[] = [];

    try {
      const entries = readdirSync(this.skillsDir);

      for (const entry of entries) {
        const skillPath = join(this.skillsDir, entry);
        const stats = statSync(skillPath);

        // Skip non-directories
        if (!stats.isDirectory()) {
          continue;
        }

        // Look for SKILL.md in skill directory
        const skillMdPath = join(skillPath, 'SKILL.md');

        if (!existsSync(skillMdPath)) {
          logger.debug(`Skipping ${entry}: no SKILL.md found`);
          continue;
        }

        // Parse SKILL.md for metadata
        const metadata = this.parseSkillMetadata(skillMdPath);

        skills.push({
          name: entry,
          description: metadata.description || `Skill: ${entry}`,
          path: skillPath,
          markdownPath: skillMdPath,
          usage: metadata.usage,
          examples: metadata.examples,
        });
      }

      logger.debug(`Loaded ${skills.length} skills from ${this.skillsDir}`);

      this.skillsCache = skills;
      return skills;
    } catch (error) {
      throw new Error(`Failed to load skills: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse SKILL.md for metadata
   */
  private parseSkillMetadata(markdownPath: string): SkillMetadata {
    try {
      const content = readFileSync(markdownPath, 'utf-8');

      // Extract description (first paragraph after title)
      const descriptionMatch = content.match(/^#[^\n]+\n+(.+?)(?:\n\n|\n#)/s);
      const description = descriptionMatch?.[1].trim() || '';

      // Extract usage section
      const usageMatch = content.match(/##\s*Usage\s*\n+(.+?)(?:\n##|\n\n##|$)/s);
      const usage = usageMatch?.[1].trim() || '';

      // Extract examples
      const examplesMatch = content.match(/##\s*Examples?\s*\n+(.+?)(?:\n##|\n\n##|$)/s);
      const examplesText = examplesMatch?.[1] || '';

      // Parse example code blocks
      const examples: string[] = [];
      const codeBlockRegex = /```[^\n]*\n(.+?)```/gs;
      let match;

      while ((match = codeBlockRegex.exec(examplesText)) !== null) {
        examples.push(match[1].trim());
      }

      return {
        name: '',
        description,
        usage,
        examples,
      };
    } catch (error) {
      logger.warn(`Failed to parse ${markdownPath}: ${error instanceof Error ? error.message : String(error)}`);
      return {
        name: '',
        description: '',
        usage: '',
        examples: [],
      };
    }
  }

  /**
   * Get all skills
   */
  getAllSkills(): Skill[] {
    return this.loadSkills();
  }

  /**
   * Search skills by name or description
   */
  searchSkills(query: string): Skill[] {
    const allSkills = this.getAllSkills();
    const lowerQuery = query.toLowerCase();

    return allSkills.filter(skill =>
      skill.name.toLowerCase().includes(lowerQuery) ||
      skill.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get specific skill by name
   */
  getSkill(name: string): Skill | null {
    const allSkills = this.getAllSkills();
    return allSkills.find(skill => skill.name === name) || null;
  }

  /**
   * Get skill count
   */
  getSkillCount(): number {
    return this.getAllSkills().length;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSkills: number;
    skillsWithExamples: number;
    skillsWithUsage: number;
  } {
    const skills = this.getAllSkills();

    return {
      totalSkills: skills.length,
      skillsWithExamples: skills.filter(s => s.examples && s.examples.length > 0).length,
      skillsWithUsage: skills.filter(s => s.usage && s.usage.length > 0).length,
    };
  }
}
