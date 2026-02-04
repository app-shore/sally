import { NestFactory } from '@nestjs/core';
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
    .setTitle('SALLY Backend API')
    .setDescription(
      'Your Fleet Operations Assistant - API with Multi-Tenant Auth',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Authentication', 'JWT-based authentication with multi-tenancy')
    .addTag('HOS Rules', 'Hours of Service compliance validation')
    .addTag('Optimization', 'REST optimization recommendations')
    .addTag('Prediction', 'Drive demand predictions')
    .addTag('Route Planning', 'Route planning and optimization')
    .addTag('Drivers', 'Driver management')
    .addTag('Vehicles', 'Vehicle management')
    .addTag('Loads', 'Load management')
    .addTag('Scenarios', 'Test scenario management')
    .addTag('External Mock APIs', 'Mock external API endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  const port = 8000;
  await app.listen(port);
  console.log(`SALLY Backend running on port ${port}`);
  console.log(`API endpoints: http://localhost:${port}/api/v1/`);
  console.log(`Swagger docs: http://localhost:${port}/api`);
}

bootstrap();
