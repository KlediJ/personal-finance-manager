export interface Tag {
  tag_id?: number;
  name: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TransactionTag {
  transaction_id: number;
  tag_id: number;
  created_at?: string;
}
