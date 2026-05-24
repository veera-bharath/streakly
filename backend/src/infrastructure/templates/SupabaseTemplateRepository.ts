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

    if (error) {
      // PGRST116 = no rows returned — treat as not found
      if ((error as { code?: string }).code === 'PGRST116') return null;
      throw new Error(`Failed to fetch template "${name}": ${error.message}`);
    }

    return data as TemplateEntity;
  }
}
