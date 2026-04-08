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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      automations: {
        Row: {
          id: string
          name: string
          workflow_id: string
          active: boolean
          interval: number
          rss_feeds: string[]
          keywords: string[]
          prompt: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          workflow_id: string
          active?: boolean
          interval?: number
          rss_feeds?: string[]
          keywords?: string[]
          prompt?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          workflow_id?: string
          active?: boolean
          interval?: number
          rss_feeds?: string[]
          keywords?: string[]
          prompt?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string | null
          author_name: string
          category_id: string | null
          content: string
          created_at: string
          excerpt: string
          featured: boolean
          id: string
          image_url: string | null
          published_at: string | null
          read_time: string
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          category_id?: string | null
          content: string
          created_at?: string
          excerpt: string
          featured?: boolean
          id?: string
          image_url?: string | null
          published_at?: string | null
          read_time?: string
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          published_at?: string | null
          read_time?: string
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
        }
        Relationships: []
      }
      registration_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_at: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          status: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          status?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          status?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      content_versions: {
        Row: {
          author_id: string | null
          changes_description: string | null
          content: string | null
          content_id: string
          content_type: string
          created_at: string
          excerpt: string | null
          id: string
          title: string | null
          version_number: number
        }
        Insert: {
          author_id?: string | null
          changes_description?: string | null
          content?: string | null
          content_id: string
          content_type: string
          created_at?: string
          excerpt?: string | null
          id?: string
          title?: string | null
          version_number: number
        }
        Update: {
          author_id?: string | null
          changes_description?: string | null
          content?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          title?: string | null
          version_number?: number
        }
        Relationships: []
      }
      courses: {
        Row: {
          category_id: string | null
          created_at: string
          description: string
          duration: string | null
          id: string
          instructor: string | null
          level: string
          published_at: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description: string
          duration?: string | null
          id?: string
          instructor?: string | null
          level: string
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          duration?: string | null
          id?: string
          instructor?: string | null
          level?: string
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      podcasts: {
        Row: {
          audio_url: string | null
          author_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          downloads: number
          duration: number | null
          id: string
          post_id: string | null
          published_at: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          transcript: string | null
          updated_at: string
          views: number
        }
        Insert: {
          audio_url?: string | null
          author_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          downloads?: number
          duration?: number | null
          id?: string
          post_id?: string | null
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          transcript?: string | null
          updated_at?: string
          views?: number
        }
        Update: {
          audio_url?: string | null
          author_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          downloads?: number
          duration?: number | null
          id?: string
          post_id?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          transcript?: string | null
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "podcasts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcasts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          reason: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      security_codes: {
        Row: {
          id: string
          email: string
          code: string
          type: string
          used: boolean
          attempts: number
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          code: string
          type?: string
          used?: boolean
          attempts?: number
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          code?: string
          type?: string
          used?: boolean
          attempts?: number
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          is_public: boolean | null
          linkedin_url: string | null
          role: string | null
          twitter_handle: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_public?: boolean | null
          linkedin_url?: string | null
          role?: string | null
          twitter_handle?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_public?: boolean | null
          linkedin_url?: string | null
          role?: string | null
          twitter_handle?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      /* ── Automation Engine v2 tables ── */
      automations_v2: {
        Row: {
          id: string
          name: string
          description: string
          category: string
          trigger_type: string
          workflow_id: string | null
          status: string
          interval_minutes: number
          cron_expression: string | null
          config: Json
          last_run_at: string | null
          last_run_status: string | null
          next_run_at: string | null
          run_count: number
          error_count: number
          success_rate: number
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          category: string
          trigger_type?: string
          workflow_id?: string | null
          status?: string
          interval_minutes?: number
          cron_expression?: string | null
          config?: Json
          last_run_at?: string | null
          last_run_status?: string | null
          next_run_at?: string | null
          run_count?: number
          error_count?: number
          success_rate?: number
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          category?: string
          trigger_type?: string
          workflow_id?: string | null
          status?: string
          interval_minutes?: number
          cron_expression?: string | null
          config?: Json
          last_run_at?: string | null
          last_run_status?: string | null
          next_run_at?: string | null
          run_count?: number
          error_count?: number
          success_rate?: number
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_executions: {
        Row: {
          id: string
          automation_id: string | null
          n8n_execution_id: string | null
          status: string
          trigger_mode: string
          triggered_by: string | null
          started_at: string
          finished_at: string | null
          duration_ms: number | null
          steps: Json
          error_message: string | null
          error_detail: Json | null
          items_processed: number
          items_created: number
          metadata: Json
        }
        Insert: {
          id?: string
          automation_id?: string | null
          n8n_execution_id?: string | null
          status?: string
          trigger_mode: string
          triggered_by?: string | null
          started_at?: string
          finished_at?: string | null
          duration_ms?: number | null
          steps?: Json
          error_message?: string | null
          error_detail?: Json | null
          items_processed?: number
          items_created?: number
          metadata?: Json
        }
        Update: {
          id?: string
          automation_id?: string | null
          n8n_execution_id?: string | null
          status?: string
          trigger_mode?: string
          triggered_by?: string | null
          started_at?: string
          finished_at?: string | null
          duration_ms?: number | null
          steps?: Json
          error_message?: string | null
          error_detail?: Json | null
          items_processed?: number
          items_created?: number
          metadata?: Json
        }
        Relationships: []
      }
      automation_templates: {
        Row: {
          id: string
          name: string
          description: string
          category: string
          icon: string | null
          config_preset: Json
          workflow_json: Json | null
          is_system: boolean
          popularity: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          category: string
          icon?: string | null
          config_preset?: Json
          workflow_json?: Json | null
          is_system?: boolean
          popularity?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          category?: string
          icon?: string | null
          config_preset?: Json
          workflow_json?: Json | null
          is_system?: boolean
          popularity?: number
          created_at?: string
        }
        Relationships: []
      }
      automation_audit_log: {
        Row: {
          id: number
          automation_id: string | null
          action: string
          actor_id: string | null
          actor_email: string | null
          details: Json
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: number
          automation_id?: string | null
          action: string
          actor_id?: string | null
          actor_email?: string | null
          details?: Json
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          automation_id?: string | null
          action?: string
          actor_id?: string | null
          actor_email?: string | null
          details?: Json
          ip_address?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_first_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "editor"
        | "redator"
        | "moderador"
        | "analyst"
        | "moderator"
        | "user"
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
      app_role: ["super_admin", "admin", "editor", "redator", "moderador", "analyst", "moderator", "user"],
    },
  },
} as const
