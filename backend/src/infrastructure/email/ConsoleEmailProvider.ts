import { IEmailProvider, SendParams } from '../../core/email/IEmailProvider';

export class ConsoleEmailProvider implements IEmailProvider {
  async send(params: SendParams): Promise<void> {
    console.log('--- [Email] ---');
    console.log('To:     ', params.to);
    console.log('Subject:', params.subject);
    console.log('HTML:   ', params.html);
    if (params.text) console.log('Text:   ', params.text);
    console.log('---------------');
  }
}
