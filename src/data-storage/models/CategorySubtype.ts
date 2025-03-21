/**
 * CategorySubtype - Provides specific categorization types for transactions
 * These are not stored in the database directly but used in the UI for organization
 */
export enum CategorySubtype {
  // Income subtypes
  SALARY = 'salary',
  INTEREST = 'interest',
  INVESTMENT = 'investment_income',
  BONUS = 'bonus',
  GIFT = 'gift_received',
  REFUND = 'refund',
  OTHER_INCOME = 'other_income',
  
  // Expense subtypes
  HOUSING = 'housing',
  UTILITIES = 'utilities',
  TRANSPORTATION = 'transportation',
  FOOD = 'food',
  GROCERIES = 'groceries',
  DINING = 'dining_out',
  ENTERTAINMENT = 'entertainment',
  HEALTH = 'health',
  INSURANCE = 'insurance',
  DEBT = 'debt_payment',
  SAVINGS = 'savings',
  PERSONAL = 'personal',
  EDUCATION = 'education',
  SHOPPING = 'shopping',
  TRAVEL = 'travel',
  CHARITY = 'charity',
  TAXES = 'taxes',
  MISC = 'miscellaneous'
}

// Mapping of subtypes to main category types
export const categorySubtypeGroups = {
  income: [
    CategorySubtype.SALARY,
    CategorySubtype.INTEREST,
    CategorySubtype.INVESTMENT,
    CategorySubtype.BONUS,
    CategorySubtype.GIFT,
    CategorySubtype.REFUND,
    CategorySubtype.OTHER_INCOME
  ],
  expense: [
    CategorySubtype.HOUSING,
    CategorySubtype.UTILITIES,
    CategorySubtype.TRANSPORTATION,
    CategorySubtype.FOOD,
    CategorySubtype.GROCERIES,
    CategorySubtype.DINING,
    CategorySubtype.ENTERTAINMENT,
    CategorySubtype.HEALTH,
    CategorySubtype.INSURANCE,
    CategorySubtype.DEBT,
    CategorySubtype.SAVINGS,
    CategorySubtype.PERSONAL,
    CategorySubtype.EDUCATION,
    CategorySubtype.SHOPPING,
    CategorySubtype.TRAVEL,
    CategorySubtype.CHARITY,
    CategorySubtype.TAXES,
    CategorySubtype.MISC
  ]
};

// Map subtypes to user-friendly display names
export const categorySubtypeLabels: Record<CategorySubtype, string> = {
  // Income labels
  [CategorySubtype.SALARY]: 'Salary & Wages',
  [CategorySubtype.INTEREST]: 'Interest Income',
  [CategorySubtype.INVESTMENT]: 'Investment Returns',
  [CategorySubtype.BONUS]: 'Bonuses & Commissions',
  [CategorySubtype.GIFT]: 'Gifts Received',
  [CategorySubtype.REFUND]: 'Refunds & Reimbursements',
  [CategorySubtype.OTHER_INCOME]: 'Other Income',
  
  // Expense labels
  [CategorySubtype.HOUSING]: 'Housing (Rent/Mortgage)',
  [CategorySubtype.UTILITIES]: 'Utilities',
  [CategorySubtype.TRANSPORTATION]: 'Transportation',
  [CategorySubtype.FOOD]: 'Food',
  [CategorySubtype.GROCERIES]: 'Groceries',
  [CategorySubtype.DINING]: 'Dining Out',
  [CategorySubtype.ENTERTAINMENT]: 'Entertainment',
  [CategorySubtype.HEALTH]: 'Healthcare',
  [CategorySubtype.INSURANCE]: 'Insurance',
  [CategorySubtype.DEBT]: 'Debt Payments',
  [CategorySubtype.SAVINGS]: 'Savings & Investments',
  [CategorySubtype.PERSONAL]: 'Personal Care',
  [CategorySubtype.EDUCATION]: 'Education',
  [CategorySubtype.SHOPPING]: 'Shopping',
  [CategorySubtype.TRAVEL]: 'Travel',
  [CategorySubtype.CHARITY]: 'Donations & Charity',
  [CategorySubtype.TAXES]: 'Taxes',
  [CategorySubtype.MISC]: 'Miscellaneous'
};
