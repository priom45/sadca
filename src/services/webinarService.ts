import { supabase } from '../lib/supabaseClient';
import type {
  Webinar,
  WebinarWithSpeakers,
  WebinarSpeaker,
  WebinarTestimonial,
  WebinarRegistration,
  WebinarRegistrationWithDetails,
  WebinarRegistrationFormData,
  WebinarEmailLog,
  CreateWebinarData,
  UpdateWebinarData,
  WebinarFilters,
  WebinarStats
} from '../types/webinar';

class WebinarService {
  async getAllWebinars(filters?: WebinarFilters): Promise<Webinar[]> {
    let query = supabase
      .from('webinars')
      .select('*')
      .order('scheduled_at', { ascending: true });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.is_featured !== undefined) {
      query = query.eq('is_featured', filters.is_featured);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters?.from_date) {
      query = query.gte('scheduled_at', filters.from_date);
    }

    if (filters?.to_date) {
      query = query.lte('scheduled_at', filters.to_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching webinars:', error);
      throw new Error('Failed to fetch webinars');
    }

    return data || [];
  }

  async getWebinarBySlug(slug: string): Promise<WebinarWithSpeakers | null> {
    const { data: webinar, error } = await supabase
      .from('webinars')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('Error fetching webinar:', error);
      throw new Error('Failed to fetch webinar');
    }

    if (!webinar) {
      return null;
    }

    if (webinar.speaker_ids && webinar.speaker_ids.length > 0) {
      const { data: speakers } = await supabase
        .from('webinar_speakers')
        .select('*')
        .in('id', webinar.speaker_ids);

      return {
        ...webinar,
        speakers: speakers || []
      };
    }

    return webinar;
  }

  async getWebinarById(id: string): Promise<WebinarWithSpeakers | null> {
    const { data: webinar, error } = await supabase
      .from('webinars')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching webinar:', error);
      throw new Error('Failed to fetch webinar');
    }

    if (!webinar) {
      return null;
    }

    if (webinar.speaker_ids && webinar.speaker_ids.length > 0) {
      const { data: speakers } = await supabase
        .from('webinar_speakers')
        .select('*')
        .in('id', webinar.speaker_ids);

      return {
        ...webinar,
        speakers: speakers || []
      };
    }

    return webinar;
  }

  async getUpcomingWebinars(limit?: number): Promise<Webinar[]> {
    let query = supabase
      .from('webinars')
      .select('*')
      .eq('status', 'upcoming')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching upcoming webinars:', error);
      throw new Error('Failed to fetch upcoming webinars');
    }

    return data || [];
  }

  async getFeaturedWebinars(): Promise<Webinar[]> {
    const { data, error } = await supabase
      .from('webinars')
      .select('*')
      .eq('is_featured', true)
      .eq('status', 'upcoming')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(3);

    if (error) {
      console.error('Error fetching featured webinars:', error);
      throw new Error('Failed to fetch featured webinars');
    }

    return data || [];
  }

  async checkWebinarCapacity(webinarId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('check_webinar_capacity', { p_webinar_id: webinarId });

    if (error) {
      console.error('Error checking webinar capacity:', error);
      return false;
    }

    return data === true;
  }

  async createRegistration(
    webinarId: string,
    userId: string,
    formData: WebinarRegistrationFormData
  ): Promise<WebinarRegistration> {
    const { data, error } = await supabase
      .from('webinar_registrations')
      .insert({
        webinar_id: webinarId,
        user_id: userId,
        full_name: formData.full_name,
        email: formData.email,
        college_name: formData.college_name,
        year_of_study: formData.year_of_study,
        branch: formData.branch,
        phone_number: formData.phone_number,
        registration_status: 'pending',
        payment_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating registration:', error);
      throw new Error('Failed to create registration');
    }

    return data;
  }

  async updateRegistrationPayment(
    registrationId: string,
    paymentTransactionId: string,
    paymentStatus: 'completed' | 'failed'
  ): Promise<void> {
    const updateData: any = {
      payment_transaction_id: paymentTransactionId,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    };

    if (paymentStatus === 'completed') {
      updateData.registration_status = 'confirmed';
    }

    const { error } = await supabase
      .from('webinar_registrations')
      .update(updateData)
      .eq('id', registrationId);

    if (error) {
      console.error('Error updating registration payment:', error);
      throw new Error('Failed to update registration payment');
    }
  }

  async getUserRegistrations(userId: string): Promise<WebinarRegistrationWithDetails[]> {
    const { data, error } = await supabase
      .from('webinar_registrations')
      .select(`
        *,
        webinar:webinars(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user registrations:', error);
      throw new Error('Failed to fetch registrations');
    }

    return data || [];
  }

  async getRegistrationById(registrationId: string): Promise<WebinarRegistrationWithDetails | null> {
    const { data, error } = await supabase
      .from('webinar_registrations')
      .select(`
        *,
        webinar:webinars(*)
      `)
      .eq('id', registrationId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching registration:', error);
      throw new Error('Failed to fetch registration');
    }

    return data;
  }

  async checkUserRegistration(userId: string, webinarId: string): Promise<WebinarRegistration | null> {
    const { data, error } = await supabase
      .from('webinar_registrations')
      .select('*')
      .eq('user_id', userId)
      .eq('webinar_id', webinarId)
      .maybeSingle();

    if (error) {
      console.error('Error checking user registration:', error);
      return null;
    }

    return data;
  }

  async getAllSpeakers(): Promise<WebinarSpeaker[]> {
    const { data, error } = await supabase
      .from('webinar_speakers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching speakers:', error);
      throw new Error('Failed to fetch speakers');
    }

    return data || [];
  }

  async getSpeakersByIds(speakerIds: string[]): Promise<WebinarSpeaker[]> {
    if (!speakerIds || speakerIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('webinar_speakers')
      .select('*')
      .in('id', speakerIds);

    if (error) {
      console.error('Error fetching speakers:', error);
      throw new Error('Failed to fetch speakers');
    }

    return data || [];
  }

  async getTestimonials(featuredOnly: boolean = false): Promise<WebinarTestimonial[]> {
    let query = supabase
      .from('webinar_testimonials')
      .select('*')
      .order('created_at', { ascending: false });

    if (featuredOnly) {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching testimonials:', error);
      throw new Error('Failed to fetch testimonials');
    }

    return data || [];
  }

  async createWebinar(webinarData: CreateWebinarData, createdBy: string): Promise<Webinar> {
    const { data, error } = await supabase
      .from('webinars')
      .insert({
        ...webinarData,
        created_by: createdBy
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating webinar:', error);
      throw new Error('Failed to create webinar');
    }

    return data;
  }

  async updateWebinar(webinarData: UpdateWebinarData): Promise<Webinar> {
    const { id, ...updateData } = webinarData;

    const { data, error } = await supabase
      .from('webinars')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating webinar:', error);
      throw new Error('Failed to update webinar');
    }

    return data;
  }

  async deleteWebinar(webinarId: string): Promise<void> {
    const { error } = await supabase
      .from('webinars')
      .delete()
      .eq('id', webinarId);

    if (error) {
      console.error('Error deleting webinar:', error);
      throw new Error('Failed to delete webinar');
    }
  }

  async getWebinarRegistrations(webinarId: string): Promise<WebinarRegistration[]> {
    const { data, error } = await supabase
      .from('webinar_registrations')
      .select('*')
      .eq('webinar_id', webinarId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching webinar registrations:', error);
      throw new Error('Failed to fetch registrations');
    }

    return data || [];
  }

  async getWebinarStats(): Promise<WebinarStats> {
    const { data: webinars } = await supabase
      .from('webinars')
      .select('id, status, current_attendees, max_attendees');

    const { data: registrations } = await supabase
      .from('webinar_registrations')
      .select('payment_status, payment_transaction_id')
      .eq('payment_status', 'completed');

    const totalWebinars = webinars?.length || 0;
    const upcomingWebinars = webinars?.filter(w => w.status === 'upcoming').length || 0;
    const totalRegistrations = registrations?.length || 0;

    const completedWebinars = webinars?.filter(w => w.status === 'completed') || [];
    const totalAttendees = completedWebinars.reduce((sum, w) => sum + (w.current_attendees || 0), 0);
    const totalCapacity = completedWebinars.reduce((sum, w) => sum + (w.max_attendees || 0), 0);
    const averageAttendance = totalCapacity > 0 ? (totalAttendees / totalCapacity) * 100 : 0;

    return {
      total_webinars: totalWebinars,
      upcoming_webinars: upcomingWebinars,
      total_registrations: totalRegistrations,
      total_revenue: 0,
      average_attendance: Math.round(averageAttendance)
    };
  }

  async createSpeaker(speakerData: Omit<WebinarSpeaker, 'id' | 'created_at' | 'updated_at'>): Promise<WebinarSpeaker> {
    const { data, error } = await supabase
      .from('webinar_speakers')
      .insert(speakerData)
      .select()
      .single();

    if (error) {
      console.error('Error creating speaker:', error);
      throw new Error('Failed to create speaker');
    }

    return data;
  }

  async updateSpeaker(speakerId: string, speakerData: Partial<WebinarSpeaker>): Promise<WebinarSpeaker> {
    const { data, error } = await supabase
      .from('webinar_speakers')
      .update({
        ...speakerData,
        updated_at: new Date().toISOString()
      })
      .eq('id', speakerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating speaker:', error);
      throw new Error('Failed to update speaker');
    }

    return data;
  }

  async deleteSpeaker(speakerId: string): Promise<void> {
    const { error } = await supabase
      .from('webinar_speakers')
      .delete()
      .eq('id', speakerId);

    if (error) {
      console.error('Error deleting speaker:', error);
      throw new Error('Failed to delete speaker');
    }
  }

  async createTestimonial(testimonialData: Omit<WebinarTestimonial, 'id' | 'created_at'>): Promise<WebinarTestimonial> {
    const { data, error } = await supabase
      .from('webinar_testimonials')
      .insert(testimonialData)
      .select()
      .single();

    if (error) {
      console.error('Error creating testimonial:', error);
      throw new Error('Failed to create testimonial');
    }

    return data;
  }

  async updateTestimonial(testimonialId: string, testimonialData: Partial<WebinarTestimonial>): Promise<WebinarTestimonial> {
    const { data, error } = await supabase
      .from('webinar_testimonials')
      .update(testimonialData)
      .eq('id', testimonialId)
      .select()
      .single();

    if (error) {
      console.error('Error updating testimonial:', error);
      throw new Error('Failed to update testimonial');
    }

    return data;
  }

  async deleteTestimonial(testimonialId: string): Promise<void> {
    const { error } = await supabase
      .from('webinar_testimonials')
      .delete()
      .eq('id', testimonialId);

    if (error) {
      console.error('Error deleting testimonial:', error);
      throw new Error('Failed to delete testimonial');
    }
  }

  async logEmail(emailLog: Omit<WebinarEmailLog, 'id' | 'sent_at'>): Promise<void> {
    const { error } = await supabase
      .from('webinar_email_logs')
      .insert(emailLog);

    if (error) {
      console.error('Error logging email:', error);
    }
  }
}

export const webinarService = new WebinarService();
