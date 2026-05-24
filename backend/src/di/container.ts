import { MemoryCache } from '../infrastructure/cache/MemoryCache';
import { SupabaseTemplateRepository } from '../infrastructure/templates/SupabaseTemplateRepository';
import { TemplateService } from '../application/templates/TemplateService';
import { TemplateEntity } from '../core/templates/TemplateEntity';
import { ConsoleEmailProvider } from '../infrastructure/email/ConsoleEmailProvider';
import { BrevoEmailProvider } from '../infrastructure/email/BrevoEmailProvider';
import { EmailService } from '../application/email/EmailService';
import { IEmailService } from '../core/email/IEmailService';
import { IEmailProvider } from '../core/email/IEmailProvider';

let _templateService: TemplateService | undefined;
let _emailService: IEmailService | undefined;

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

function buildEmailProvider(): IEmailProvider {
  const { SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_ADDRESS, SMTP_FROM_NAME } = process.env;
  if (SMTP_HOST && SMTP_USERNAME && SMTP_PASSWORD && SMTP_FROM_ADDRESS) {
    return new BrevoEmailProvider({
      host: SMTP_HOST,
      port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
      username: SMTP_USERNAME,
      password: SMTP_PASSWORD,
      fromAddress: SMTP_FROM_ADDRESS,
      fromName: SMTP_FROM_NAME ?? 'Streakly',
    });
  }
  return new ConsoleEmailProvider();
}

// Provider is selected at first call based on env vars:
//   SMTP_* set → BrevoEmailProvider (or any SMTP relay)
//   SMTP_* absent → ConsoleEmailProvider (dev/test)
export function getEmailService(): IEmailService {
  if (!_emailService) {
    _emailService = new EmailService(getTemplateService(), buildEmailProvider());
  }
  return _emailService;
}
