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
      allowed_emails: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          change_badge_style: string | null
          change_badge_type: string | null
          created_at: string
          description: string
          entry_kind: string
          id: string
          in_progress_at: string | null
          in_progress_by_display_name: string
          in_progress_by_user_id: string | null
          location: string
          other_location: string
          resolution_notes: string
          resolved_at: string | null
          resolved_by_display_name: string
          resolved_by_user_id: string | null
          screenshot_urls: string[]
          status: string
          submitted_by_display_name: string
          submitted_by_user_id: string | null
          updated_at: string
          urgency: string
        }
        Insert: {
          change_badge_style?: string | null
          change_badge_type?: string | null
          created_at?: string
          description?: string
          entry_kind?: string
          id?: string
          in_progress_at?: string | null
          in_progress_by_display_name?: string
          in_progress_by_user_id?: string | null
          location?: string
          other_location?: string
          resolution_notes?: string
          resolved_at?: string | null
          resolved_by_display_name?: string
          resolved_by_user_id?: string | null
          screenshot_urls?: string[]
          status?: string
          submitted_by_display_name?: string
          submitted_by_user_id?: string | null
          updated_at?: string
          urgency?: string
        }
        Update: {
          change_badge_style?: string | null
          change_badge_type?: string | null
          created_at?: string
          description?: string
          entry_kind?: string
          id?: string
          in_progress_at?: string | null
          in_progress_by_display_name?: string
          in_progress_by_user_id?: string | null
          location?: string
          other_location?: string
          resolution_notes?: string
          resolved_at?: string | null
          resolved_by_display_name?: string
          resolved_by_user_id?: string | null
          screenshot_urls?: string[]
          status?: string
          submitted_by_display_name?: string
          submitted_by_user_id?: string | null
          updated_at?: string
          urgency?: string
        }
        Relationships: []
      }
      builder_actions: {
        Row: {
          action: string
          created_at: string
          display_name: string
          id: string
          order_id: string | null
          order_type: string | null
          units_count: number
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          display_name?: string
          id?: string
          order_id?: string | null
          order_type?: string | null
          units_count?: number
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          display_name?: string
          id?: string
          order_id?: string | null
          order_type?: string | null
          units_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      negative_flags: {
        Row: {
          created_at: string
          flagged_by_display_name: string
          flagged_by_user_id: string | null
          id: string
          order_id: string | null
          reason: string
          source: string
          target_display_name: string
          target_user_id: string | null
        }
        Insert: {
          created_at?: string
          flagged_by_display_name?: string
          flagged_by_user_id?: string | null
          id?: string
          order_id?: string | null
          reason?: string
          source?: string
          target_display_name: string
          target_user_id?: string | null
        }
        Update: {
          created_at?: string
          flagged_by_display_name?: string
          flagged_by_user_id?: string | null
          id?: string
          order_id?: string | null
          reason?: string
          source?: string
          target_display_name?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          acknowledged: boolean
          body: string
          created_at: string
          id: string
          kind: string
          meta: Json
          required_permission: string | null
          stable_key: string | null
          sticky: boolean
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged?: boolean
          body?: string
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          required_permission?: string | null
          stable_key?: string | null
          sticky?: boolean
          title?: string
          updated_at?: string
        }
        Update: {
          acknowledged?: boolean
          body?: string
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          required_permission?: string | null
          stable_key?: string | null
          sticky?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_starts: {
        Row: {
          order_id: string
          started_at: string
          started_by_display_name: string
          started_by_user_id: string | null
        }
        Insert: {
          order_id: string
          started_at?: string
          started_by_display_name?: string
          started_by_user_id?: string | null
        }
        Update: {
          order_id?: string
          started_at?: string
          started_by_display_name?: string
          started_by_user_id?: string | null
        }
        Relationships: []
      }
      order_units: {
        Row: {
          completed_at: string | null
          completed_by_display_name: string
          completed_by_user_id: string | null
          created_at: string
          cutting_started_at: string | null
          edit_acknowledged: boolean
          edited_at: string | null
          id: string
          order_id: string
          started_at: string | null
          started_by_display_name: string
          started_by_user_id: string | null
          status: string
          unit_index: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by_display_name?: string
          completed_by_user_id?: string | null
          created_at?: string
          cutting_started_at?: string | null
          edit_acknowledged?: boolean
          edited_at?: string | null
          id?: string
          order_id: string
          started_at?: string | null
          started_by_display_name?: string
          started_by_user_id?: string | null
          status?: string
          unit_index: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by_display_name?: string
          completed_by_user_id?: string | null
          created_at?: string
          cutting_started_at?: string | null
          edit_acknowledged?: boolean
          edited_at?: string | null
          id?: string
          order_id?: string
          started_at?: string | null
          started_by_display_name?: string
          started_by_user_id?: string | null
          status?: string
          unit_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_units_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          comments: string
          completed_at: string | null
          completed_by_user_id: string | null
          crate_option: string | null
          crate_style: string | null
          created_at: string
          current_unit_started_at: string | null
          cutting_started_at: string | null
          department: string
          edit_acknowledged: boolean
          edit_logs: Json
          edited_at: string | null
          height: number | null
          hold_acknowledged: boolean
          hold_from_in_build: boolean
          id: string
          job_number: string
          job_numbers: string[]
          length: number
          need_by_date: string
          number_of_units: number
          ordered_by: string
          ordered_by_user_id: string | null
          pallet_option: string | null
          pallet_style: string | null
          pending_started_at: string | null
          previous_status: string | null
          priority: string
          project_name: string
          revenue: number | null
          sales_order_number: string
          started_at: string | null
          started_by_user_id: string | null
          status: string
          submission_date: string
          type: string
          units_completed: number
          updated_at: string
          width: number
        }
        Insert: {
          comments?: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          crate_option?: string | null
          crate_style?: string | null
          created_at?: string
          current_unit_started_at?: string | null
          cutting_started_at?: string | null
          department: string
          edit_acknowledged?: boolean
          edit_logs?: Json
          edited_at?: string | null
          height?: number | null
          hold_acknowledged?: boolean
          hold_from_in_build?: boolean
          id?: string
          job_number?: string
          job_numbers?: string[]
          length: number
          need_by_date: string
          number_of_units?: number
          ordered_by: string
          ordered_by_user_id?: string | null
          pallet_option?: string | null
          pallet_style?: string | null
          pending_started_at?: string | null
          previous_status?: string | null
          priority?: string
          project_name?: string
          revenue?: number | null
          sales_order_number?: string
          started_at?: string | null
          started_by_user_id?: string | null
          status?: string
          submission_date?: string
          type: string
          units_completed?: number
          updated_at?: string
          width: number
        }
        Update: {
          comments?: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          crate_option?: string | null
          crate_style?: string | null
          created_at?: string
          current_unit_started_at?: string | null
          cutting_started_at?: string | null
          department?: string
          edit_acknowledged?: boolean
          edit_logs?: Json
          edited_at?: string | null
          height?: number | null
          hold_acknowledged?: boolean
          hold_from_in_build?: boolean
          id?: string
          job_number?: string
          job_numbers?: string[]
          length?: number
          need_by_date?: string
          number_of_units?: number
          ordered_by?: string
          ordered_by_user_id?: string | null
          pallet_option?: string | null
          pallet_style?: string | null
          pending_started_at?: string | null
          previous_status?: string | null
          priority?: string
          project_name?: string
          revenue?: number | null
          sales_order_number?: string
          started_at?: string | null
          started_by_user_id?: string | null
          status?: string
          submission_date?: string
          type?: string
          units_completed?: number
          updated_at?: string
          width?: number
        }
        Relationships: []
      }
      printer_status: {
        Row: {
          department: string
          online: boolean
          updated_at: string
          updated_by_display_name: string
          updated_by_user_id: string | null
        }
        Insert: {
          department: string
          online?: boolean
          updated_at?: string
          updated_by_display_name?: string
          updated_by_user_id?: string | null
        }
        Update: {
          department?: string
          online?: boolean
          updated_at?: string
          updated_by_display_name?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recycle_items: {
        Row: {
          added_date: string
          assignment: Json | null
          created_at: string
          created_by_user_id: string | null
          edit_logs: Json
          height: number | null
          id: string
          length: number
          location: string
          pending_assignment: Json | null
          qty: number
          recycle_number: number
          status: string
          style: string
          type: string
          updated_at: string
          width: number
        }
        Insert: {
          added_date?: string
          assignment?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          edit_logs?: Json
          height?: number | null
          id?: string
          length: number
          location?: string
          pending_assignment?: Json | null
          qty?: number
          recycle_number: number
          status?: string
          style?: string
          type: string
          updated_at?: string
          width: number
        }
        Update: {
          added_date?: string
          assignment?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          edit_logs?: Json
          height?: number | null
          id?: string
          length?: number
          location?: string
          pending_assignment?: Json | null
          qty?: number
          recycle_number?: number
          status?: string
          style?: string
          type?: string
          updated_at?: string
          width?: number
        }
        Relationships: []
      }
      report_records: {
        Row: {
          cancel_reason: string | null
          cancelled: boolean
          cancelled_at: string | null
          comments: string
          completed_at: string
          completed_by_display_name: string
          completed_by_user_id: string | null
          created_at: string
          cutting_started_at: string | null
          department: string
          edit_logs: Json
          height: number | null
          id: string
          job_number: string
          job_numbers: string[]
          length: number
          need_by_date: string | null
          option: string
          order_id: string
          ordered_by: string
          pending_started_at: string | null
          project_name: string
          sales_order_number: string
          started_at: string | null
          style: string
          submission_date: string | null
          tier: number
          total_units: number
          type: string
          unit_number: number
          width: number
        }
        Insert: {
          cancel_reason?: string | null
          cancelled?: boolean
          cancelled_at?: string | null
          comments?: string
          completed_at?: string
          completed_by_display_name?: string
          completed_by_user_id?: string | null
          created_at?: string
          cutting_started_at?: string | null
          department?: string
          edit_logs?: Json
          height?: number | null
          id?: string
          job_number?: string
          job_numbers?: string[]
          length: number
          need_by_date?: string | null
          option?: string
          order_id: string
          ordered_by?: string
          pending_started_at?: string | null
          project_name?: string
          sales_order_number?: string
          started_at?: string | null
          style?: string
          submission_date?: string | null
          tier?: number
          total_units?: number
          type: string
          unit_number: number
          width: number
        }
        Update: {
          cancel_reason?: string | null
          cancelled?: boolean
          cancelled_at?: string | null
          comments?: string
          completed_at?: string
          completed_by_display_name?: string
          completed_by_user_id?: string | null
          created_at?: string
          cutting_started_at?: string | null
          department?: string
          edit_logs?: Json
          height?: number | null
          id?: string
          job_number?: string
          job_numbers?: string[]
          length?: number
          need_by_date?: string | null
          option?: string
          order_id?: string
          ordered_by?: string
          pending_started_at?: string | null
          project_name?: string
          sales_order_number?: string
          started_at?: string | null
          style?: string
          submission_date?: string | null
          tier?: number
          total_units?: number
          type?: string
          unit_number?: number
          width?: number
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      shift_pauses: {
        Row: {
          created_by_display_name: string
          id: string
          paused_at: string
          resumed_at: string | null
        }
        Insert: {
          created_by_display_name?: string
          id?: string
          paused_at?: string
          resumed_at?: string | null
        }
        Update: {
          created_by_display_name?: string
          id?: string
          paused_at?: string
          resumed_at?: string | null
        }
        Relationships: []
      }
      team_settings: {
        Row: {
          end_of_month_mode: boolean
          id: string
          monthly_revenue_goal: number
          revenue_bar_mode: string
          shift_auto_end_time: string
          shift_auto_resume_time: string
          shift_auto_schedule_enabled: boolean
          shift_end_prompt_lead_minutes: number
          shift_schedule_by_day: Json
          updated_at: string
          updated_by_display_name: string
          updated_by_user_id: string | null
        }
        Insert: {
          end_of_month_mode?: boolean
          id?: string
          monthly_revenue_goal?: number
          revenue_bar_mode?: string
          shift_auto_end_time?: string
          shift_auto_resume_time?: string
          shift_auto_schedule_enabled?: boolean
          shift_end_prompt_lead_minutes?: number
          shift_schedule_by_day?: Json
          updated_at?: string
          updated_by_display_name?: string
          updated_by_user_id?: string | null
        }
        Update: {
          end_of_month_mode?: boolean
          id?: string
          monthly_revenue_goal?: number
          revenue_bar_mode?: string
          shift_auto_end_time?: string
          shift_auto_resume_time?: string
          shift_auto_schedule_enabled?: boolean
          shift_end_prompt_lead_minutes?: number
          shift_schedule_by_day?: Json
          updated_at?: string
          updated_by_display_name?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      timer_pause_state: {
        Row: {
          id: number
          is_paused: boolean
          paused_at: string | null
          paused_by: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          is_paused?: boolean
          paused_at?: string | null
          paused_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          is_paused?: boolean
          paused_at?: string | null
          paused_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      toast_log: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
          variant: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          variant?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          variant?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          active: boolean
          created_at: string
          created_by_user_id: string | null
          failed_attempts: number
          id: string
          last_used_at: string | null
          locked_at: string | null
          pin_hash: string
          revoked_at: string | null
          revoked_by_user_id: string | null
          token_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by_user_id?: string | null
          failed_attempts?: number
          id?: string
          last_used_at?: string | null
          locked_at?: string | null
          pin_hash: string
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          token_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by_user_id?: string | null
          failed_attempts?: number
          id?: string
          last_used_at?: string | null
          locked_at?: string | null
          pin_hash?: string
          revoked_at?: string | null
          revoked_by_user_id?: string | null
          token_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permission_overrides: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted: boolean
          id?: string
          permission: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_user_emails: {
        Args: never
        Returns: {
          email: string
          id: string
        }[]
      }
      get_my_email: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_email_allowed: { Args: { _email: string }; Returns: boolean }
      pause_timers: { Args: never; Returns: undefined }
      resume_timers: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "builder"
        | "shipper"
        | "mainliner"
        | "chassisliner"
        | "other"
        | "viewer"
        | "materials"
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
        "admin",
        "builder",
        "shipper",
        "mainliner",
        "chassisliner",
        "other",
        "viewer",
        "materials",
      ],
    },
  },
} as const
