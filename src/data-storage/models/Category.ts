export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer'
}

export interface Category {
  category_id?: number;
  name: string;
  type: CategoryType;
  parent_category_id?: number | null;
  icon?: string | null;
  created_at?: string;
  updated_at?: string;
}
