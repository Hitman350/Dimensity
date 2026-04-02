import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // Create application context — no HTTP server needed for CLI mode
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();
}

bootstrap().catch((error) => {
  console.error(
    'Unhandled error:',
    error instanceof Error ? error.message : 'Unknown error',
  );
  process.exit(1);
});
