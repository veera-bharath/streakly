import Handlebars from 'handlebars';
import { ICache } from '../../core/cache/ICache';
import { ITemplateRepository } from '../../core/templates/ITemplateRepository';
import { CompiledTemplate } from '../../core/templates/CompiledTemplate';

const CACHE_TTL_SECONDS = 600;
const cacheKey = (name: string) => `template:${name}`;

export class TemplateService {
  constructor(
    private readonly cache: ICache<CompiledTemplate>,
    private readonly repo: ITemplateRepository,
  ) {}

  async get(name: string): Promise<CompiledTemplate> {
    const cached = await this.cache.get(cacheKey(name));
    if (cached) return cached;

    const entity = await this.repo.findByName(name);
    if (!entity) throw new Error(`Template not found: ${name}`);

    const compiled: CompiledTemplate = {
      subject: Handlebars.compile(entity.subject),
      html:    Handlebars.compile(entity.html_body),
      text:    entity.text_body ? Handlebars.compile(entity.text_body) : undefined,
    };

    await this.cache.set(cacheKey(name), compiled, CACHE_TTL_SECONDS);
    return compiled;
  }

  async invalidate(name: string): Promise<void> {
    await this.cache.delete(cacheKey(name));
  }
}
