
export interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  linkedin?: string;
  location: string;
  summary: string;
  experience: {
    company: string;
    role: string;
    period: string;
    description: string[];
  }[];
  skills: string[];
  education: {
    institution: string;
    degree: string;
    period: string;
  }[];
}

export interface MetricBreakdown {
  score: number;
  feedback: string;
}

// The output from the "Analyst" Agent
export interface AnalysisResult {
  currentScore: number;
  hardSkillGaps: string[];
  softSkillGaps: string[];
  rewriteInstructions: string; 
  feedback: string;
  breakdown: {
    keywords: MetricBreakdown;
    relevance: MetricBreakdown;
    formatting: MetricBreakdown;
  };
}

export interface OptimizationResult {
  originalScore: number;
  optimizedScore: number;
  analysis: {
    keywordGaps: string[];
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    breakdown: {
      keywords: MetricBreakdown;
      relevance: MetricBreakdown;
      formatting: MetricBreakdown;
    };
  };
  optimizedResume: ResumeData;
}

export enum AppState {
  SETUP = 'SETUP',
  IDLE = 'IDLE',
  OPTIMIZING = 'OPTIMIZING',
  COMPLETED = 'COMPLETED'
}

export type TemplateId = 'classic' | 'modern' | 'minimalist';

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  description: string;
  fonts: {
    heading: string;
    body: string;
  };
  layout: {
    headerAlignment: 'left' | 'center';
    sectionHeaderStyle: 'border-bottom' | 'uppercase-bold' | 'shaded';
  };
  colors: {
    primary: string; // Hex without #
    secondary: string;
    text: string;
  };
}
