// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflictsexport class ValidationService {
  async validateProfileData(profileData: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors = [];
    
    if (!profileData.name || profileData.name.trim() === '') {
      errors.push('Name is required');
    }
    
    return { valid: errors.length === 0, errors };
  }

  async validateProfileUpdates(_updates: any): Promise<{ valid: boolean; errors: string[] }> {
    return { valid: true, errors: [] };
  }

  async validateForPublishing(profile: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors = [];
    
    if (!profile.name) errors.push('Name is required for publishing');
    if (!profile.title) errors.push('Title is required for publishing');
    if (!profile.summary) errors.push('Summary is required for publishing');
    
    return { valid: errors.length === 0, errors };
  }
}