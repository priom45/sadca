// src/services/externalBrowserService.ts
import { AutoApplyRequest, AutoApplyResponse, FormAnalysisResult } from '../types/autoApply';

class ExternalBrowserService {
  private baseUrl: string;
  private apiKey: string;
  private useSupabaseFunctions: boolean;

  constructor() {
    const externalUrl = import.meta.env.VITE_EXTERNAL_BROWSER_SERVICE_URL;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    this.useSupabaseFunctions = !externalUrl || externalUrl === '';
    this.baseUrl = this.useSupabaseFunctions
      ? `${supabaseUrl}/functions/v1`
      : externalUrl;
    this.apiKey = import.meta.env.VITE_EXTERNAL_BROWSER_API_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  }

  /**
   * Analyzes a job application form to understand its structure
   */
  async analyzeApplicationForm(applicationUrl: string): Promise<FormAnalysisResult> {
    try {
      const response = await fetch(`${this.baseUrl}/analyze-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Origin': 'primoboost-ai',
        },
        body: JSON.stringify({ url: applicationUrl }),
      });

      if (!response.ok) {
        throw new Error(`Form analysis failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing application form:', error);
      throw new Error('Failed to analyze application form structure');
    }
  }

  /**
   * Submits an auto-apply request to the external browser service
   */
  async submitAutoApply(request: AutoApplyRequest): Promise<AutoApplyResponse> {
    try {
      console.log('ExternalBrowserService: Submitting auto-apply request...');

      const response = await fetch(`${this.baseUrl}/auto-apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Origin': 'primoboost-ai',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(180000), // 3 minute timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Auto-apply request failed: ${response.status} - ${errorText}`);
      }

      const result: AutoApplyResponse = await response.json();
      console.log('ExternalBrowserService: Auto-apply completed:', result.success);

      return result;
    } catch (error) {
      console.error('Error in submitAutoApply:', error);
      throw error;
    }
  }

  /**
   * Gets the status of an ongoing auto-apply process
   */
  async getAutoApplyStatus(applicationId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    currentStep?: string;
    estimatedTimeRemaining?: number;
  }> {
    try {
      const endpoint = this.useSupabaseFunctions
        ? `${this.baseUrl}/auto-apply-status/${applicationId}`
        : `${this.baseUrl}/auto-apply/status/${applicationId}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Origin': 'primoboost-ai',
          'apikey': this.apiKey,
        },
      });

      if (!response.ok) {
        console.warn(`Status check returned ${response.status}, returning default status`);
        return {
          status: 'processing',
          progress: 50,
          currentStep: 'Processing application...',
          estimatedTimeRemaining: 60,
        };
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking auto-apply status:', error);
      return {
        status: 'processing',
        progress: 50,
        currentStep: 'Processing application...',
        estimatedTimeRemaining: 60,
      };
    }
  }

  /**
   * Cancels an ongoing auto-apply process
   */
  async cancelAutoApply(applicationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auto-apply/cancel/${applicationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Origin': 'primoboost-ai',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error canceling auto-apply:', error);
      return false;
    }
  }

  /**
   * Test connectivity to the external browser service
   */
  async testConnection(): Promise<boolean> {
    try {
      if (this.useSupabaseFunctions) {
        return true;
      }

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Origin': 'primoboost-ai',
        },
        signal: AbortSignal.timeout(10000),
      });

      return response.ok;
    } catch (error) {
      console.error('External browser service connection test failed:', error);
      return false;
    }
  }

  /**
   * Check if service is using Supabase functions (mock mode)
   */
  isUsingMockMode(): boolean {
    return this.useSupabaseFunctions;
  }
}

export const externalBrowserService = new ExternalBrowserService();