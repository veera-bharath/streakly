// Future provider — install resend and uncomment when ready
// import { Resend } from 'resend';
import { IEmailProvider, SendParams } from '../../core/email/IEmailProvider';

export class ResendEmailProvider implements IEmailProvider {
  // private readonly client: Resend;

  // constructor(apiKey: string, private readonly from: string) {
  //   this.client = new Resend(apiKey);
  // }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(params: SendParams): Promise<void> {
    // await this.client.emails.send({
    //   to: params.to,
    //   from: this.from,
    //   subject: params.subject,
    //   html: params.html,
    //   text: params.text,
    // });
    throw new Error('ResendEmailProvider: install resend and uncomment implementation');
  }
}
