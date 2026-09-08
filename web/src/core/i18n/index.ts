import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import account from './locales/pt-BR/account.json';
import admin from './locales/pt-BR/admin.json';
import auth from './locales/pt-BR/auth.json';
import common from './locales/pt-BR/common.json';
import errors from './locales/pt-BR/errors.json';
import tickets from './locales/pt-BR/tickets.json';
import validation from './locales/pt-BR/validation.json';

export const I18N_LOCALE = 'pt-BR';
export const I18N_DEFAULT_NAMESPACE = 'common';

void i18next.use(initReactI18next).init({
  lng: I18N_LOCALE,
  fallbackLng: I18N_LOCALE,
  defaultNS: I18N_DEFAULT_NAMESPACE,
  resources: {
    [I18N_LOCALE]: { account, admin, auth, common, errors, tickets, validation },
  },
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { i18next };
