export enum PayeeBusinessType {
  UTILITY = 'utility',
  SUBSCRIPTION = 'subscription',
  RETAIL = 'retail',
  SERVICE = 'service',
  RESTAURANT = 'restaurant',
  HEALTHCARE = 'healthcare',
  GOVERNMENT = 'government',
  FINANCIAL = 'financial',
  OTHER = 'other'
}

export interface Payee {
  payee_id?: number;
  name: string;
  default_category_id?: number | null;
  details?: PayeeDetails;
  transaction_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PayeeDetails {
  payee_id: number;
  business_type?: PayeeBusinessType;
  website?: string;
  phone?: string;
  address?: string;
  auto_categorization_rules?: string;
  payment_methods?: string;
  typical_amount_range?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EnhancedPayee extends Payee {
  details?: PayeeDetails;
  transaction_count?: number;
  total_amount?: number;
  average_amount?: number;
  last_transaction_date?: string;
}
