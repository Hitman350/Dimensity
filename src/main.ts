import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const port = Number(process.env.BACKEND_PORT ?? 4000);
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
  app.use(helmet());

  // Prevent oversized payloads from exhausting memory
  app.use(express.json({ limit: '16kb' }));

  const frontendOrigin =
    process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';

  app.enableCors({
    origin: frontendOrigin,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  // Global input validation — strips unknown properties, rejects malformed data
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter — never leak stack traces to clients
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port, '0.0.0.0');
  console.log(`Dimensity API listening on http://127.0.0.1:${port}/api`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
