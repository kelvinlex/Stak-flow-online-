import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile } from '../components/Profile';

export interface SupabaseProfile {
  id: string;
  name: string;
  avatar: string;
  high_score: number;
  updated_at: string;
}

export const supabaseService = {
  async saveProfile(profile: UserProfile, highScore: number) {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id,
          name: profile.name,
          avatar: profile.avatar,
          high_score: highScore,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving profile to Supabase:', error);
      return null;
    }
  },

  async getTopPlayers(limit = 50) {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('high_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as SupabaseProfile[];
    } catch (error) {
      console.error('Error fetching leaderboard from Supabase:', error);
      return [];
    }
  },

  async getProfile(id: string) {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) return null;
      return data as SupabaseProfile;
    } catch (error) {
      console.error('Error fetching profile from Supabase:', error);
      return null;
    }
  }
};
