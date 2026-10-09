// Generated from the Supabase project (generate_typescript_types). Regenerate after every
// migration instead of editing by hand; only the unused generic helpers were left out.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Lets createClient pick the right PostgREST options automatically.
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      coupons: {
        Row: {
          amount_off_cad_cents: number | null;
          code: string;
          created_at: string;
          created_by: string | null;
          discount_type: string;
          expires_at: string | null;
          id: string;
          is_active: boolean;
          max_uses: number | null;
          percent_off: number | null;
          starts_at: string | null;
          updated_at: string;
          used_count: number;
        };
        Insert: {
          amount_off_cad_cents?: number | null;
          code: string;
          created_at?: string;
          created_by?: string | null;
          discount_type: string;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
          percent_off?: number | null;
          starts_at?: string | null;
          updated_at?: string;
          used_count?: number;
        };
        Update: {
          amount_off_cad_cents?: number | null;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          discount_type?: string;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
          percent_off?: number | null;
          starts_at?: string | null;
          updated_at?: string;
          used_count?: number;
        };
        Relationships: [];
      };
      products: {
        Row: {
          created_at: string;
          created_by: string | null;
          description_en: string;
          description_es: string;
          description_pt: string;
          extra_image_paths: string[];
          id: string;
          image_path: string;
          is_active: boolean;
          model_bytes: number | null;
          model_path: string | null;
          name_en: string;
          name_es: string;
          name_pt: string;
          price_cad_cents: number | null;
          sort_order: number;
          updated_at: string;
          view_count: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description_en: string;
          description_es: string;
          description_pt: string;
          extra_image_paths?: string[];
          id?: string;
          image_path: string;
          is_active?: boolean;
          model_bytes?: number | null;
          model_path?: string | null;
          name_en: string;
          name_es: string;
          name_pt: string;
          price_cad_cents?: number | null;
          sort_order?: number;
          updated_at?: string;
          view_count?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description_en?: string;
          description_es?: string;
          description_pt?: string;
          extra_image_paths?: string[];
          id?: string;
          image_path?: string;
          is_active?: boolean;
          model_bytes?: number | null;
          model_path?: string | null;
          name_en?: string;
          name_es?: string;
          name_pt?: string;
          price_cad_cents?: number | null;
          sort_order?: number;
          updated_at?: string;
          view_count?: number;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          id: boolean;
          maintenance_mode: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: boolean;
          maintenance_mode?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: boolean;
          maintenance_mode?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          is_admin: boolean;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          is_admin?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          is_admin?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: { Args: never; Returns: boolean };
      products_valid_extra_paths: { Args: { paths: string[] }; Returns: boolean };
      track_product_view: { Args: { product_id: string }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<Name extends keyof Database['public']['Tables']> = Database['public']['Tables'][Name]['Row'];
export type TablesInsert<Name extends keyof Database['public']['Tables']> = Database['public']['Tables'][Name]['Insert'];
export type TablesUpdate<Name extends keyof Database['public']['Tables']> = Database['public']['Tables'][Name]['Update'];
