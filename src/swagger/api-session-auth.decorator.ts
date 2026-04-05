import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SWAGGER_BEARER_AUTH } from './constants';

/** Use JWT from login: Authorization Bearer, or the same token in the cookie (Swagger / browser). */
export function ApiSessionAuth() {
  return applyDecorators(
    ApiBearerAuth(SWAGGER_BEARER_AUTH),
    ApiUnauthorizedResponse({ description: 'Missing or invalid JWT (use POST /api/auth/login, then Authorize with Bearer or rely on cookie).' }),
  );
}
