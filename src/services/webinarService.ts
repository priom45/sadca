// Add these methods to the WebinarService class:

  // Webinar Updates Methods
  async getWebinarUpdates(webinarId: string, userId?: string): Promise<WebinarUpdateWithViewStatus[]> {
    let query = supabase
      .from('webinar_updates')
      .select('*')
      .eq('webinar_id', webinarId)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    const { data: updates, error } = await query;

    if (error) {
      console.error('Error fetching webinar updates:', error);
      throw new Error('Failed to fetch webinar updates');
    }

    if (!updates || !userId) {
      return updates || [];
    }

    // Get viewed status for user
    const { data: views } = await supabase
      .from('webinar_update_views')
      .select('update_id')
      .eq('user_id', userId)
      .in('update_id', updates.map(u => u.id));

    const viewedIds = new Set((views || []).map(v => v.update_id));

    return updates.map(update => ({
      ...update,
      is_viewed: viewedIds.has(update.id)
    }));
  }

  async getUnreadUpdatesCount(userId: string, webinarId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('get_unread_webinar_updates_count', {
        p_user_id: userId,
        p_webinar_id: webinarId
      });

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return data || 0;
  }

  async markUpdateAsViewed(updateId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('webinar_update_views')
      .upsert({
        update_id: updateId,
        user_id: userId
      }, {
        onConflict: 'update_id,user_id'
      });

    if (error) {
      console.error('Error marking update as viewed:', error);
    }
  }

  async markAllUpdatesAsViewed(webinarId: string, userId: string): Promise<void> {
    const { data: updates } = await supabase
      .from('webinar_updates')
      .select('id')
      .eq('webinar_id', webinarId)
      .eq('is_published', true);

    if (!updates || updates.length === 0) return;

    const views = updates.map(u => ({
      update_id: u.id,
      user_id: userId
    }));

    const { error } = await supabase
      .from('webinar_update_views')
      .upsert(views, {
        onConflict: 'update_id,user_id'
      });

    if (error) {
      console.error('Error marking all updates as viewed:', error);
    }
  }

  // Admin methods
  async createWebinarUpdate(updateData: CreateWebinarUpdateData): Promise<WebinarUpdate> {
    const { data, error } = await supabase
      .from('webinar_updates')
      .insert(updateData)
      .select()
      .single();

    if (error) {
      console.error('Error creating webinar update:', error);
      throw new Error('Failed to create webinar update');
    }

    return data;
  }

  async updateWebinarUpdate(updateData: UpdateWebinarUpdateData): Promise<WebinarUpdate> {
    const { id, ...updateFields } = updateData;

    const { data, error } = await supabase
      .from('webinar_updates')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating webinar update:', error);
      throw new Error('Failed to update webinar update');
    }

    return data;
  }

  async deleteWebinarUpdate(updateId: string): Promise<void> {
    const { error } = await supabase
      .from('webinar_updates')
      .delete()
      .eq('id', updateId);

    if (error) {
      console.error('Error deleting webinar update:', error);
      throw new Error('Failed to delete webinar update');
    }
  }

  async getAllWebinarUpdates(webinarId: string): Promise<WebinarUpdate[]> {
    const { data, error } = await supabase
      .from('webinar_updates')
      .select('*')
      .eq('webinar_id', webinarId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all webinar updates:', error);
      throw new Error('Failed to fetch webinar updates');
    }

    return data || [];
  }
