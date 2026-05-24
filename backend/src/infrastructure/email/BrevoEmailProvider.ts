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
    // Reject control characters and double-quotes that would break the RFC 5322 From header
    if (/["\r\n]/.test(config.fromName)) {
      throw new Error(`BrevoEmailProvider: fromName contains illegal characters`);
    }
    if (/[<>\r\n]/.test(config.fromAddress)) {
      throw new Error(`BrevoEmailProvider: fromAddress contains illegal characters`);
    }

    this.from = `"${config.fromName}" <${config.fromAddress}>`;

    // port 587 uses STARTTLS (not SSL); secure:false + requireTLS:true is correct
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false,
      requireTLS: true,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });

    // verify credentials at startup so misconfiguration surfaces immediately
    this.transporter.verify().catch((err: Error) =>
      console.error('BrevoEmailProvider: SMTP verify failed —', err.message),
    );
  }

  async send(params: SendParams): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.text !== undefined && { text: params.text }),
    });
  }
}
