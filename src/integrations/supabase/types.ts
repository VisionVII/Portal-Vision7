export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean
          source: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          source?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          source?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_user_preferences: {
        Row: {
          created_at: string | null
          id: string
          interaction_count: number | null
          last_questions: string[] | null
          preferred_categories: string[] | null
          preferred_topics: string[] | null
          updated_at: string | null
          user_fingerprint: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_count?: number | null
          last_questions?: string[] | null
          preferred_categories?: string[] | null
          preferred_topics?: string[] | null
          updated_at?: string | null
          user_fingerprint: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_count?: number | null
          last_questions?: string[] | null
          preferred_categories?: string[] | null
          preferred_topics?: string[] | null
          updated_at?: string | null
          user_fingerprint?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      article_link_graph: {
        Row: {
          anchor_text: string | null
          created_at: string | null
          href: string
          id: string
          locked_at: string | null
          resolved_at: string | null
          source_curated_id: string | null
          source_post_id: string | null
          status: string
          target_post_id: string | null
          target_slug: string
        }
        Insert: {
          anchor_text?: string | null
          created_at?: string | null
          href: string
          id?: string
          locked_at?: string | null
          resolved_at?: string | null
          source_curated_id?: string | null
          source_post_id?: string | null
          status?: string
          target_post_id?: string | null
          target_slug: string
        }
        Update: {
          anchor_text?: string | null
          created_at?: string | null
          href?: string
          id?: string
          locked_at?: string | null
          resolved_at?: string | null
          source_curated_id?: string | null
          source_post_id?: string | null
          status?: string
          target_post_id?: string | null
          target_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_link_graph_source_curated_id_fkey"
            columns: ["source_curated_id"]
            isOneToOne: false
            referencedRelation: "curated_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_link_graph_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_link_graph_target_post_id_fkey"
            columns: ["target_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
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
      cmp_consent_records: {
        Row: {
          consent: Json
          created_at: string
          domain: string
          id: string
          ip_hash: string | null
          method: string
          policy_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent: Json
          created_at?: string
          domain?: string
          id?: string
          ip_hash?: string | null
          method?: string
          policy_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          consent?: Json
          created_at?: string
          domain?: string
          id?: string
          ip_hash?: string | null
          method?: string
          policy_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cmp_consent_domain"
            columns: ["domain"]
            isOneToOne: false
            referencedRelation: "cmp_domains"
            referencedColumns: ["domain"]
          },
        ]
      }
      cmp_domains: {
        Row: {
          created_at: string
          display_name: string | null
          domain: string
          id: string
          is_active: boolean
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          domain: string
          id?: string
          is_active?: boolean
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          domain?: string
          id?: string
          is_active?: boolean
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      cmp_policy_versions: {
        Row: {
          categories: string[]
          changelog: string | null
          created_at: string
          default_consent: Json
          domain_id: string | null
          effective_date: string
          id: string
          version: string
        }
        Insert: {
          categories?: string[]
          changelog?: string | null
          created_at?: string
          default_consent?: Json
          domain_id?: string | null
          effective_date?: string
          id?: string
          version: string
        }
        Update: {
          categories?: string[]
          changelog?: string | null
          created_at?: string
          default_consent?: Json
          domain_id?: string | null
          effective_date?: string
          id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmp_policy_versions_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "cmp_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      cmp_vendor_registry: {
        Row: {
          category: string
          created_at: string
          domain_id: string | null
          id: string
          is_active: boolean
          script_pattern: string | null
          vendor_name: string
        }
        Insert: {
          category: string
          created_at?: string
          domain_id?: string | null
          id?: string
          is_active?: boolean
          script_pattern?: string | null
          vendor_name: string
        }
        Update: {
          category?: string
          created_at?: string
          domain_id?: string | null
          id?: string
          is_active?: boolean
          script_pattern?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmp_vendor_registry_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "cmp_domains"
            referencedColumns: ["id"]
          },
        ]
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
          image_url: string | null
          instructor: string | null
          level: string
          partner_type: string
          published_at: string | null
          slug: string
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description: string
          duration?: string | null
          id?: string
          image_url?: string | null
          instructor?: string | null
          level: string
          partner_type?: string
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          duration?: string | null
          id?: string
          image_url?: string | null
          instructor?: string | null
          level?: string
          partner_type?: string
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
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
      crm_contact_tags: {
        Row: {
          contact_id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          company: string | null
          contact_type: Database["public"]["Enums"]["crm_contact_type"]
          created_at: string
          email: string
          id: string
          is_active: boolean
          metadata: Json | null
          name: string | null
          newsletter_subscriber_id: string | null
          notes: string | null
          phone: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          contact_type?: Database["public"]["Enums"]["crm_contact_type"]
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string | null
          newsletter_subscriber_id?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          contact_type?: Database["public"]["Enums"]["crm_contact_type"]
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string | null
          newsletter_subscriber_id?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_newsletter_subscriber_id_fkey"
            columns: ["newsletter_subscriber_id"]
            isOneToOne: false
            referencedRelation: "newsletter_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          contact_id: string
          created_at: string
          created_by: string | null
          currency: string | null
          expected_close_date: string | null
          id: string
          notes: string | null
          stage: Database["public"]["Enums"]["crm_deal_stage"]
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          contact_id: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          stage?: Database["public"]["Enums"]["crm_deal_stage"]
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          stage?: Database["public"]["Enums"]["crm_deal_stage"]
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interactions: {
        Row: {
          body: string | null
          contact_id: string
          created_at: string
          id: string
          interaction_type: Database["public"]["Enums"]["crm_interaction_type"]
          metadata: Json | null
          performed_by: string | null
          subject: string | null
        }
        Insert: {
          body?: string | null
          contact_id: string
          created_at?: string
          id?: string
          interaction_type?: Database["public"]["Enums"]["crm_interaction_type"]
          metadata?: Json | null
          performed_by?: string | null
          subject?: string | null
        }
        Update: {
          body?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          interaction_type?: Database["public"]["Enums"]["crm_interaction_type"]
          metadata?: Json | null
          performed_by?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      curated_posts: {
        Row: {
          body_html: string | null
          body_markdown: string
          canonical_slug: string | null
          cluster_id: string | null
          confidence_score: number
          created_at: string
          created_by: string | null
          editorial_score: number
          excerpt: string | null
          id: string
          internal_links: string[] | null
          language: string | null
          meta_description: string | null
          metrics: Json
          model_info: Json
          moderation: Json
          originality_score: number | null
          primary_keyword: string | null
          readability_score: number | null
          search_intent: string | null
          secondary_keywords: string[] | null
          seo_score: number | null
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
          canonical_slug?: string | null
          cluster_id?: string | null
          confidence_score?: number
          created_at?: string
          created_by?: string | null
          editorial_score?: number
          excerpt?: string | null
          id?: string
          internal_links?: string[] | null
          language?: string | null
          meta_description?: string | null
          metrics?: Json
          model_info?: Json
          moderation?: Json
          originality_score?: number | null
          primary_keyword?: string | null
          readability_score?: number | null
          search_intent?: string | null
          secondary_keywords?: string[] | null
          seo_score?: number | null
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
          canonical_slug?: string | null
          cluster_id?: string | null
          confidence_score?: number
          created_at?: string
          created_by?: string | null
          editorial_score?: number
          excerpt?: string | null
          id?: string
          internal_links?: string[] | null
          language?: string | null
          meta_description?: string | null
          metrics?: Json
          model_info?: Json
          moderation?: Json
          originality_score?: number | null
          primary_keyword?: string | null
          readability_score?: number | null
          search_intent?: string | null
          secondary_keywords?: string[] | null
          seo_score?: number | null
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
      n8n_credentials: {
        Row: {
          activated_at: string | null
          created_at: string
          created_by: string | null
          credential_type: string
          encrypted_value: string
          expires_at: string
          id: string
          key_name: string
          last_reminder_sent_at: string | null
          metadata: Json | null
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
          credential_type?: string
          encrypted_value: string
          expires_at: string
          id?: string
          key_name: string
          last_reminder_sent_at?: string | null
          metadata?: Json | null
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
          credential_type?: string
          encrypted_value?: string
          expires_at?: string
          id?: string
          key_name?: string
          last_reminder_sent_at?: string | null
          metadata?: Json | null
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
          curated_at: string | null
          entities: Json
          fingerprint: string
          id: string
          is_curated: boolean
          primary_staging_id: string | null
          priority_rank: number | null
          search_volume: number | null
          source_count: number
          topic: string | null
          trend_score: number | null
          updated_at: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          curated_at?: string | null
          entities?: Json
          fingerprint: string
          id?: string
          is_curated?: boolean
          primary_staging_id?: string | null
          priority_rank?: number | null
          search_volume?: number | null
          source_count?: number
          topic?: string | null
          trend_score?: number | null
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          curated_at?: string | null
          entities?: Json
          fingerprint?: string
          id?: string
          is_curated?: boolean
          primary_staging_id?: string | null
          priority_rank?: number | null
          search_volume?: number | null
          source_count?: number
          topic?: string | null
          trend_score?: number | null
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
          search_volume: number | null
          source_name: string
          source_url: string
          summary: string | null
          title: string
          topic: string | null
          trend_score: number | null
          trend_velocity: number | null
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
          search_volume?: number | null
          source_name: string
          source_url: string
          summary?: string | null
          title: string
          topic?: string | null
          trend_score?: number | null
          trend_velocity?: number | null
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
          search_volume?: number | null
          source_name?: string
          source_url?: string
          summary?: string | null
          title?: string
          topic?: string | null
          trend_score?: number | null
          trend_velocity?: number | null
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
      partner_access_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          request_context: string
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          request_context: string
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          request_context?: string
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          source?: string
          status?: string
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
      pipeline_alerts: {
        Row: {
          alert_type: string
          created_at: string
          detail: string | null
          id: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
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
      post_categories: {
        Row: {
          category_id: string
          created_at: string
          post_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          post_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_categories_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_distributions: {
        Row: {
          attempts: number | null
          channel: string
          created_at: string
          curated_post_id: string | null
          engagement: Json | null
          error_detail: string | null
          external_id: string | null
          external_url: string | null
          id: string
          post_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number | null
          channel: string
          created_at?: string
          curated_post_id?: string | null
          engagement?: Json | null
          error_detail?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          post_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number | null
          channel?: string
          created_at?: string
          curated_post_id?: string | null
          engagement?: Json | null
          error_detail?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          post_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_distributions_curated_post_id_fkey"
            columns: ["curated_post_id"]
            isOneToOne: false
            referencedRelation: "curated_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_distributions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_performance: {
        Row: {
          avg_position: number | null
          avg_time_on_page: number | null
          bounce_rate: number | null
          comments_count: number | null
          created_at: string
          ctr: number | null
          curated_post_id: string | null
          editorial_score: number | null
          google_indexed: boolean | null
          id: string
          indexed_at: string | null
          model_info: Json | null
          organic_clicks: number | null
          organic_impressions: number | null
          page_views: number | null
          performance_score: number | null
          post_id: string
          primary_keyword: string | null
          snapshot_date: string
          social_clicks: number | null
          social_shares: number | null
          time_to_index_hours: number | null
          tone_profile: string | null
          topic: string | null
          unique_visitors: number | null
          updated_at: string
        }
        Insert: {
          avg_position?: number | null
          avg_time_on_page?: number | null
          bounce_rate?: number | null
          comments_count?: number | null
          created_at?: string
          ctr?: number | null
          curated_post_id?: string | null
          editorial_score?: number | null
          google_indexed?: boolean | null
          id?: string
          indexed_at?: string | null
          model_info?: Json | null
          organic_clicks?: number | null
          organic_impressions?: number | null
          page_views?: number | null
          performance_score?: number | null
          post_id: string
          primary_keyword?: string | null
          snapshot_date?: string
          social_clicks?: number | null
          social_shares?: number | null
          time_to_index_hours?: number | null
          tone_profile?: string | null
          topic?: string | null
          unique_visitors?: number | null
          updated_at?: string
        }
        Update: {
          avg_position?: number | null
          avg_time_on_page?: number | null
          bounce_rate?: number | null
          comments_count?: number | null
          created_at?: string
          ctr?: number | null
          curated_post_id?: string | null
          editorial_score?: number | null
          google_indexed?: boolean | null
          id?: string
          indexed_at?: string | null
          model_info?: Json | null
          organic_clicks?: number | null
          organic_impressions?: number | null
          page_views?: number | null
          performance_score?: number | null
          post_id?: string
          primary_keyword?: string | null
          snapshot_date?: string
          social_clicks?: number | null
          social_shares?: number | null
          time_to_index_hours?: number | null
          tone_profile?: string | null
          topic?: string | null
          unique_visitors?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_performance_curated_post_id_fkey"
            columns: ["curated_post_id"]
            isOneToOne: false
            referencedRelation: "curated_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_performance_post_id_fkey"
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
          cover_image_accent: string | null
          cover_image_prompt: string | null
          created_at: string
          editorial_metadata: Json | null
          editorial_template: string | null
          excerpt: string
          featured: boolean
          id: string
          image_url: string | null
          internal_links: string[] | null
          meta_description: string | null
          primary_keyword: string | null
          published_at: string | null
          quality_details: Json | null
          quality_score: number | null
          read_time: string
          reading_time_minutes: number | null
          search_intent: string | null
          seo_keywords: Json | null
          seo_metadata: Json | null
          seo_score: number | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          views: number
          word_count: number | null
          workflow_metadata: Json | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          banner_url?: string | null
          category_id?: string | null
          content: string
          cover_image_accent?: string | null
          cover_image_prompt?: string | null
          created_at?: string
          editorial_metadata?: Json | null
          editorial_template?: string | null
          excerpt: string
          featured?: boolean
          id?: string
          image_url?: string | null
          internal_links?: string[] | null
          meta_description?: string | null
          primary_keyword?: string | null
          published_at?: string | null
          quality_details?: Json | null
          quality_score?: number | null
          read_time?: string
          reading_time_minutes?: number | null
          search_intent?: string | null
          seo_keywords?: Json | null
          seo_metadata?: Json | null
          seo_score?: number | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          views?: number
          word_count?: number | null
          workflow_metadata?: Json | null
        }
        Update: {
          author_id?: string | null
          author_name?: string
          banner_url?: string | null
          category_id?: string | null
          content?: string
          cover_image_accent?: string | null
          cover_image_prompt?: string | null
          created_at?: string
          editorial_metadata?: Json | null
          editorial_template?: string | null
          excerpt?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          internal_links?: string[] | null
          meta_description?: string | null
          primary_keyword?: string | null
          published_at?: string | null
          quality_details?: Json | null
          quality_score?: number | null
          read_time?: string
          reading_time_minutes?: number | null
          search_intent?: string | null
          seo_keywords?: Json | null
          seo_metadata?: Json | null
          seo_score?: number | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          views?: number
          word_count?: number | null
          workflow_metadata?: Json | null
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
      rate_limits: {
        Row: {
          id: number
          key: string
          request_count: number
          window_start: string
        }
        Insert: {
          id?: number
          key: string
          request_count?: number
          window_start?: string
        }
        Update: {
          id?: number
          key?: string
          request_count?: number
          window_start?: string
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
          metadata: Json | null
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
          metadata?: Json | null
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
          metadata?: Json | null
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
      sitemap_entries: {
        Row: {
          changefreq: string | null
          created_at: string
          id: string
          indexed: boolean | null
          indexed_at: string | null
          last_modified: string
          post_id: string | null
          priority: number | null
          submitted_at: string | null
          submitted_to_gsc: boolean | null
          url: string
        }
        Insert: {
          changefreq?: string | null
          created_at?: string
          id?: string
          indexed?: boolean | null
          indexed_at?: string | null
          last_modified?: string
          post_id?: string | null
          priority?: number | null
          submitted_at?: string | null
          submitted_to_gsc?: boolean | null
          url: string
        }
        Update: {
          changefreq?: string | null
          created_at?: string
          id?: string
          indexed?: boolean | null
          indexed_at?: string | null
          last_modified?: string
          post_id?: string | null
          priority?: number | null
          submitted_at?: string | null
          submitted_to_gsc?: boolean | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sitemap_entries_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding: {
        Row: {
          completed_steps: string[]
          dismissed: boolean
          enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_steps?: string[]
          dismissed?: boolean
          enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_steps?: string[]
          dismissed?: boolean
          enabled?: boolean
          updated_at?: string
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
        Relationships: []
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
      change_user_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _old_role: Database["public"]["Enums"]["app_role"]
          _reason?: string
          _user_id: string
        }
        Returns: boolean
      }
      check_permissions_integrity: {
        Args: never
        Returns: {
          check_name: string
          details: string
          status: string
        }[]
      }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_expired_roles_on_schedule: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      deactivate_expired_roles: {
        Args: never
        Returns: {
          deactivated_count: number
        }[]
      }
      deactivate_team_member: {
        Args: { _reason?: string; _user_id: string }
        Returns: boolean
      }
      expire_stale_generating_links: { Args: never; Returns: number }
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
      get_team_members: {
        Args: never
        Returns: {
          assigned_at: string
          assignment_id: string
          avatar_url: string
          email: string
          expires_at: string
          full_name: string
          is_active: boolean
          reason: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
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
      increment_ai_interaction: {
        Args: { fp: string; q: string }
        Returns: undefined
      }
      increment_views: {
        Args: { content_id: string; content_type: string }
        Returns: undefined
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
      reactivate_team_member: {
        Args: {
          _reason?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      resolve_pending_links: {
        Args: { p_post_id: string; p_slug: string }
        Returns: number
      }
      revoke_role_with_audit: {
        Args: {
          _reason?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      track_podcast_download: {
        Args: { podcast_id: string }
        Returns: undefined
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
        | "reviewer"
      crm_contact_type:
        | "subscriber"
        | "lead"
        | "partner"
        | "advertiser"
        | "contributor"
        | "other"
      crm_deal_stage:
        | "lead"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      crm_interaction_type:
        | "email"
        | "note"
        | "meeting"
        | "call"
        | "form_submission"
        | "newsletter_signup"
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
  graphql_public: {
    Enums: {},
  },
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
        "reviewer",
      ],
      crm_contact_type: [
        "subscriber",
        "lead",
        "partner",
        "advertiser",
        "contributor",
        "other",
      ],
      crm_deal_stage: [
        "lead",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      crm_interaction_type: [
        "email",
        "note",
        "meeting",
        "call",
        "form_submission",
        "newsletter_signup",
      ],
    },
  },
} as const

