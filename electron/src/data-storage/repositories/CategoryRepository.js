"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryRepository = void 0;
const BaseRepository_1 = require("./BaseRepository");
class CategoryRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super('categories');
    }
    mapToEntity(row) {
        return {
            category_id: row.category_id,
            name: row.name,
            type: row.type,
            parent_category_id: row.parent_category_id,
            icon: row.icon,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }
    /**
     * Get categories by type (income or expense)
     */
    getCategoriesByType(type) {
        return this.findBy('type', type);
    }
    /**
     * Get parent categories (those with no parent_category_id)
     */
    getParentCategories() {
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
    getSubcategories(parentId) {
        return this.findBy('parent_category_id', parentId);
    }
    /**
     * Get category with its subcategories
     */
    getCategoryTree(categoryId) {
        const parent = this.getById(categoryId);
        if (!parent)
            return null;
        const subcategories = this.getSubcategories(categoryId);
        return { parent, subcategories };
    }
    /**
     * Get all categories as a hierarchical tree
     */
    getCategoryHierarchy() {
        const parents = this.getParentCategories();
        const result = {};
        for (const parent of parents) {
            if (parent.category_id) {
                const subcategories = this.getSubcategories(parent.category_id);
                result[parent.category_id] = { category: parent, subcategories };
            }
        }
        return result;
    }
}
exports.CategoryRepository = CategoryRepository;
