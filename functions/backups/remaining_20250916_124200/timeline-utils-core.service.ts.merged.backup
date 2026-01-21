// @ts-ignore - Export conflicts/**
 * Timeline Core Utilities Service
 * Core date parsing and validation utilities
 */

export class TimelineUtilsCoreService {
  
  /**
   * Parse date string to Date object with comprehensive error handling
   */
  parseDate(dateStr: string): Date {
    try {
      if (!dateStr || typeof dateStr !== 'string') {
        return new Date();
      }
      
      const sanitizedInput = dateStr.trim();
      if (sanitizedInput.length === 0) {
        return new Date();
      }
      
      // Strategy 1: Direct Date constructor parsing
      const directDate = new Date(sanitizedInput);
      if (!isNaN(directDate.getTime()) && this.isValidDateRange(directDate)) {
        return directDate;
      }
      
      // Strategy 2: Parse "Month Year" format
      const monthYearPattern = /^\s*(\w+)\s+(\d{4})\s*$/i;
      const monthYearMatch = sanitizedInput.match(monthYearPattern);
      if (monthYearMatch) {
        const monthMap: Record<string, number> = {
          'january': 0, 'jan': 0, 'february': 1, 'feb': 1, 'march': 2, 'mar': 2,
          'april': 3, 'apr': 3, 'may': 4, 'june': 5, 'jun': 5, 'july': 6, 'jul': 6,
          'august': 7, 'aug': 7, 'september': 8, 'sep': 8, 'sept': 8,
          'october': 9, 'oct': 9, 'november': 10, 'nov': 10, 'december': 11, 'dec': 11
        };
        
        const month = monthMap[monthYearMatch[1].toLowerCase()];
        const year = parseInt(monthYearMatch[2], 10);
        
        if (month !== undefined && year >= 1900 && year <= new Date().getFullYear() + 10) {
          return new Date(year, month, 1);
        }
      }
      
      // Strategy 3: Extract year from string
      const yearMatch = sanitizedInput.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0], 10);
        if (year >= 1900 && year <= new Date().getFullYear() + 10) {
          return new Date(year, 0, 1);
        }
      }
      
      return new Date();
      
    } catch (error) {
      return new Date();
    }
  }
  
  /**
   * Validate date range
   */
  private isValidDateRange(date: Date): boolean {
    try {
      const now = new Date();
      const minDate = new Date(1900, 0, 1);
      const maxDate = new Date(now.getFullYear() + 10, 11, 31);
      return date >= minDate && date <= maxDate && !isNaN(date.getTime());
    } catch {
      return false;
    }
  }
  
  /**
   * Check if date represents recent/current position
   */
  isRecent(dateStr: string): boolean {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const keywords = ['present', 'current', 'now', 'ongoing'];
    return keywords.some(keyword => dateStr.toLowerCase().includes(keyword));
  }
  
  /**
   * Estimate education start date
   */
  estimateEducationStartDate(edu: any): Date {
    try {
      if (!edu || !edu.endDate) return new Date();
      
      const endDate = this.parseDate(edu.endDate);
      const degreeYears: Record<string, number> = {
        'bachelor': 4, 'master': 2, 'phd': 5, 'associate': 2, 'diploma': 1, 'certificate': 1
      };
      
      let years = 4; // Default
      if (edu.degree && typeof edu.degree === 'string') {
        const degreeLower = edu.degree.toLowerCase();
        for (const [key, value] of Object.entries(degreeYears)) {
          if (degreeLower.includes(key)) {
            years = value;
            break;
          }
        }
      }
      
      return new Date(endDate.getFullYear() - years, endDate.getMonth(), 1);
    } catch {
      return new Date();
    }
  }
  
  /**
   * Extract impact metrics from achievements
   */
  extractImpactMetrics(achievements: string[]): { metric: string; value: string }[] {
    try {
      if (!achievements || !Array.isArray(achievements)) return [];
      
      const metrics: { metric: string; value: string }[] = [];
      const patterns = [
        /(\d+%)\s+(.+)/, /(\$[\d,]+(?:\.\d+)?[KMB]?)\s+(.+)/,
        /([\d,]+)\s+(users|customers|clients|projects|team members)/i,
        /increased\s+(.+)\s+by\s+(\d+%)/i, /reduced\s+(.+)\s+by\s+(\d+%)/i
      ];
      
      for (const achievement of achievements) {
        if (!achievement || typeof achievement !== 'string') continue;
        
        for (const pattern of patterns) {
          const match = achievement.match(pattern);
          if (match && match.length >= 2) {
            const value = match[1]?.trim();
            const metric = match[2]?.trim();
            
            if (value && metric && value.length <= 50 && metric.length <= 100) {
              metrics.push({ metric, value });
              break;
            }
          }
        }
      }
      
      return metrics.filter((metric, index, self) => 
        index === self.findIndex(m => m.metric === metric.metric && m.value === metric.value)
      );
      
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Extract achievement title
   */
  extractAchievementTitle(achievement: string): string {
    if (!achievement || typeof achievement !== 'string') return 'Achievement';
    
    try {
      const patterns = [
        /^(Awarded|Received|Won|Achieved|Earned)\s+(.+?)(?:\s+for|\s+in|\s+at|$)/i,
        /^(.+?)\s+(Award|Prize|Recognition|Certificate)/i,
        /^(.{20,50})/
      ];
      
      for (const pattern of patterns) {
        const match = achievement.match(pattern);
        if (match && (match[2] || match[1])) {
          return (match[2] || match[1]).trim() || 'Achievement';
        }
      }
      
      return achievement.substring(0, 50) + (achievement.length > 50 ? '...' : '');
    } catch {
      return 'Achievement';
    }
  }
}

export const timelineUtilsCoreService = new TimelineUtilsCoreService();