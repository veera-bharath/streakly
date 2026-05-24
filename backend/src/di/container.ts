import { MemoryCache } from '../infrastructure/cache/MemoryCache';
import { SupabaseTemplateRepository } from '../infrastructure/templates/SupabaseTemplateRepository';
import { TemplateService } from '../application/templates/TemplateService';
import { TemplateEntity } from '../core/templates/TemplateEntity';

let _service: TemplateService | undefined;

// lazy singleton — db client is created on first call so env-var validation
// is deferred until the service is actually used (safe to import in tests)
export function getTemplateService(): TemplateService {
  if (!_service) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { db } = require('../store/db') as typeof import('../store/db');
    _service = new TemplateService(
      new MemoryCache<TemplateEntity>(),
      new SupabaseTemplateRepository(db),
    );
  }
  return _service;
}
