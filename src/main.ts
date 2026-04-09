import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.use(cookieParser());
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((err) =>
          err.constraints ? Object.values(err.constraints) : [`Invalid value for "${err.property}"`],
        );
        return new BadRequestException(messages.length ? messages : 'Validation failed.');
      },
    }),
  );

  const cookieName = configService.get<string>('COOKIE_NAME') ?? 'hrs_access_token';
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hotel Reservation API')
    .setDescription(
      [
        'Staff and admin APIs for HotelHub operations.',
        '',
        '**Authentication:** **POST /api/auth/login** with body `{ "email", "password" }` (e.g. `admin@hotel.local` / `Admin@123`).',
        'Response includes **accessToken** and sets httpOnly cookie **`' + cookieName + '`**.',
        '',
        'In Swagger: open **Authorize**, choose **bearerAuth**, paste `accessToken` (no `Bearer ` prefix). Or use **cookieAuth** and paste the same JWT as the cookie value.',
        '**withCredentials** is enabled so the cookie from Try it out is sent on later requests when possible.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addCookieAuth('cookieAuth', {
      type: 'apiKey',
      in: 'cookie',
      name: cookieName,
      description: `Paste the JWT from POST /api/auth/login response field "accessToken" (or rely on the httpOnly cookie after executing login in this UI).`,
    })
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Same JWT as the auth cookie; use if cookie auth is inconvenient in Swagger.',
      },
      'bearerAuth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      withCredentials: true,
    },
    customSiteTitle: 'Hotel Reservation API',
  });

  // Lets `nest start --watch` SIGTERM close the HTTP server + Prisma before the next build binds :PORT again.
  app.enableShutdownHooks();

  const port = configService.get<number>('PORT') ?? 4000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}/api`);
}

bootstrap();
