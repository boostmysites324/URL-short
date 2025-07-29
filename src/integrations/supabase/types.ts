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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      analytics_daily: {
        Row: {
          created_at: string | null
          date: string
          id: string
          link_id: string
          total_clicks: number | null
          unique_clicks: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          link_id: string
          total_clicks?: number | null
          unique_clicks?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          link_id?: string
          total_clicks?: number | null
          unique_clicks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      clicks: {
        Row: {
          browser_type: Database["public"]["Enums"]["browser_type"] | null
          browser_version: string | null
          city: string | null
          clicked_at: string | null
          country: string | null
          country_name: string | null
          device_type: Database["public"]["Enums"]["device_type"] | null
          fingerprint: string | null
          id: string
          ip_address: unknown | null
          is_unique: boolean | null
          language: string | null
          latitude: number | null
          link_id: string
          longitude: number | null
          os_type: Database["public"]["Enums"]["os_type"] | null
          os_version: string | null
          referer: string | null
          region: string | null
          user_agent: string | null
        }
        Insert: {
          browser_type?: Database["public"]["Enums"]["browser_type"] | null
          browser_version?: string | null
          city?: string | null
          clicked_at?: string | null
          country?: string | null
          country_name?: string | null
          device_type?: Database["public"]["Enums"]["device_type"] | null
          fingerprint?: string | null
          id?: string
          ip_address?: unknown | null
          is_unique?: boolean | null
          language?: string | null
          latitude?: number | null
          link_id: string
          longitude?: number | null
          os_type?: Database["public"]["Enums"]["os_type"] | null
          os_version?: string | null
          referer?: string | null
          region?: string | null
          user_agent?: string | null
        }
        Update: {
          browser_type?: Database["public"]["Enums"]["browser_type"] | null
          browser_version?: string | null
          city?: string | null
          clicked_at?: string | null
          country?: string | null
          country_name?: string | null
          device_type?: Database["public"]["Enums"]["device_type"] | null
          fingerprint?: string | null
          id?: string
          ip_address?: unknown | null
          is_unique?: boolean | null
          language?: string | null
          latitude?: number | null
          link_id?: string
          longitude?: number | null
          os_type?: Database["public"]["Enums"]["os_type"] | null
          os_version?: string | null
          referer?: string | null
          region?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      links: {
        Row: {
          analytics_enabled: boolean | null
          created_at: string | null
          custom_domain: string | null
          description: string | null
          expires_at: string | null
          id: string
          original_url: string
          password_hash: string | null
          short_code: string
          short_url: string
          status: Database["public"]["Enums"]["link_status"] | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          analytics_enabled?: boolean | null
          created_at?: string | null
          custom_domain?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          original_url: string
          password_hash?: string | null
          short_code: string
          short_url: string
          status?: Database["public"]["Enums"]["link_status"] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          analytics_enabled?: boolean | null
          created_at?: string | null
          custom_domain?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          original_url?: string
          password_hash?: string | null
          short_code?: string
          short_url?: string
          status?: Database["public"]["Enums"]["link_status"] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_short_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      browser_type:
        | "chrome"
        | "firefox"
        | "safari"
        | "edge"
        | "opera"
        | "whatsapp"
        | "telegram"
        | "other"
      device_type: "desktop" | "mobile" | "tablet" | "unknown"
      link_status: "active" | "inactive" | "expired"
      os_type: "windows" | "macos" | "linux" | "android" | "ios" | "other"
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
    Enums: {
      browser_type: [
        "chrome",
        "firefox",
        "safari",
        "edge",
        "opera",
        "whatsapp",
        "telegram",
        "other",
      ],
      device_type: ["desktop", "mobile", "tablet", "unknown"],
      link_status: ["active", "inactive", "expired"],
      os_type: ["windows", "macos", "linux", "android", "ios", "other"],
    },
  },
} as const
