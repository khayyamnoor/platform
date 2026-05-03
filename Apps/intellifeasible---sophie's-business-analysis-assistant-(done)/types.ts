
export interface BusinessFields {
  businessIdea: string | null;
  productService: string | null;
  targetCustomer: string | null;
  problemSolved: string | null;
  location: string | null;
  revenueModel: string | null;
  competitors: string | null;
  uniqueAdvantage: string | null;
  monthlyCosts: number | null;
  monthlyRevenue: number | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface RadarDataPoint {
  subject: string;
  A: number;
  B: number;
  fullMark: number;
}

export interface GeminiSessionResponse {
  fields: BusinessFields;
  message: string;
  isReadyForAnalysis: boolean;
  analysisReport?: string;
  radarData?: RadarDataPoint[];
}

export const REQUIRED_FIELD_LABELS: Record<keyof BusinessFields, string> = {
  businessIdea: 'Business Idea',
  productService: 'Product / Service',
  targetCustomer: 'Target Customer',
  problemSolved: 'Problem Solved',
  location: 'Location',
  revenueModel: 'Revenue Model',
  competitors: 'Competitors',
  uniqueAdvantage: 'Unique Advantage',
  monthlyCosts: 'Monthly Costs ($)',
  monthlyRevenue: 'Monthly Revenue ($)'
};
