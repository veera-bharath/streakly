import Handlebars from 'handlebars';
import { ICache } from '../../core/cache/ICache';
import { ITemplateRepository } from '../../core/templates/ITemplateRepository';
import { TemplateEntity } from '../../core/templates/TemplateEntity';
import { CompiledTemplate } from '../../core/templates/CompiledTemplate';

const CACHE_TTL_SECONDS = 600;
const cacheKey = (name: string) => `template:${name}`;

function compile(entity: TemplateEntity): CompiledTemplate {
  return {
    subject: Handlebars.compile(entity.subject),
    html:    Handlebars.compile(entity.html_body),
    text:    entity.text_body ? Handlebars.compile(entity.text_body) : undefined,
  };
}

export class TemplateService {
  // deduplicates concurrent misses for the same template name
  private readonly inflight = new Map<string, Promise<CompiledTemplate>>();

  constructor(
    private readonly cache: ICache<TemplateEntity>,
    private readonly repo: ITemplateRepository,
  ) {}

  async get(name: string): Promise<CompiledTemplate> {
    const cached = await this.cache.get(cacheKey(name));
    if (cached) return compile(cached);

    const existing = this.inflight.get(name);
    if (existing) return existing;

    const promise = this._fetchAndCache(name);
    this.inflight.set(name, promise);
    try {
      return await promise;
    } finally {
      this.inflight.delete(name);
    }
  }

  private async _fetchAndCache(name: string): Promise<CompiledTemplate> {
    const entity = await this.repo.findByName(name);
    if (!entity) throw new Error(`Template not found: ${name}`);
    await this.cache.set(cacheKey(name), entity, CACHE_TTL_SECONDS);
    return compile(entity);
  }

  async invalidate(name: string): Promise<void> {
    await this.cache.delete(cacheKey(name));
  }
}
