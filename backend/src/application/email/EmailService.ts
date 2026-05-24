import { withRetry } from '../../utils/retry';
import { IEmailService, SendTemplateParams } from '../../core/email/IEmailService';
import { IEmailProvider } from '../../core/email/IEmailProvider';
import { TemplateService } from '../templates/TemplateService';

export class EmailService implements IEmailService {
  constructor(
    private readonly templateService: TemplateService,
    private readonly provider: IEmailProvider,
  ) {}

  async sendTemplateEmail(params: SendTemplateParams): Promise<void> {
    const { to, templateName, data } = params;

    let template;
    try {
      template = await this.templateService.get(templateName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`EmailService: failed to load template "${templateName}": ${msg}`);
    }

    let subject: string, html: string, text: string | undefined;
    try {
      subject = template.subject(data);
      html    = template.html(data);
      text    = template.text?.(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`EmailService: template "${templateName}" failed to render: ${msg}`);
    }

    if (!subject || !html) {
      throw new Error(`EmailService: template "${templateName}" rendered empty subject or html`);
    }

    try {
      await withRetry(() => this.provider.send({ to, subject, html, text }));
    } catch (err) {
      console.error(`EmailService: provider failed for "${templateName}" → ${to}`, err);
      throw err;
    }
  }
}
