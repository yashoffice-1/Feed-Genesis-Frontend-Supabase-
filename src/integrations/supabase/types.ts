export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_value: string
          provider: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_value: string
          provider: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key_value?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_library: {
        Row: {
          asset_type: string
          asset_url: string
          content: string | null
          created_at: string
          description: string | null
          favorited: boolean | null
          gif_url: string | null
          id: string
          instruction: string
          original_asset_id: string | null
          source_system: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          asset_type: string
          asset_url: string
          content?: string | null
          created_at?: string
          description?: string | null
          favorited?: boolean | null
          gif_url?: string | null
          id?: string
          instruction: string
          original_asset_id?: string | null
          source_system: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          asset_url?: string
          content?: string | null
          created_at?: string
          description?: string | null
          favorited?: boolean | null
          gif_url?: string | null
          id?: string
          instruction?: string
          original_asset_id?: string | null
          source_system?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_library_original_asset_id_fkey"
            columns: ["original_asset_id"]
            isOneToOne: false
            referencedRelation: "generated_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      client_configs: {
        Row: {
          client_id: string
          client_name: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          client_name: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          client_name?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      client_template_assignments: {
        Row: {
          assigned_at: string | null
          client_config_id: string | null
          id: string
          is_active: boolean | null
          template_id: string
          template_name: string | null
        }
        Insert: {
          assigned_at?: string | null
          client_config_id?: string | null
          id?: string
          is_active?: boolean | null
          template_id: string
          template_name?: string | null
        }
        Update: {
          assigned_at?: string | null
          client_config_id?: string | null
          id?: string
          is_active?: boolean | null
          template_id?: string
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_template_assignments_client_config_id_fkey"
            columns: ["client_config_id"]
            isOneToOne: false
            referencedRelation: "client_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_assets: {
        Row: {
          approved: boolean | null
          asset_type: string
          channel: string
          created_at: string
          format: string
          id: string
          instruction: string | null
          inventory_id: string | null
          source_system: string
          updated_at: string
          url: string
        }
        Insert: {
          approved?: boolean | null
          asset_type: string
          channel: string
          created_at?: string
          format: string
          id?: string
          instruction?: string | null
          inventory_id?: string | null
          source_system: string
          updated_at?: string
          url: string
        }
        Update: {
          approved?: boolean | null
          asset_type?: string
          channel?: string
          created_at?: string
          format?: string
          id?: string
          instruction?: string | null
          inventory_id?: string | null
          source_system?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          images: string[]
          metadata: Json | null
          name: string
          price: number | null
          sku: string | null
          status: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          metadata?: Json | null
          name: string
          price?: number | null
          sku?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          metadata?: Json | null
          name?: string
          price?: number | null
          sku?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      template_fallback_variables: {
        Row: {
          created_at: string | null
          id: string
          template_id: string
          variable_name: string
          variable_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          template_id: string
          variable_name: string
          variable_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          template_id?: string
          variable_name?: string
          variable_order?: number | null
        }
        Relationships: []
      }
      user_social_connections: {
        Row: {
          access_token: string | null
          connected_at: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          platform: string
          platform_display_name: string | null
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          scope: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          platform: string
          platform_display_name?: string | null
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          platform?: string
          platform_display_name?: string | null
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
