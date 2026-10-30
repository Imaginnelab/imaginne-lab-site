// Generated from the connected Supabase project after product_colors_locale.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      cor: {
        Row: {
          hex: string | null
          id: string
          locale: string
          name: string
          product_id: string
          sort_order: number
        }
        Insert: {
          hex?: string | null
          id?: string
          locale: string
          name: string
          product_id: string
          sort_order: number
        }
        Update: {
          hex?: string | null
          id?: string
          locale?: string
          name?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "cor_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          amount_off_cad_cents: number | null
          code: string
          created_at: string
          created_by: string | null
          discount_type: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          percent_off: number | null
          starts_at: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          amount_off_cad_cents?: number | null
          code: string
          created_at?: string
          created_by?: string | null
          discount_type: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          percent_off?: number | null
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          amount_off_cad_cents?: number | null
          code?: string
          created_at?: string
          created_by?: string | null
          discount_type?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          percent_off?: number | null
          starts_at?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          care_en: string
          care_es: string
          care_pt: string
          category_en: string
          category_es: string
          category_pt: string
          created_at: string
          created_by: string | null
          depth_cm: number | null
          description_en: string
          description_es: string
          description_pt: string
          extra_image_paths: string[]
          finish_en: string
          finish_es: string
          finish_pt: string
          height_cm: number | null
          id: string
          image_path: string
          is_active: boolean
          material_en: string
          material_es: string
          material_pt: string
          model_bytes: number | null
          model_path: string | null
          name_en: string
          name_es: string
          name_pt: string
          price_cad_cents: number | null
          sort_order: number
          stock_quantity: number | null
          updated_at: string
          view_count: number
          weight_g: number | null
          width_cm: number | null
        }
        Insert: {
          care_en?: string
          care_es?: string
          care_pt?: string
          category_en?: string
          category_es?: string
          category_pt?: string
          created_at?: string
          created_by?: string | null
          depth_cm?: number | null
          description_en: string
          description_es: string
          description_pt: string
          extra_image_paths?: string[]
          finish_en?: string
          finish_es?: string
          finish_pt?: string
          height_cm?: number | null
          id?: string
          image_path: string
          is_active?: boolean
          material_en?: string
          material_es?: string
          material_pt?: string
          model_bytes?: number | null
          model_path?: string | null
          name_en: string
          name_es: string
          name_pt: string
          price_cad_cents?: number | null
          sort_order?: number
          stock_quantity?: number | null
          updated_at?: string
          view_count?: number
          weight_g?: number | null
          width_cm?: number | null
        }
        Update: {
          care_en?: string
          care_es?: string
          care_pt?: string
          category_en?: string
          category_es?: string
          category_pt?: string
          created_at?: string
          created_by?: string | null
          depth_cm?: number | null
          description_en?: string
          description_es?: string
          description_pt?: string
          extra_image_paths?: string[]
          finish_en?: string
          finish_es?: string
          finish_pt?: string
          height_cm?: number | null
          id?: string
          image_path?: string
          is_active?: boolean
          material_en?: string
          material_es?: string
          material_pt?: string
          model_bytes?: number | null
          model_path?: string | null
          name_en?: string
          name_es?: string
          name_pt?: string
          price_cad_cents?: number | null
          sort_order?: number
          stock_quantity?: number | null
          updated_at?: string
          view_count?: number
          weight_g?: number | null
          width_cm?: number | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: boolean
          maintenance_mode: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          maintenance_mode?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          maintenance_mode?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      products_valid_extra_paths: {
        Args: { paths: string[] }
        Returns: boolean
      }
      save_product_with_colors: {
        Args: { p_colors: Json; p_id: string; p_product: Json }
        Returns: string
      }
      track_product_view: { Args: { product_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
