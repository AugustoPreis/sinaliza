export interface IMailJob {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}
