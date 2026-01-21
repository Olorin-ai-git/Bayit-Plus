// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Role Profiles Data
 * TODO: Implement comprehensive role profile data
 */

export interface RoleProfile {
  id: string;
  title: string;
  industry: string;
  level: 'entry' | 'mid' | 'senior' | 'executive';
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  qualifications: string[];
}

// Placeholder role profiles
export const roleProfiles: RoleProfile[] = [
  {
    id: 'software-engineer',
    title: 'Software Engineer',
    industry: 'Technology',
    level: 'mid',
    requiredSkills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
    preferredSkills: ['AWS', 'Docker', 'Kubernetes'],
    responsibilities: ['Develop software applications', 'Code review', 'Testing'],
    qualifications: ['Bachelor\'s degree in Computer Science or related field']
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    industry: 'Technology',
    level: 'senior',
    requiredSkills: ['Python', 'Machine Learning', 'SQL', 'Statistics'],
    preferredSkills: ['TensorFlow', 'PyTorch', 'R'],
    responsibilities: ['Data analysis', 'Model development', 'Research'],
    qualifications: ['Master\'s degree in Data Science, Statistics, or related field']
  }
];

export const getRoleProfile = (roleId: string): RoleProfile | undefined => {
  return roleProfiles.find(profile => profile.id === roleId);
};

export const getRoleProfilesByIndustry = (industry: string): RoleProfile[] => {
  return roleProfiles.filter(profile => profile.industry === industry);
};

// Export with alternative name for compatibility
export const roleProfilesData = roleProfiles;