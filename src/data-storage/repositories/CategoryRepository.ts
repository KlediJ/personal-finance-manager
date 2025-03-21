import { BaseRepository } from './BaseRepository';
import { Category, CategoryType } from '../models/Category';

export class CategoryRepository extends BaseRepository<Category> {
  constructor() {
    super('categories');
  }
  
  protected mapToEntity(row: any): Category {
    return {
      category_id: row.category_id,
      name: row.name,
      type: row.type as CategoryType,
      parent_category_id: row.parent_category_id,
      icon: row.icon,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  
  /**
   * Get categories by type (income or expense)
   */
  public getCategoriesByType(type: CategoryType): Category[] {
    return this.findBy('type', type);
  }
  
  /**
   * Get parent categories (those with no parent_category_id)
   */
  public getParentCategories(): Category[] {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE parent_category_id IS NULL
      ORDER BY name
    `;
    return this.runQuery(query);
  }
  
  /**
   * Get subcategories for a specific parent category
   */
  public getSubcategories(parentId: number): Category[] {
    return this.findBy('parent_category_id', parentId);
  }
  
  /**
   * Get category with its subcategories
   */
  public getCategoryTree(categoryId: number): {parent: Category, subcategories: Category[]} | null {
    const parent = this.getById(categoryId);
    if (!parent) return null;
    
    const subcategories = this.getSubcategories(categoryId);
    return { parent, subcategories };
  }
  
  /**
   * Get all categories as a hierarchical tree
   */
  public getCategoryHierarchy(): {[key: number]: {category: Category, subcategories: Category[]}} {
    const parents = this.getParentCategories();
    const result: {[key: number]: {category: Category, subcategories: Category[]}} = {};
    
    for (const parent of parents) {
      if (parent.category_id) {
        const subcategories = this.getSubcategories(parent.category_id);
        result[parent.category_id] = { category: parent, subcategories };
      }
    }
    
    return result;
  }
}
