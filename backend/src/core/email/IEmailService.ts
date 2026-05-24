export interface SendTemplateParams {
  to: string;
  templateName: string;
  data: Record<string, unknown>;
}

export interface IEmailService {
  sendTemplateEmail(params: SendTemplateParams): Promise<void>;
}
