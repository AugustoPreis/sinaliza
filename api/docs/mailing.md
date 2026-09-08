# E-mail

## Core rule: `MailService` is only called by `MailProcessor`

No use-case should inject `core/mail/mail.service.ts` (`MailService`) directly, or build HTML by
string concatenation. The only entry point for the rest of the application is
`MailerService.enqueue(job)`: it only enqueues (see [background-jobs.md](./background-jobs.md)
for the queueing mechanism itself). The one thing that actually calls `MailService.send()` is
`MailProcessor`, while processing the job.

This exists to guarantee two things at once: (1) every e-mail goes through the queue, never sent
synchronously blocking an HTTP response; (2) every e-mail body comes from a versioned `.hbs`
template, never HTML hand-built inside a use-case.

## Job contract

```ts
interface IMailJob {
  to: string;
  subject: string; // already translated by the caller
  template: string; // file name under templates/, without extension
  context: Record<string, unknown>; // already fully translated text
}
```

Important design decision: **the job carries already-resolved data**, not translation keys or a
`locale`. Whoever enqueues (the use-case) already has `I18nService` and the request's `locale`: it
resolves `i18n.translate(...)` itself to build `subject` and `context`. Neither `MailProcessor` nor
`MailTemplateService` know anything about i18n: they only receive final strings and a template
name. This keeps the job self-contained (it doesn't depend on the translation catalog being
unchanged between enqueueing and processing) and keeps the processor simple.

## Creating a new template

1. Create `core/mail/templates/<name>.hbs`. To reuse the shared shell (header with the
   application name, footer), wrap the content with the `base` partial block:

   ```hbs
   {{#> base}}
     <p>{{greeting}}</p>
     <p>{{body}}</p>
   {{/base}}
   ```

   `templates/layouts/base.hbs` is the shell: it references `{{> @partial-block}}` at the point
   where the template-specific content goes. This is Handlebars' native mechanism for layouts
   (there's no template inheritance like Nunjucks/Twig; a partial block is the equivalent).
   The shell renders a full HTML document (doctype, table-based layout, dark-mode/mobile
   `<style>` block) so it works consistently across webmail, desktop and mobile clients.

   For a call-to-action button, use the `button` partial instead of a plain `<a>`: it renders a
   bulletproof button (table cell + VML fallback for Outlook's Word rendering engine):

   ```hbs
   {{> button url=resetUrl label=buttonLabel}}
   ```

   Any hash argument passed to a partial (or partial block, like `preheader=body` on `base`) is
   merged into that partial's context: that's how `base.hbs` receives the preheader text and
   `button.hbs` receives `url`/`label` without the caller needing to change the job's `context`
   shape.

2. No manual registration is needed beyond that: `MailTemplateService` reads and compiles the
   `.hbs` on demand (`fs.readFileSync` + `Handlebars.compile`), with an in-memory cache per
   template name (it doesn't recompile on every send). The `base` and `button` partials are
   registered once at module boot (`onModuleInit`).

3. In the use-case that enqueues the e-mail, resolve every string via `i18n.translate(...)` and
   build `context` with those already-translated strings plus any dynamic data (e.g. a URL). See
   `ForgotPasswordUseCase` as a full reference.

4. **Important for the build**: `.hbs` files aren't TypeScript; they need to be listed in
   `nest-cli.json` → `compilerOptions.assets` to be copied into `dist/` for the
   production build (the same mechanism already used for the i18n locale JSON files). A new
   template inside `core/mail/templates/` is already covered by the existing glob; only a
   directory outside that tree would need a new entry.

## Why the queue, not a synchronous send

Sending an e-mail is a network call to an external service (SMTP) outside the application's
control: it can be slow or fail transiently. Enqueuing means the HTTP response of the endpoint
that triggered the e-mail never waits on it, and an SMTP failure never turns into a 500 for the
user. The retry policy (`attempts: 3`, exponential backoff) and the final-failure log are
documented in [background-jobs.md](./background-jobs.md).

## Development environment

In dev, `MAIL_HOST`/`MAIL_PORT` point at the MailHog container from
`docker-compose.override.yml`: every e-mail sent is captured there
(`http://localhost:8025`), never actually delivered.
