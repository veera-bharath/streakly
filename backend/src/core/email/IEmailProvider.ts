export interface SendParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailProvider {
  send(params: SendParams): Promise<void>;
}
