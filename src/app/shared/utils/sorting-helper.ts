/**
 * Utility class to help with sorting tables consistently
 * This ensures sorting works correctly with nested properties
 */
export class SortingHelper {
  
  /**
   * Creates a sorting accessor for Material tables
   * Usage: dataSource.sortingDataAccessor = SortingHelper.createSortingDataAccessor(sortingConfig);
   * 
   * @param config Map of column ids to property paths or accessor functions
   * @returns A sorting data accessor function
   */
  static createSortingDataAccessor<T>(config: Map<string, string | ((item: T) => any)>): (item: T, columnId: string) => string | number {
    return (item: T, columnId: string): string | number => {
      // Get the property path or accessor function from config
      const accessor = config.get(columnId);
      
      // If no config for this column, try to access it directly
      if (!accessor) {
        return this.getSafeProperty(item, columnId);
      }
      
      // If accessor is a function, call it
      if (typeof accessor === 'function') {
        return accessor(item);
      }
      
      // Otherwise treat it as a property path
      return this.getSafeProperty(item, accessor);
    };
  }
  
  /**
   * Gets a property safely by path
   * Handles nested properties like 'person.grunddaten.nachname'
   */
  private static getSafeProperty(item: any, path: string): string | number {
    if (!item) return '';
    
    const properties = path.split('.');
    let value = item;
    
    for (const prop of properties) {
      if (value === null || value === undefined) {
        return '';
      }
      value = value[prop];
    }
    
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'string') {
      return value.toLowerCase(); // For case-insensitive sorting
    }
    
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    
    // For dates
    if (value instanceof Date) {
      return value.getTime();
    }
    
    // For Firestore timestamps
    if (value && typeof value.toDate === 'function') {
      return value.toDate().getTime();
    }
    
    return String(value).toLowerCase();
  }
}
