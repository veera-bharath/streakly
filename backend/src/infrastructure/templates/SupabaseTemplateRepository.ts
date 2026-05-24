import { SupabaseClient } from '@supabase/supabase-js';
import { ITemplateRepository } from '../../core/templates/ITemplateRepository';
import { TemplateEntity } from '../../core/templates/TemplateEntity';

export class SupabaseTemplateRepository implements ITemplateRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findByName(name: string): Promise<TemplateEntity | null> {
    const { data, error } = await this.db
      .from('email_templates')
      .select('name, subject, html_body, text_body')
      .eq('name', name)
      .single();

    if (error || !data) return null;
    return data as TemplateEntity;
  }
}
