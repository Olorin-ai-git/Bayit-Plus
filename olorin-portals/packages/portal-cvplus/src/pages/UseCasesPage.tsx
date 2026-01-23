import React from 'react';
import { UseCasesPageTemplate } from '@olorin/shared';
import { Briefcase, GraduationCap, TrendingUp, Search } from 'lucide-react';

const UseCasesPage = () => {

  const useCases = [
    {
      id: 'career-changers',
      title: 'Career Transition Success',
      industry: 'Career Changers',
      icon: <Briefcase className="w-8 h-8" />,
      challenge: 'Struggled to rebrand professional experience when transitioning from teaching to tech industry',
      solution: 'CVPlus AI analyzed transferable skills and created tech-focused resume highlighting project management and analytical skills',
      results: [
        { metric: 'Interview Rate', value: '3x' },
        { metric: 'Time to Offer', value: '6 weeks' },
        { metric: 'Salary Increase', value: '40%' },
        { metric: 'Job Matches', value: '150+' },
      ],
      features: [
        'AI-Powered Skill Translation',
        'Industry-Specific Resume Templates',
        'Career Gap Analysis',
        'Interview Preparation',
      ],
      testimonial: {
        quote: 'CVPlus helped me confidently transition from education to software project management. The AI understood my transferable skills better than I did.',
        author: 'Sarah Chen',
        role: 'Project Manager at Tech Startup',
      },
    },
    {
      id: 'recent-graduates',
      title: 'First Job Success',
      industry: 'Recent Graduates',
      icon: <GraduationCap className="w-8 h-8" />,
      challenge: 'Limited work experience made it difficult to create compelling resume and stand out to employers',
      solution: 'CVPlus highlighted academic projects, internships, and skills with AI-optimized formatting for entry-level positions',
      results: [
        { metric: 'Applications Sent', value: '50' },
        { metric: 'Interviews', value: '12' },
        { metric: 'Job Offers', value: '3' },
        { metric: 'Time to Hire', value: '8 weeks' },
      ],
      features: [
        'Academic Experience Optimization',
        'Entry-Level Job Matching',
        'Skills Assessment',
        'Salary Benchmarking',
      ],
      testimonial: {
        quote: 'As a new grad with limited experience, CVPlus helped me showcase my potential. I landed my dream job within 2 months.',
        author: 'Michael Torres',
        role: 'Junior Data Analyst',
      },
    },
    {
      id: 'experienced-professionals',
      title: 'Executive Promotion',
      industry: 'Senior Professionals',
      icon: <TrendingUp className="w-8 h-8" />,
      challenge: 'Mid-career plateau with unclear path to leadership roles despite 15 years of experience',
      solution: 'CVPlus AI identified leadership competencies and reframed experience to emphasize strategic impact and team management',
      results: [
        { metric: 'Leadership Roles', value: '8' },
        { metric: 'Salary Offers', value: '$180K+' },
        { metric: 'Response Rate', value: '65%' },
        { metric: 'Time Saved', value: '20 hours' },
      ],
      features: [
        'Executive Resume Templates',
        'Leadership Skills Highlighting',
        'Salary Negotiation Insights',
        'C-Suite Job Matching',
      ],
      testimonial: {
        quote: 'CVPlus transformed my resume to reflect my true leadership value. I secured a VP role with a 50% salary increase.',
        author: 'David Kim',
        role: 'VP of Engineering',
      },
    },
    {
      id: 'job-seekers',
      title: 'Rapid Job Search Success',
      industry: 'Active Job Seekers',
      icon: <Search className="w-8 h-8" />,
      challenge: 'Sent 200+ applications with low response rate and unclear which roles were the best fit',
      solution: 'CVPlus AI matched skills to high-fit positions and customized resume for each application automatically',
      results: [
        { metric: 'Match Score', value: '92%' },
        { metric: 'Interview Rate', value: '4x' },
        { metric: 'Offers Received', value: '5' },
        { metric: 'Time to Offer', value: '4 weeks' },
      ],
      features: [
        'Smart Job Matching',
        'One-Click Customization',
        'ATS Optimization',
        'Application Tracking',
      ],
      testimonial: {
        quote: 'CVPlus saved me countless hours and got me 5x more interviews. The job matching is incredibly accurate.',
        author: 'Jennifer Lee',
        role: 'Marketing Manager',
      },
    },
  ];

  return (
    <UseCasesPageTemplate
      title="CVPlus Use Cases"
      subtitle="See how professionals use CVPlus to accelerate their careers"
      useCases={useCases}
      accentColor="cvplus"
    />
  );
};

export default UseCasesPage;
