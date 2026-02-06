import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Configuration } from './config/configuration';
import cookieParser from 'cookie-parser';
import { initializeFirebase } from './config/firebase.config';

async function bootstrap() {
  // Initialize Firebase Admin SDK
  initializeFirebase();

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<Configuration>);

  const corsOrigins =
    configService.get<string>('corsOrigins') || 'http://localhost:3000';

  // Cookie parser for refresh tokens
  app.use(cookieParser());

  // Global validation pipe - enables class-validator DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // CORS configuration
  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Allow cookies
  });

  // Swagger/OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SALLY API')
    .setDescription('Fleet Operations Assistant API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'Enter your API key (sk_staging_...)',
        name: 'Authorization',
        in: 'header',
      },
      'api-key',
    )
    .addServer('https://sally-api.apps.appshore.in/api/v1', 'Staging')
    .addServer('http://localhost:8000/api/v1', 'Local Development')
    .addTag('Authentication', 'JWT-based authentication with multi-tenancy')
    .addTag('API Keys', 'API key management for external developers')
    .addTag('Route Planning', 'Create and manage optimized routes')
    .addTag('Monitoring', 'Monitor active routes in real-time')
    .addTag('Alerts', 'Dispatcher alerts and notifications')
    .addTag('HOS Rules', 'Hours of Service compliance validation')
    .addTag('Optimization', 'REST optimization recommendations')
    .addTag('Prediction', 'Drive demand predictions')
    .addTag('Drivers', 'Driver management')
    .addTag('Vehicles', 'Vehicle management')
    .addTag('Loads', 'Load management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Serve OpenAPI spec at /api/openapi.json for docs site
  app.use('/api/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(document);
  });

  SwaggerModule.setup('api', app, document);

  const port = 8000;
  await app.listen(port);
  console.log(`SALLY Backend running on port ${port}`);
  console.log(`API endpoints: http://localhost:${port}/api/v1/`);
  console.log(`Swagger docs: http://localhost:${port}/api`);
}

bootstrap();
