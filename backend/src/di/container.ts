import { db } from '../store/db';
import { MemoryCache } from '../infrastructure/cache/MemoryCache';
import { SupabaseTemplateRepository } from '../infrastructure/templates/SupabaseTemplateRepository';
import { TemplateService } from '../application/templates/TemplateService';
import { CompiledTemplate } from '../core/templates/CompiledTemplate';

const templateCache = new MemoryCache<CompiledTemplate>();
const templateRepo  = new SupabaseTemplateRepository(db);
export const templateService = new TemplateService(templateCache, templateRepo);
