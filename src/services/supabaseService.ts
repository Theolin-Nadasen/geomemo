import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zejvocewojcbzlssftaf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Wy6aFMRtjI1mGXtlT5fLGQ_GuAilO-4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type ImageType = 'good' | 'bad' | 'general';

export interface Post {
  id: string;
  creator: string;
  latitude: number;
  longitude: number;
  geohash: string;
  memo: string;
  image_type: ImageType;
  timestamp: number;
  expiry: number;
  tips: number;
}

export interface Tip {
  id: string;
  post_id: string;
  tipper: string;
  amount: number;
  timestamp: number;
}

class SupabaseService {
  /**
   * Create a new post
   */
  async createPost(
    creator: string,
    latitude: number,
    longitude: number,
    memo: string,
    imageType: ImageType
  ): Promise<Post> {
    const geohash = this.encodeGeohash(latitude, longitude, 7);
    const timestamp = Date.now();
    const expiry = timestamp + 7 * 24 * 60 * 60 * 1000; // 7 days

    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          creator,
          latitude,
          longitude,
          geohash,
          memo,
          image_type: imageType,
          timestamp,
          expiry,
          tips: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Failed to create post:', error);
      throw new Error(`Failed to create post: ${error.message}`);
    }

    return data as Post;
  }

  /**
   * Query posts by geohash prefix (nearby posts)
   */
  async queryPostsByGeohash(geohashPrefix: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .ilike('geohash', `${geohashPrefix}%`)
      .gt('expiry', Date.now())
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Failed to query posts:', error);
      return [];
    }

    return (data as Post[]) || [];
  }

  /**
   * Get all posts (fallback when no location)
   */
  async getAllPosts(): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .gt('expiry', Date.now())
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to get posts:', error);
      return [];
    }

    return (data as Post[]) || [];
  }

  /**
   * Record a tip for a post
   */
  async recordTip(postId: string, tipper: string, amount: number): Promise<void> {
    // Insert tip record
    const { error: tipError } = await supabase.from('tips').insert([
      {
        post_id: postId,
        tipper,
        amount,
        timestamp: Date.now(),
      },
    ]);

    if (tipError) {
      console.error('Failed to record tip:', tipError);
      throw new Error(`Failed to record tip: ${tipError.message}`);
    }

    // Update post tips total
    const { error: updateError } = await supabase
      .from('posts')
      .update({ tips: supabase.rpc('increment_tips', { post_id: postId, amount }) })
      .eq('id', postId);

    if (updateError) {
      console.error('Failed to update post tips:', updateError);
    }
  }

  /**
   * Get tips for a post
   */
  async getTipsForPost(postId: string): Promise<Tip[]> {
    const { data, error } = await supabase
      .from('tips')
      .select('*')
      .eq('post_id', postId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Failed to get tips:', error);
      return [];
    }

    return (data as Tip[]) || [];
  }

  /**
   * Encode latitude/longitude to geohash
   */
  private encodeGeohash(lat: number, lon: number, precision: number): string {
    const chars = '0123456789bcdefghjkmnpqrstuvwxyz';
    let geohash = '';
    let minLat = -90,
      maxLat = 90;
    let minLon = -180,
      maxLon = 180;
    let isEven = true;

    while (geohash.length < precision) {
      let charIndex = 0;

      for (let i = 0; i < 5; i++) {
        if (isEven) {
          const mid = (minLon + maxLon) / 2;
          if (lon >= mid) {
            charIndex = charIndex * 2 + 1;
            minLon = mid;
          } else {
            charIndex = charIndex * 2;
            maxLon = mid;
          }
        } else {
          const mid = (minLat + maxLat) / 2;
          if (lat >= mid) {
            charIndex = charIndex * 2 + 1;
            minLat = mid;
          } else {
            charIndex = charIndex * 2;
            maxLat = mid;
          }
        }
        isEven = !isEven;
      }
      geohash += chars[charIndex];
    }

    return geohash;
  }
}

export const supabaseService = new SupabaseService();
