import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { XSRF_COOKIE_NAME, XSRF_HEADER_NAME } from '@shared/guards/csrf.guard';

export interface ILoginAsResult {
  agent: ReturnType<typeof request.agent>;
  csrfHeader: Record<string, string>;
}

export async function loginAs(
  app: INestApplication,
  credentials: { email: string; password: string },
): Promise<ILoginAsResult> {
  const prefix = process.env.API_PREFIX || 'api';
  const agent = request.agent(app.getHttpServer());

  const response = await agent
    .post(`/${prefix}/v1/auth/login`)
    .send({ identifier: credentials.email, password: credentials.password })
    .expect(200);

  const setCookieHeader = response.headers['set-cookie'] as unknown as string[];
  const xsrfCookie = setCookieHeader.find((cookie) => cookie.startsWith(`${XSRF_COOKIE_NAME}=`));
  const xsrfToken = xsrfCookie?.split(';')[0].split('=')[1];

  return {
    agent,
    csrfHeader: xsrfToken ? { [XSRF_HEADER_NAME]: xsrfToken } : {},
  };
}
