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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      automation_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          automation_id: string | null
          created_at: string | null
          details: Json | null
          id: number
          ip_address: unknown
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          automation_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: number
          ip_address?: unknown
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          automation_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: number
          ip_address?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "automation_audit_log_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          automation_id: string | null
          duration_ms: number | null
          error_detail: Json | null
          error_message: string | null
          finished_at: string | null
          id: string
          items_created: number | null
          items_processed: number | null
          metadata: Json | null
          n8n_execution_id: string | null
          started_at: string | null
          status: string
          steps: Json | null
          trigger_mode: string
          triggered_by: string | null
        }
        Insert: {
          automation_id?: string | null
          duration_ms?: number | null
          error_detail?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          items_created?: number | null
          items_processed?: number | null
          metadata?: Json | null
          n8n_execution_id?: string | null
          started_at?: string | null
          status?: string
          steps?: Json | null
          trigger_mode: string
          triggered_by?: string | null
        }
        Update: {
          automation_id?: string | null
          duration_ms?: number | null
          error_detail?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          items_created?: number | null
          items_processed?: number | null
          metadata?: Json | null
          n8n_execution_id?: string | null
          started_at?: string | null
          status?: string
          steps?: Json | null
          trigger_mode?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_templates: {
        Row: {
          category: string
          config_preset: Json
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_system: boolean | null
          name: string
          popularity: number | null
          workflow_json: Json | null
        }
        Insert: {
          category: string
          config_preset?: Json
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          popularity?: number | null
          workflow_json?: Json | null
        }
        Update: {
          category?: string
          config_preset?: Json
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          popularity?: number | null
          workflow_json?: Json | null
        }
        Relationships: []
      }
      automations: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          interval: number
          keywords: string[]
          name: string
          prompt: string
          rss_feeds: string[]
          updated_at: string
          workflow_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          interval?: number
          keywords?: string[]
          name: string
          prompt?: string
          rss_feeds?: string[]
          updated_at?: string
          workflow_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          interval?: number
          keywords?: string[]
          name?: string
          prompt?: string
          rss_feeds?: string[]
          updated_at?: string
          workflow_id?: string
        }
        Relationships: []
      }
      automations_v2: {
        Row: {
          category: string
          config: Json
          created_at: string | null
          created_by: string | null
          cron_expression: string | null
          description: string | null
          error_count: number | null
          id: string
          interval_minutes: number | null
          last_run_at: string | null
          last_run_status: string | null
          name: string
          next_run_at: string | null
          run_count: number | null
          status: string
          success_rate: number | null
          trigger_type: string
          updated_at: string | null
          updated_by: string | null
          workflow_id: string | null
        }
        Insert: {
          category: string
          config?: Json
          created_at?: string | null
          created_by?: string | null
          cron_expression?: string | null
          description?: string | null
          error_count?: number | null
          id?: string
          interval_minutes?: number | null
          last_run_at?: string | null
          last_run_status?: string | null
          name: string
          next_run_at?: string | null
          run_count?: number | null
          status?: string
          success_rate?: number | null
          trigger_type?: string
          updated_at?: string | null
          updated_by?: string | null
          workflow_id?: string | null
        }
        Update: {
          category?: string
          config?: Json
          created_at?: string | null
          created_by?: string | null
          cron_expression?: string | null
          description?: string | null
          error_count?: number | null
          id?: string
          interval_minutes?: number | null
          last_run_at?: string | null
          last_run_status?: string | null
          name?: string
          next_run_at?: string | null
          run_count?: number | null
          status?: string
          success_rate?: number | null
          trigger_type?: string
          updated_at?: string | null
          updated_by?: string | null
          workflow_id?: string | null
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
      courses: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          duration: string
          id: string
          level: string
          published_at: string
          slug: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration?: string
          id?: string
          level?: string
          published_at?: string
          slug: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          duration?: string
          id?: string
          level?: string
          published_at?: string
          slug?: string
          status?: string
          thumbnail_url?: string | null
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
      curated_posts: {
        Row: {
          body_html: string | null
          body_markdown: string
          cluster_id: string | null
          confidence_score: number
          created_at: string
          created_by: string | null
          editorial_score: number
          excerpt: string | null
          id: string
          language: string | null
          metrics: Json
          model_info: Json
          moderation: Json
          slug: string | null
          status: string
          subtitle: string | null
          title: string
          tone_profile: string | null
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          body_markdown: string
          cluster_id?: string | null
          confidence_score?: number
          created_at?: string
          created_by?: string | null
          editorial_score?: number
          excerpt?: string | null
          id?: string
          language?: string | null
          metrics?: Json
          model_info?: Json
          moderation?: Json
          slug?: string | null
          status?: string
          subtitle?: string | null
          title: string
          tone_profile?: string | null
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          body_markdown?: string
          cluster_id?: string | null
          confidence_score?: number
          created_at?: string
          created_by?: string | null
          editorial_score?: number
          excerpt?: string | null
          id?: string
          language?: string | null
          metrics?: Json
          model_info?: Json
          moderation?: Json
          slug?: string | null
          status?: string
          subtitle?: string | null
          title?: string
          tone_profile?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curated_posts_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "news_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_feedback: {
        Row: {
          created_at: string
          curated_post_id: string
          decision: string
          id: string
          notes: string | null
          payload: Json
          reviewer_id: string | null
        }
        Insert: {
          created_at?: string
          curated_post_id: string
          decision: string
          id?: string
          notes?: string | null
          payload?: Json
          reviewer_id?: string | null
        }
        Update: {
          created_at?: string
          curated_post_id?: string
          decision?: string
          id?: string
          notes?: string | null
          payload?: Json
          reviewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editorial_feedback_curated_post_id_fkey"
            columns: ["curated_post_id"]
            isOneToOne: false
            referencedRelation: "curated_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_credentials: {
        Row: {
          activated_at: string | null
          created_at: string
          created_by: string | null
          encrypted_value: string
          expires_at: string
          id: string
          key_name: string
          last_reminder_sent_at: string | null
          notes: string | null
          remind_days_before: number
          reminder_email: string | null
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          created_by?: string | null
          encrypted_value: string
          expires_at: string
          id?: string
          key_name: string
          last_reminder_sent_at?: string | null
          notes?: string | null
          remind_days_before?: number
          reminder_email?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          created_by?: string | null
          encrypted_value?: string
          expires_at?: string
          id?: string
          key_name?: string
          last_reminder_sent_at?: string | null
          notes?: string | null
          remind_days_before?: number
          reminder_email?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      news_clusters: {
        Row: {
          confidence_score: number
          created_at: string
          entities: Json
          fingerprint: string
          id: string
          primary_staging_id: string | null
          source_count: number
          topic: string | null
          updated_at: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          entities?: Json
          fingerprint: string
          id?: string
          primary_staging_id?: string | null
          source_count?: number
          topic?: string | null
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          entities?: Json
          fingerprint?: string
          id?: string
          primary_staging_id?: string | null
          source_count?: number
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_clusters_primary_staging_id_fkey"
            columns: ["primary_staging_id"]
            isOneToOne: false
            referencedRelation: "news_staging"
            referencedColumns: ["id"]
          },
        ]
      }
      news_staging: {
        Row: {
          canonical_url: string | null
          collected_at: string
          content: string | null
          created_at: string
          duplicate_fingerprint: string | null
          id: string
          language: string | null
          metadata: Json
          processed: boolean
          published_at: string | null
          source_name: string
          source_url: string
          summary: string | null
          title: string
          topic: string | null
          trust_score: number | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          collected_at?: string
          content?: string | null
          created_at?: string
          duplicate_fingerprint?: string | null
          id?: string
          language?: string | null
          metadata?: Json
          processed?: boolean
          published_at?: string | null
          source_name: string
          source_url: string
          summary?: string | null
          title: string
          topic?: string | null
          trust_score?: number | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          collected_at?: string
          content?: string | null
          created_at?: string
          duplicate_fingerprint?: string | null
          id?: string
          language?: string | null
          metadata?: Json
          processed?: boolean
          published_at?: string | null
          source_name?: string
          source_url?: string
          summary?: string | null
          title?: string
          topic?: string | null
          trust_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          subscribed_at: string
          updated_at: string
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      permission_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          permissions?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      permission_overrides: {
        Row: {
          action: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          feature: string
          granted: boolean
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          feature: string
          granted?: boolean
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          feature?: string
          granted?: boolean
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      permissions_matrix: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          permissions: Json
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          permissions?: Json
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      pipeline_search_config: {
        Row: {
          created_at: string
          created_by: string | null
          default_post_tags: string[]
          id: string
          is_active: boolean
          label: string
          language: string | null
          region: string | null
          tags: string[]
          theme_rules: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_post_tags?: string[]
          id?: string
          is_active?: boolean
          label: string
          language?: string | null
          region?: string | null
          tags?: string[]
          theme_rules?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_post_tags?: string[]
          id?: string
          is_active?: boolean
          label?: string
          language?: string | null
          region?: string | null
          tags?: string[]
          theme_rules?: Json
          updated_at?: string
        }
        Relationships: []
      }
      podcasts: {
        Row: {
          audio_url: string | null
          author_id: string | null
          category_id: string | null
          cover_url: string | null
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
          cover_url?: string | null
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
          cover_url?: string | null
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
      posting_queue: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          curated_post_id: string
          id: string
          last_error: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel?: string
          created_at?: string
          curated_post_id: string
          id?: string
          last_error?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          curated_post_id?: string
          id?: string
          last_error?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posting_queue_curated_post_id_fkey"
            columns: ["curated_post_id"]
            isOneToOne: false
            referencedRelation: "curated_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          author_name: string
          banner_url: string | null
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
          banner_url?: string | null
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
          banner_url?: string | null
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
      role_assignment_history: {
        Row: {
          action: string
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          new_state: Json | null
          previous_state: Json | null
          role: Database["public"]["Enums"]["app_role"]
          role_assignment_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_state?: Json | null
          previous_state?: Json | null
          role: Database["public"]["Enums"]["app_role"]
          role_assignment_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_state?: Json | null
          previous_state?: Json | null
          role?: Database["public"]["Enums"]["app_role"]
          role_assignment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_assignment_history_role_assignment_id_fkey"
            columns: ["role_assignment_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_assignment_templates: {
        Row: {
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          roles: Database["public"]["Enums"]["app_role"][]
          updated_at: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          roles: Database["public"]["Enums"]["app_role"][]
          updated_at?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          roles?: Database["public"]["Enums"]["app_role"][]
          updated_at?: string | null
        }
        Relationships: []
      }
      role_assignments_audit: {
        Row: {
          action: string
          assigned_by: string | null
          created_at: string | null
          id: string
          reason: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          action: string
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          action?: string
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      role_bulk_assignments: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string
          error_details: Json | null
          failed_users: number | null
          id: string
          name: string
          processed_users: number | null
          roles: Database["public"]["Enums"]["app_role"][]
          status: string | null
          template_id: string | null
          total_users: number | null
          user_ids: string[]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          error_details?: Json | null
          failed_users?: number | null
          id?: string
          name: string
          processed_users?: number | null
          roles: Database["public"]["Enums"]["app_role"][]
          status?: string | null
          template_id?: string | null
          total_users?: number | null
          user_ids: string[]
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          error_details?: Json | null
          failed_users?: number | null
          id?: string
          name?: string
          processed_users?: number | null
          roles?: Database["public"]["Enums"]["app_role"][]
          status?: string | null
          template_id?: string | null
          total_users?: number | null
          user_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "role_bulk_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "role_assignment_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      role_hierarchy: {
        Row: {
          child_role: Database["public"]["Enums"]["app_role"]
          created_at: string | null
          id: string
          parent_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          child_role: Database["public"]["Enums"]["app_role"]
          created_at?: string | null
          id?: string
          parent_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          child_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string | null
          id?: string
          parent_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      security_codes: {
        Row: {
          attempts: number
          blocked_until: string | null
          code: string
          created_at: string
          device_fingerprint: string | null
          email: string
          expires_at: string
          id: string
          request_ip: string | null
          type: string
          used: boolean
          user_agent: string | null
        }
        Insert: {
          attempts?: number
          blocked_until?: string | null
          code: string
          created_at?: string
          device_fingerprint?: string | null
          email: string
          expires_at: string
          id?: string
          request_ip?: string | null
          type?: string
          used?: boolean
          user_agent?: string | null
        }
        Update: {
          attempts?: number
          blocked_until?: string | null
          code?: string
          created_at?: string
          device_fingerprint?: string | null
          email?: string
          expires_at?: string
          id?: string
          request_ip?: string | null
          type?: string
          used?: boolean
          user_agent?: string | null
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
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          reason: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      permission_data_quality: {
        Row: {
          count: number | null
          issue_type: string | null
        }
        Relationships: []
      }
      role_consistency_report: {
        Row: {
          active_users: number | null
          assigned_users: number | null
          description: string | null
          feature: string | null
          last_assigned: string | null
          last_updated: string | null
          role: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      change_user_role: {
        Args: {
          _user_id: string
          _old_role: Database["public"]["Enums"]["app_role"]
          _new_role: Database["public"]["Enums"]["app_role"]
          _reason?: string
        }
        Returns: boolean
      }
      deactivate_team_member: {
        Args: {
          _user_id: string
          _reason?: string
        }
        Returns: boolean
      }
      get_team_members: {
        Args: Record<string, never>
        Returns: {
          assignment_id: string
          user_id: string
          email: string
          full_name: string
          avatar_url: string | null
          role: Database["public"]["Enums"]["app_role"]
          is_active: boolean
          assigned_at: string | null
          expires_at: string | null
          reason: string | null
        }[]
      }
      reactivate_team_member: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _reason?: string
        }
        Returns: boolean
      }
      assign_role_with_audit: {
        Args: {
          _reason?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      assign_roles_to_users: {
        Args: {
          _reason?: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_ids: string[]
        }
        Returns: {
          assigned_count: number
          details: Json
          failed_count: number
          success: boolean
        }[]
      }
      bootstrap_first_admin: { Args: never; Returns: boolean }
      check_permissions_integrity: {
        Args: never
        Returns: {
          check_name: string
          details: string
          status: string
        }[]
      }
      cleanup_expired_roles_on_schedule: { Args: never; Returns: undefined }
      deactivate_expired_roles: {
        Args: never
        Returns: {
          deactivated_count: number
        }[]
      }
      get_effective_permissions: { Args: { _user_id: string }; Returns: Json }
      get_permission_access_logs: {
        Args: { _days?: number }
        Returns: {
          action: string
          date: string
          failure_count: number
          feature: string
          success_count: number
          user_count: number
        }[]
      }
      get_role_assignment_stats: {
        Args: { _days?: number }
        Returns: {
          active_users: number
          new_assignments: number
          revoked_assignments: number
          role: Database["public"]["Enums"]["app_role"]
          total_assignments: number
        }[]
      }
      get_user_active_roles: {
        Args: { _user_id: string }
        Returns: {
          assigned_at: string
          expires_at: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_user_permissions: { Args: { _user_id: string }; Returns: Json }
      has_all_roles: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: { _action: string; _feature: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_action: {
        Args: {
          p_action: string
          p_error_message?: string
          p_new_values?: Json
          p_old_values?: Json
          p_record_id?: string
          p_status?: string
          p_table_name?: string
        }
        Returns: undefined
      }
      revoke_role_with_audit: {
        Args: {
          _reason?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_permission_structure: {
        Args: { _permissions: Json }
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
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
      app_role: [
        "super_admin",
        "admin",
        "editor",
        "redator",
        "moderador",
        "analyst",
        "moderator",
        "user",
      ],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
