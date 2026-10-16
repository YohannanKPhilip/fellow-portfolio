// Generated from the Supabase schema (project ydwjuixkrvavlbxmvdts). Do not edit by hand:
// regenerate after any migration. Only the row types are kept; the generator's unused
// Enums/CompositeTypes helpers are left out.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      fellows: {
        Row: {
          city: string | null;
          cohort: string | null;
          created_at: string;
          first_name: string;
          page: Json;
          theme: Json;

          name: string;
          photo_blurhash: string | null;
          photo_path: string | null;
          school: string | null;
          slug: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          city?: string | null;
          cohort?: string | null;
          created_at?: string;
          first_name: string;
          page?: Json;
          theme?: Json;

          name: string;
          photo_blurhash?: string | null;
          photo_path?: string | null;
          school?: string | null;
          slug: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          city?: string | null;
          cohort?: string | null;
          created_at?: string;
          first_name?: string;
          page?: Json;
          theme?: Json;
          name?: string;
          photo_blurhash?: string | null;
          photo_path?: string | null;
          school?: string | null;
          slug?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fellows_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      resource_files: {
        Row: {
          file_link: string | null;
          file_name: string;
          id: string;
          position: number;
          resource_id: string;
        };
        Insert: {
          file_link?: string | null;
          file_name: string;
          id?: string;
          position?: number;
          resource_id: string;
        };
        Update: {
          file_link?: string | null;
          file_name?: string;
          id?: string;
          position?: number;
          resource_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resource_files_resource_id_fkey';
            columns: ['resource_id'];
            isOneToOne: false;
            referencedRelation: 'resources';
            referencedColumns: ['id'];
          },
        ];
      };
      resource_media: {
        Row: {
          blurhash: string | null;
          caption: string | null;
          consent_confirmed: boolean;
          id: string;
          position: number;
          ratio: number | null;
          resource_id: string;
          type_hint: string | null;
          url: string;
        };
        Insert: {
          blurhash?: string | null;
          caption?: string | null;
          consent_confirmed?: boolean;
          id?: string;
          position?: number;
          ratio?: number | null;
          resource_id: string;
          type_hint?: string | null;
          url: string;
        };
        Update: {
          blurhash?: string | null;
          caption?: string | null;
          consent_confirmed?: boolean;
          id?: string;
          position?: number;
          ratio?: number | null;
          resource_id?: string;
          type_hint?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resource_media_resource_id_fkey';
            columns: ['resource_id'];
            isOneToOne: false;
            referencedRelation: 'resources';
            referencedColumns: ['id'];
          },
        ];
      };
      resources: {
        Row: {
          cover_blurhash: string | null;
          cover_consent_confirmed: boolean;
          cover_path: string | null;
          created_at: string;
          description: string | null;
          drive_link: string | null;
          grade: string | null;
          id: string;
          length: string | null;
          published_at: string | null;
          slug: string;
          status: string;
          subject: string | null;
          summary: string | null;
          tags: string[];
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cover_blurhash?: string | null;
          cover_consent_confirmed?: boolean;
          cover_path?: string | null;
          created_at?: string;
          description?: string | null;
          drive_link?: string | null;
          grade?: string | null;
          id?: string;
          length?: string | null;
          published_at?: string | null;
          slug: string;
          status?: string;
          subject?: string | null;
          summary?: string | null;
          tags?: string[];
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          cover_blurhash?: string | null;
          cover_consent_confirmed?: boolean;
          cover_path?: string | null;
          created_at?: string;
          description?: string | null;
          drive_link?: string | null;
          grade?: string | null;
          id?: string;
          length?: string | null;
          published_at?: string | null;
          slug?: string;
          status?: string;
          subject?: string | null;
          summary?: string | null;
          tags?: string[];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resources_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'fellows';
            referencedColumns: ['user_id'];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          role: Database['public']['Enums']['user_role'];
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          role?: Database['public']['Enums']['user_role'];
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          role?: Database['public']['Enums']['user_role'];
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { user_role: 'fellow' | 'admin' };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database['public']['Tables'];

export type Tables<T extends keyof PublicTables> = PublicTables[T]['Row'];
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]['Insert'];
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]['Update'];
