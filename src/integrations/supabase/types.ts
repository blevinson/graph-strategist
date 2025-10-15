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
      edges: {
        Row: {
          created_at: string | null
          id: string
          plan_id: string | null
          source: string
          target: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_id?: string | null
          source: string
          target: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_id?: string | null
          source?: string
          target?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "edges_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edges_source_fkey"
            columns: ["source"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edges_target_fkey"
            columns: ["target"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      nodes: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          inputs: Json | null
          label: string
          outputs: Json | null
          plan_id: string | null
          props: Json
          updated_at: string | null
          x: number | null
          y: number | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          inputs?: Json | null
          label: string
          outputs?: Json | null
          plan_id?: string | null
          props?: Json
          updated_at?: string | null
          x?: number | null
          y?: number | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          inputs?: Json | null
          label?: string
          outputs?: Json | null
          plan_id?: string | null
          props?: Json
          updated_at?: string | null
          x?: number | null
          y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nodes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string | null
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string | null
          version?: number
        }
        Relationships: []
      }
      runs: {
        Row: {
          created_at: string
          deltas: Json
          id: string
          plan_id: string
          status: string
          trace: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deltas?: Json
          id?: string
          plan_id: string
          status?: string
          trace?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deltas?: Json
          id?: string
          plan_id?: string
          status?: string
          trace?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "runs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      step_runs: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          log: Json
          output: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["workflow_run_status"]
          step_id: string
          workflow_run_id: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          log?: Json
          output?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_run_status"]
          step_id: string
          workflow_run_id: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          log?: Json
          output?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_run_status"]
          step_id?: string
          workflow_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_runs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "step_runs_workflow_run_id_fkey"
            columns: ["workflow_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_insights: {
        Row: {
          confidence: number | null
          content: string
          created_at: string | null
          id: string
          insight_type: string
          metadata: Json | null
          node_id: string | null
        }
        Insert: {
          confidence?: number | null
          content: string
          created_at?: string | null
          id?: string
          insight_type: string
          metadata?: Json | null
          node_id?: string | null
        }
        Update: {
          confidence?: number | null
          content?: string
          created_at?: string | null
          id?: string
          insight_type?: string
          metadata?: Json | null
          node_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategic_insights_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          log: Json
          meta: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["workflow_run_status"]
          workflow_id: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          log?: Json
          meta?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_run_status"]
          workflow_id: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          log?: Json
          meta?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_run_status"]
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          config: Json
          created_at: string
          depends_on: string[] | null
          id: string
          name: string
          position: number | null
          type: Database["public"]["Enums"]["workflow_step_type"]
          workflow_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          depends_on?: string[] | null
          id?: string
          name: string
          position?: number | null
          type: Database["public"]["Enums"]["workflow_step_type"]
          workflow_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          depends_on?: string[] | null
          id?: string
          name?: string
          position?: number | null
          type?: Database["public"]["Enums"]["workflow_step_type"]
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          mode: Database["public"]["Enums"]["workflow_mode"]
          name: string
          node_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["workflow_mode"]
          name: string
          node_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["workflow_mode"]
          name?: string
          node_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
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
      workflow_mode: "SEQUENTIAL" | "DAG"
      workflow_run_status:
        | "queued"
        | "running"
        | "succeeded"
        | "failed"
        | "cancelled"
      workflow_step_type:
        | "DELAY"
        | "HTTP_REQUEST"
        | "SET_NODE_PROP"
        | "CREATE_EDGE"
        | "DELETE_EDGE"
        | "SQL_QUERY"
        | "EMIT_SIGNAL"
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
      workflow_mode: ["SEQUENTIAL", "DAG"],
      workflow_run_status: [
        "queued",
        "running",
        "succeeded",
        "failed",
        "cancelled",
      ],
      workflow_step_type: [
        "DELAY",
        "HTTP_REQUEST",
        "SET_NODE_PROP",
        "CREATE_EDGE",
        "DELETE_EDGE",
        "SQL_QUERY",
        "EMIT_SIGNAL",
      ],
    },
  },
} as const
