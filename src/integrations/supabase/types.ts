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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      crop_photos: {
        Row: {
          created_at: string
          day: number
          description: string | null
          id: string
          image_url: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: number
          description?: string | null
          id?: string
          image_url: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: number
          description?: string | null
          id?: string
          image_url?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_photos_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "farming_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_gdu: {
        Row: {
          created_at: string
          date: string
          gdu: number
          id: string
          session_id: string
          source: string | null
          temp_max: number | null
          temp_min: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          gdu?: number
          id?: string
          session_id: string
          source?: string | null
          temp_max?: number | null
          temp_min?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          gdu?: number
          id?: string
          session_id?: string
          source?: string | null
          temp_max?: number | null
          temp_min?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_gdu_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "farming_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      farming_sessions: {
        Row: {
          accumulated_gdu: number | null
          created_at: string | null
          current_day: number | null
          current_stage: string | null
          id: string
          planting_date: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accumulated_gdu?: number | null
          created_at?: string | null
          current_day?: number | null
          current_stage?: string | null
          id?: string
          planting_date?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accumulated_gdu?: number | null
          created_at?: string | null
          current_day?: number | null
          current_stage?: string | null
          id?: string
          planting_date?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          contact_info: string | null
          created_at: string | null
          farm_location: string | null
          farm_size: string | null
          full_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          contact_info?: string | null
          created_at?: string | null
          farm_location?: string | null
          farm_size?: string | null
          full_name: string
          id: string
          updated_at?: string | null
        }
        Update: {
          contact_info?: string | null
          created_at?: string | null
          farm_location?: string | null
          farm_size?: string | null
          full_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          completed_at: string | null
          day: number
          id: string
          session_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          day: number
          id?: string
          session_id: string
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          day?: number
          id?: string
          session_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "farming_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notes: {
        Row: {
          created_at: string
          day: number
          id: string
          note: string
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: number
          id?: string
          note: string
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: number
          id?: string
          note?: string
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "farming_sessions"
            referencedColumns: ["id"]
          },
        ]
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
