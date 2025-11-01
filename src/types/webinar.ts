// Add to existing webinar.ts file:

export type WebinarUpdateType = 'meet_link' | 'announcement' | 'material' | 'schedule_change' | 'reminder';

export interface WebinarUpdate {
  id: string;
  webinar_id: string;
  update_type: WebinarUpdateType;
  title: string;
  description?: string;
  link_url?: string;
  attachment_url?: string;
  is_published: boolean;
  publish_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WebinarUpdateView {
  id: string;
  update_id: string;
  user_id: string;
  viewed_at: string;
}

export interface WebinarUpdateWithViewStatus extends WebinarUpdate {
  is_viewed?: boolean;
}

export interface CreateWebinarUpdateData {
  webinar_id: string;
  update_type: WebinarUpdateType;
  title: string;
  description?: string;
  link_url?: string;
  attachment_url?: string;
  is_published?: boolean;
  publish_at?: string;
}

export interface UpdateWebinarUpdateData extends Partial<CreateWebinarUpdateData> {
  id: string;
}
