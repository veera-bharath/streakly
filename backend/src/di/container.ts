import { MemoryCache } from '../infrastructure/cache/MemoryCache';
import { SupabaseTemplateRepository } from '../infrastructure/templates/SupabaseTemplateRepository';
import { TemplateService } from '../application/templates/TemplateService';
import { TemplateEntity } from '../core/templates/TemplateEntity';
import { ConsoleEmailProvider } from '../infrastructure/email/ConsoleEmailProvider';
import { EmailService } from '../application/email/EmailService';

let _templateService: TemplateService | undefined;
let _emailService: EmailService | undefined;

// lazy singleton — db client is created on first call so env-var validation
// is deferred until the service is actually used (safe to import in tests)
export function getTemplateService(): TemplateService {
  if (!_templateService) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { db } = require('../store/db') as typeof import('../store/db');
    _templateService = new TemplateService(
      new MemoryCache<TemplateEntity>(),
      new SupabaseTemplateRepository(db),
    );
  }
  return _templateService;
}

// Swap ConsoleEmailProvider for SendGridEmailProvider / ResendEmailProvider in production
export function getEmailService(): EmailService {
  if (!_emailService) {
    _emailService = new EmailService(getTemplateService(), new ConsoleEmailProvider());
  }
  return _emailService;
}
