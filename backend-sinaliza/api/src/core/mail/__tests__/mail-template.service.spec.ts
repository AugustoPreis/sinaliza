import * as fs from 'fs';

import { MailTemplateService } from '../mail-template.service';

// `fs` re-exposed through TS's namespace-import getters can't be redefined by
// `jest.spyOn` (it throws "Cannot redefine property"); the raw CJS module
// object returned by `jest.requireActual` is what those getters read from,
// and it stays configurable.
const rawFs = jest.requireActual<typeof fs>('fs');

const RENDER_CONTEXT = {
  appName: 'Acme',
  disclaimer: 'All rights reserved',
  preheader: 'Reset your password',
  greeting: 'Hi User',
  body: 'Click below to reset your password.',
  resetUrl: 'https://example.com/reset/abc123',
  buttonLabel: 'Reset password',
  linkFallback: 'Or copy this link:',
  footer: 'If you did not request this, ignore this email.',
};

describe('MailTemplateService', () => {
  let service: MailTemplateService;

  beforeEach(() => {
    service = new MailTemplateService();
    service.onModuleInit();
  });

  describe('render', () => {
    it('renders the password-reset template inside the base layout', () => {
      const html = service.render('password-reset', RENDER_CONTEXT);

      expect(html).toContain('Acme');
      expect(html).toContain('Hi User');
      expect(html).toContain('https://example.com/reset/abc123');
      expect(html).toContain('Reset password');
      expect(html).toContain('All rights reserved');
    });

    it('caches the compiled template so a second render does not re-read the file', () => {
      const readFileSyncSpy = jest.spyOn(rawFs, 'readFileSync');

      service.render('password-reset', RENDER_CONTEXT);
      const readsAfterFirstRender = readFileSyncSpy.mock.calls.length;

      service.render('password-reset', RENDER_CONTEXT);

      expect(readFileSyncSpy.mock.calls.length).toBe(readsAfterFirstRender);

      readFileSyncSpy.mockRestore();
    });
  });
});
