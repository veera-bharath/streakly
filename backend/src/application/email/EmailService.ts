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
      throw new Error(`EmailService: template "${templateName}" not found. ${(err as Error).message}`);
    }

    const subject = template.subject(data);
    const html    = template.html(data);
    const text    = template.text?.(data);

    if (!subject || !html) {
      throw new Error(`EmailService: template "${templateName}" rendered empty subject or html`);
    }

    try {
      await this.provider.send({ to, subject, html, text });
    } catch (err) {
      console.error(`EmailService: provider failed for "${templateName}" → ${to}`, err);
      throw err;
    }
  }
}
