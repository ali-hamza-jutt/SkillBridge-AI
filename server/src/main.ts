import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
      console.log('MONGODB_URI (main):', process.env.MONGODB_URI);
      console.log('REDIS_URL (main):', process.env.REDIS_URL);
  
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const isDev = process.env.NODE_ENV !== 'production';


  // Bug 4 fix: strip trailing slashes so origin comparison is exact
  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))   // <-- remove trailing slash
    .filter(Boolean);

  if (isDev) {
    Logger.log('CORS: development mode — allowing all origins');
  } else {
    Logger.log(`CORS: allowed origins: ${allowedOrigins.join(', ')}`);
  }

  app.enableCors({
    origin: isDev
      ? true
      : (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          // Bug 1 fix: pass null + false instead of throwing — throwing causes
          // unhandled-exception crashes and returns a 500, not a 403.
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            Logger.warn(`CORS: blocked origin "${origin}"`);
            callback(null, false);   // <-- was: callback(new Error(...))
          }
        },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    // Bug 3 fix: expose Authorization so the browser can read it on credentialed requests
    exposedHeaders: ['Authorization'],
    credentials: true,
  });

  // Bug 2 fix: remove crossOriginResourcePolicy — it fights the CORS headers above.
  // contentSecurityPolicy is also disabled in dev to avoid blocking Swagger UI.
  app.use(
    helmet({
      crossOriginResourcePolicy: false,           // <-- was: { policy: 'cross-origin' }
      contentSecurityPolicy: isDev ? false : undefined,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Skill Bridge API')
    .setDescription('The Skill Bridge API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL!],
      queue: 'marketplace_queue',
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3001);

  process.on('SIGTERM', () => {
    void app.close();
  });
}
bootstrap().catch(console.error);