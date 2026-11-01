// Shaped like Supabase's generated file, written by hand: the generator in the Supabase connection
// only covers `public`. Checked column by column against the `gemeas` schema; after a schema change,
// update it from supabase/migrations/ and check again.

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
    PostgrestVersion: "14.18"
  }
  gemeas: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          date: string
          distance_m: number | null
          duration_s: number | null
          elevation_m: number | null
          external_id: string | null
          hr_avg: number | null
          id: string
          load: number | null
          notes: string | null
          plan_session_id: string | null
          raw: Json | null
          source: string
          sport: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          distance_m?: number | null
          duration_s?: number | null
          elevation_m?: number | null
          external_id?: string | null
          hr_avg?: number | null
          id?: string
          load?: number | null
          notes?: string | null
          plan_session_id?: string | null
          raw?: Json | null
          source?: string
          sport: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          distance_m?: number | null
          duration_s?: number | null
          elevation_m?: number | null
          external_id?: string | null
          hr_avg?: number | null
          id?: string
          load?: number | null
          notes?: string | null
          plan_session_id?: string | null
          raw?: Json | null
          source?: string
          sport?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_plan_session_id_fkey"
            columns: ["plan_session_id"]
            isOneToOne: true
            referencedRelation: "plan_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          cache_read_tokens: number | null
          cache_write_tokens: number | null
          content: Json
          created_at: string
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          role: string
          seq: number
          text: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          content: Json
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role: string
          text?: string | null
          thread_id: string
          user_id?: string
        }
        Update: {
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          content?: Json
          created_at?: string
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role?: string
          text?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          closed: boolean
          created_at: string
          fingerprint: string
          id: string
          user_id: string
        }
        Insert: {
          closed?: boolean
          created_at?: string
          fingerprint: string
          id?: string
          user_id?: string
        }
        Update: {
          closed?: boolean
          created_at?: string
          fingerprint?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_profiles: {
        Row: {
          created_at: string
          daily_limit: number
          enabled: boolean
          instructions: string
          reply_started_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number
          enabled?: boolean
          instructions?: string
          reply_started_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          daily_limit?: number
          enabled?: boolean
          instructions?: string
          reply_started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plan_proposals: {
        Row: {
          changes: Json
          created_at: string
          decided_at: string | null
          id: string
          lines: string[]
          status: string
          summary: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          changes: Json
          created_at?: string
          decided_at?: string | null
          id?: string
          lines: string[]
          status?: string
          summary: string
          thread_id?: string | null
          user_id?: string
        }
        Update: {
          changes?: Json
          created_at?: string
          decided_at?: string | null
          id?: string
          lines?: string[]
          status?: string
          summary?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_proposals_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_sessions: {
        Row: {
          block: string | null
          created_at: string
          date: string
          exercises: string[]
          id: string
          instructions: string | null
          kind: string
          position: number
          slot: string
          title: string
          user_id: string
          video_ids: string[]
        }
        Insert: {
          block?: string | null
          created_at?: string
          date: string
          exercises?: string[]
          id?: string
          instructions?: string | null
          kind: string
          position?: number
          slot: string
          title: string
          user_id?: string
          video_ids?: string[]
        }
        Update: {
          block?: string | null
          created_at?: string
          date?: string
          exercises?: string[]
          id?: string
          instructions?: string | null
          kind?: string
          position?: number
          slot?: string
          title?: string
          user_id?: string
          video_ids?: string[]
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          decisions: string | null
          id: string
          summary: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          decisions?: string | null
          id?: string
          summary?: string | null
          user_id?: string
          week_start: string
        }
        Update: {
          created_at?: string
          decisions?: string | null
          id?: string
          summary?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      session_logs: {
        Row: {
          comment: string | null
          effort: string | null
          id: string
          logged_at: string
          plan_session_id: string
          status: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          effort?: string | null
          id?: string
          logged_at?: string
          plan_session_id: string
          status: string
          user_id?: string
        }
        Update: {
          comment?: string | null
          effort?: string | null
          id?: string
          logged_at?: string
          plan_session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_plan_session_id_fkey"
            columns: ["plan_session_id"]
            isOneToOne: true
            referencedRelation: "plan_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      symptoms: {
        Row: {
          body_area: string
          context: string | null
          created_at: string
          date: string
          id: string
          score: number
          session_log_id: string | null
          side: string | null
          timing: string
          user_id: string
        }
        Insert: {
          body_area: string
          context?: string | null
          created_at?: string
          date?: string
          id?: string
          score: number
          session_log_id?: string | null
          side?: string | null
          timing?: string
          user_id?: string
        }
        Update: {
          body_area?: string
          context?: string | null
          created_at?: string
          date?: string
          id?: string
          score?: number
          session_log_id?: string | null
          side?: string | null
          timing?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptoms_session_log_id_fkey"
            columns: ["session_log_id"]
            isOneToOne: false
            referencedRelation: "session_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          plan_session_id: string | null
          side: string | null
          test: string
          unit: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          plan_session_id?: string | null
          side?: string | null
          test: string
          unit?: string | null
          user_id?: string
          value: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          plan_session_id?: string | null
          side?: string | null
          test?: string
          unit?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "tests_plan_session_id_fkey"
            columns: ["plan_session_id"]
            isOneToOne: false
            referencedRelation: "plan_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          available: boolean
          created_at: string
          duration_s: number | null
          flags: string | null
          notes: string | null
          playlists: string[]
          published_at: string | null
          synced_at: string | null
          tags: string[]
          title: string
          user_id: string
          views: number | null
          yt_id: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          duration_s?: number | null
          flags?: string | null
          notes?: string | null
          playlists?: string[]
          published_at?: string | null
          synced_at?: string | null
          tags?: string[]
          title: string
          user_id?: string
          views?: number | null
          yt_id: string
        }
        Update: {
          available?: boolean
          created_at?: string
          duration_s?: number | null
          flags?: string | null
          notes?: string | null
          playlists?: string[]
          published_at?: string | null
          synced_at?: string | null
          tags?: string[]
          title?: string
          user_id?: string
          views?: number | null
          yt_id?: string
        }
        Relationships: []
      }
      weights: {
        Row: {
          created_at: string
          date: string
          id: string
          kg: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          kg: number
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          kg?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decide_proposal: {
        Args: { p_apply: boolean; p_id: string }
        Returns: string
      }
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

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "gemeas">]

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
  gemeas: {
    Enums: {},
  },
} as const
