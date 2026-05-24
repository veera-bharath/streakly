// Future provider — install @sendgrid/mail and uncomment when ready
// import sgMail from '@sendgrid/mail';
import { IEmailProvider, SendParams } from '../../core/email/IEmailProvider';

export class SendGridEmailProvider implements IEmailProvider {
  // constructor(private readonly apiKey: string, private readonly from: string) {
  //   sgMail.setApiKey(apiKey);
  // }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(params: SendParams): Promise<void> {
    // await sgMail.send({
    //   to: params.to,
    //   from: this.from,
    //   subject: params.subject,
    //   html: params.html,
    //   text: params.text,
    // });
    throw new Error('SendGridEmailProvider: install @sendgrid/mail and uncomment implementation');
  }
}
