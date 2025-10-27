export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body_content: string;
  featured_image_url: string | null;
  author_id: string | null;
  author_name: string | null;
  status: 'draft' | 'published' | 'scheduled';
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  categories?: BlogCategory[];
  tags?: BlogTag[];
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface BlogPostWithRelations extends BlogPost {
  categories: BlogCategory[];
  tags: BlogTag[];
}

export interface CreateBlogPostData {
  title: string;
  slug: string;
  excerpt?: string;
  body_content: string;
  featured_image_url?: string;
  author_name?: string;
  status: 'draft' | 'published' | 'scheduled';
  published_at?: string;
  meta_title?: string;
  meta_description?: string;
  category_ids?: string[];
  tag_ids?: string[];
}

export interface UpdateBlogPostData extends Partial<CreateBlogPostData> {
  id: string;
}

export interface BlogPostFilters {
  status?: 'draft' | 'published' | 'scheduled';
  category_id?: string;
  tag_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface BlogPostsResponse {
  posts: BlogPostWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
