import nodemailer from 'nodemailer';
import { IEmailProvider, SendParams } from '../../core/email/IEmailProvider';

export interface BrevoConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  fromAddress: string;
  fromName: string;
}

export class BrevoEmailProvider implements IEmailProvider {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(config: BrevoConfig) {
    this.from = `"${config.fromName}" <${config.fromAddress}>`;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      // port 587 uses STARTTLS (not SSL); secure:false + requireTLS:true is correct
      secure: false,
      requireTLS: true,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });
  }

  async send(params: SendParams): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
  }
}
