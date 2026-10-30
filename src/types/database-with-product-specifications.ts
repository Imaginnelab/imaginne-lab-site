import type { Database as GeneratedDatabase } from './database';

// The generator omits SQL argument nullability. This invoker RPC explicitly accepts
// p_id = null to create a product; the remaining schema comes from the generated snapshot.
type Save = GeneratedDatabase['public']['Functions']['save_product_with_colors'];
export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GeneratedDatabase['public'], 'Functions'> & {
    Functions: Omit<GeneratedDatabase['public']['Functions'], 'save_product_with_colors'> & {
      save_product_with_colors: Omit<Save, 'Args'> & { Args: Omit<Save['Args'], 'p_id'> & { p_id: string | null } };
    };
  };
};
