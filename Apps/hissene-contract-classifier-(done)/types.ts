export interface PaymentEvent {
  payment_date: string;
  payment_amount: string;
  payment_description: string;
}

export interface LegalRisk {
  article_reference: string;
  risk_description: string;
  legal_basis: string; // Tunisian Law reference
  recommendation: "KEEP" | "MODIFY" | "REMOVE" | "ADD";
  severity: "HIGH" | "MEDIUM" | "LOW";
}

export interface ExecutiveBrief {
  summary: string;
  key_decisions: string[];
  critical_data_points: string[];
}

// Existing Contract Data Structure
export interface ContractData {
  type: 'CONTRACT'; // Discriminating union
  classifier_name: string;
  company_name: string;
  counterparty_name: string;
  contract_subject: string;
  contract_type: string;
  contract_start_date: string;
  contract_end_date: string;
  contract_duration_description: string;
  currency: string;
  amounts: {
    total_contract_amount: string;
    total_amount_paid: string;
    calculation_notes: string;
  };
  payment_modality: string;
  payment_schedule: PaymentEvent[];
  contract_status: "ACTIVE" | "EXPIRED" | "FUTURE" | "UNKNOWN" | string;
  expiration_alert: {
    is_within_2_months: "YES" | "NO" | string;
    alert_message: string;
  };
  legal_analysis?: {
    overall_risk_score: number; // 0-100
    missing_mandatory_clauses: string[];
    risks: LegalRisk[];
  };
  executive_brief: ExecutiveBrief;
}

// New Supplier Intelligence Data Structure
export interface ProductItem {
  product_id: string;
  product_name: string;
  description: string;
  quantity: string;
  unit_price?: string;
  total_price?: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface SupplierScore {
  supplier_name: string;
  location: string;
  score: number; // 0-100
  rank: number;
  risk_level: "HIGH" | "MEDIUM" | "LOW";
  trend?: "IMPROVING" | "DECLINING" | "STABLE" | "UNKNOWN";
  dimensions: {
    product_match_accuracy: number; // /30
    local_presence: number; // /20
    price_competitiveness: number; // /25
    reliability_documentation: number; // /25
  };
}

export interface PriceBenchmark {
  min_price: string;
  max_price: string;
  avg_price: string;
  deviation_percentage: string;
  market_context: string;
}

export interface SupplierMetadata {
  tax_id: string; // Matricule Fiscale
  address: string;
  phone: string;
  email: string;
  website: string;
  bank_details?: string;
  payment_terms?: string;
  delivery_terms?: string;
}

export interface SupplierAnalysisData {
  type: 'SUPPLIER'; // Discriminating union
  analysis_name: string;
  supplier_name: string;
  supplier_metadata?: SupplierMetadata;
  document_type: "QUOTE" | "INVOICE" | "CATALOG" | "UNKNOWN" | string;
  products: ProductItem[];
  amounts?: {
    subtotal: string;
    tax_amount: string;
    discount: string;
    grand_total: string;
  };
  supplier_evaluation: SupplierScore;
  price_benchmark?: PriceBenchmark;
  negotiation_guidance: {
    strategy_summary: string;
    leverage_points: string[];
    recommended_ask: string;
    walk_away_point: string;
  };
  flags: string[]; // e.g., "UNKNOWN PRODUCT", "LOW CONFIDENCE"
  executive_brief: ExecutiveBrief;
}

// Union Type for the App
export type AnalysisResult = ContractData | SupplierAnalysisData;

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  isThinking?: boolean;
}

export interface HistoryItem {
  id: string;
  type: 'ANALYSIS' | 'LAWYER_QUERY' | 'AGENT_QUERY';
  query: string; // The filename or the user question
  timestamp: string; // ISO string
  details?: string; // Summary or context
}