import * as fs from 'fs';
import * as path from 'path';

import { Injectable, OnModuleInit } from '@nestjs/common';
import Handlebars from 'handlebars';

@Injectable()
export class MailTemplateService implements OnModuleInit {
  private readonly templatesDir = path.join(__dirname, 'templates');
  private readonly compiledTemplates = new Map<string, Handlebars.TemplateDelegate>();

  onModuleInit(): void {
    this.registerPartial('base', path.join(this.templatesDir, 'layouts', 'base.hbs'));
    this.registerPartial('button', path.join(this.templatesDir, 'partials', 'button.hbs'));
  }

  render(template: string, context: Record<string, unknown>): string {
    return this.getCompiledTemplate(template)(context);
  }

  private registerPartial(name: string, filePath: string): void {
    Handlebars.registerPartial(name, fs.readFileSync(filePath, 'utf-8'));
  }

  private getCompiledTemplate(template: string): Handlebars.TemplateDelegate {
    const cached = this.compiledTemplates.get(template);

    if (cached) {
      return cached;
    }

    const templatePath = path.join(this.templatesDir, `${template}.hbs`);
    const compiled = Handlebars.compile(fs.readFileSync(templatePath, 'utf-8'));

    this.compiledTemplates.set(template, compiled);

    return compiled;
  }
}
