import { TemplateEntity } from './TemplateEntity';

export interface ITemplateRepository {
  findByName(name: string): Promise<TemplateEntity | null>;
}
