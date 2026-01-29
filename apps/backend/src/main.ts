import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Configuration } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<Configuration>);

  const corsOrigins = configService.get<string>('corsOrigins') || 'http://localhost:3000';

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // CORS configuration
  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger/OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SALLY Backend API')
    .setDescription('Route Planning Platform API - Node.js/TypeScript replica')
    .setVersion('1.0.0')
    .addTag('HOS Rules', 'Hours of Service compliance validation')
    .addTag('Optimization', 'REST optimization recommendations')
    .addTag('Prediction', 'Drive demand predictions')
    .addTag('Route Planning', 'Route planning and optimization')
    .addTag('Drivers', 'Driver management')
    .addTag('Vehicles', 'Vehicle management')
    .addTag('Loads', 'Load management')
    .addTag('Scenarios', 'Test scenario management')
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
