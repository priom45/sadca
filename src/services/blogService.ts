import { supabase } from '../lib/supabaseClient';
import {
  BlogPost,
  BlogPostWithRelations,
  BlogCategory,
  BlogTag,
  BlogPostFilters,
  BlogPostsResponse
} from '../types/blog';

export const blogService = {
  async fetchPublishedPosts(
    page: number = 1,
    pageSize: number = 12,
    filters?: BlogPostFilters
  ): Promise<BlogPostsResponse> {
    try {
      let query = supabase
        .from('blog_posts')
        .select('*', { count: 'exact' })
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .order('published_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,body_content.ilike.%${filters.search}%`);
      }

      if (filters?.category_id) {
        const { data: postIds } = await supabase
          .from('blog_post_categories')
          .select('blog_post_id')
          .eq('blog_category_id', filters.category_id);

        if (postIds && postIds.length > 0) {
          query = query.in('id', postIds.map(p => p.blog_post_id));
        } else {
          return {
            posts: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0
          };
        }
      }

      if (filters?.tag_id) {
        const { data: postIds } = await supabase
          .from('blog_post_tags')
          .select('blog_post_id')
          .eq('blog_tag_id', filters.tag_id);

        if (postIds && postIds.length > 0) {
          query = query.in('id', postIds.map(p => p.blog_post_id));
        } else {
          return {
            posts: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0
          };
        }
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: posts, error, count } = await query;

      if (error) throw error;

      const postsWithRelations = await Promise.all(
        (posts || []).map(async (post) => {
          const categories = await this.getPostCategories(post.id);
          const tags = await this.getPostTags(post.id);
          return { ...post, categories, tags } as BlogPostWithRelations;
        })
      );

      return {
        posts: postsWithRelations,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    } catch (error) {
      console.error('Error fetching published posts:', error);
      throw error;
    }
  },

  async fetchPostBySlug(slug: string): Promise<BlogPostWithRelations | null> {
    try {
      const { data: post, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;
      if (!post) return null;

      const categories = await this.getPostCategories(post.id);
      const tags = await this.getPostTags(post.id);

      await this.incrementViewCount(post.id);

      return { ...post, categories, tags };
    } catch (error) {
      console.error('Error fetching post by slug:', error);
      throw error;
    }
  },

  async getPostCategories(postId: string): Promise<BlogCategory[]> {
    try {
      const { data, error } = await supabase
        .from('blog_post_categories')
        .select(`
          blog_category_id,
          blog_categories (*)
        `)
        .eq('blog_post_id', postId);

      if (error) throw error;

      return (data || [])
        .map((item: any) => item.blog_categories)
        .filter(Boolean) as BlogCategory[];
    } catch (error) {
      console.error('Error fetching post categories:', error);
      return [];
    }
  },

  async getPostTags(postId: string): Promise<BlogTag[]> {
    try {
      const { data, error } = await supabase
        .from('blog_post_tags')
        .select(`
          blog_tag_id,
          blog_tags (*)
        `)
        .eq('blog_post_id', postId);

      if (error) throw error;

      return (data || [])
        .map((item: any) => item.blog_tags)
        .filter(Boolean) as BlogTag[];
    } catch (error) {
      console.error('Error fetching post tags:', error);
      return [];
    }
  },

  async fetchAllCategories(): Promise<BlogCategory[]> {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  async fetchAllTags(): Promise<BlogTag[]> {
    try {
      const { data, error } = await supabase
        .from('blog_tags')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tags:', error);
      return [];
    }
  },

  async fetchCategoryBySlug(slug: string): Promise<BlogCategory | null> {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching category by slug:', error);
      return null;
    }
  },

  async fetchTagBySlug(slug: string): Promise<BlogTag | null> {
    try {
      const { data, error } = await supabase
        .from('blog_tags')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching tag by slug:', error);
      return null;
    }
  },

  async fetchRelatedPosts(postId: string, limit: number = 4): Promise<BlogPostWithRelations[]> {
    try {
      const categories = await this.getPostCategories(postId);
      const tags = await this.getPostTags(postId);

      const categoryIds = categories.map(c => c.id);
      const tagIds = tags.map(t => t.id);

      let relatedPostIds: string[] = [];

      if (categoryIds.length > 0) {
        const { data: categoryPosts } = await supabase
          .from('blog_post_categories')
          .select('blog_post_id')
          .in('blog_category_id', categoryIds)
          .neq('blog_post_id', postId);

        if (categoryPosts) {
          relatedPostIds = categoryPosts.map(p => p.blog_post_id);
        }
      }

      if (tagIds.length > 0) {
        const { data: tagPosts } = await supabase
          .from('blog_post_tags')
          .select('blog_post_id')
          .in('blog_tag_id', tagIds)
          .neq('blog_post_id', postId);

        if (tagPosts) {
          relatedPostIds = [...new Set([...relatedPostIds, ...tagPosts.map(p => p.blog_post_id)])];
        }
      }

      if (relatedPostIds.length === 0) return [];

      const { data: posts, error } = await supabase
        .from('blog_posts')
        .select('*')
        .in('id', relatedPostIds)
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const postsWithRelations = await Promise.all(
        (posts || []).map(async (post) => {
          const postCategories = await this.getPostCategories(post.id);
          const postTags = await this.getPostTags(post.id);
          return { ...post, categories: postCategories, tags: postTags };
        })
      );

      return postsWithRelations;
    } catch (error) {
      console.error('Error fetching related posts:', error);
      return [];
    }
  },

  async incrementViewCount(postId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_blog_view_count', { post_id: postId }).maybeSingle();

      if (error) {
        await supabase
          .from('blog_posts')
          .update({ view_count: supabase.sql`view_count + 1` })
          .eq('id', postId);
      }
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  },

  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }
};
