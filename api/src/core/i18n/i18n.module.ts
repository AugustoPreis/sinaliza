import * as path from 'path';

import { Module } from '@nestjs/common';
import { AcceptLanguageResolver, I18nJsonLoader, I18nModule as NestI18nModule } from 'nestjs-i18n';

@Module({
  imports: [
    NestI18nModule.forRootAsync({
      useFactory: () => ({
        fallbackLanguage: 'pt-BR',
        useICU: true,
        loaderOptions: {
          path: path.join(__dirname, 'locales'),
          watch: process.env.NODE_ENV !== 'production',
        },
      }),
      loader: I18nJsonLoader,
      resolvers: [AcceptLanguageResolver],
    }),
  ],
  exports: [NestI18nModule],
})
export class I18nModule {}
