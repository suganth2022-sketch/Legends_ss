import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Secure HTTP headers (SRS §19)
  app.use(helmet());

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Set global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger Documentation Setup (Section 10 Step 5)
  const config = new DocumentBuilder()
    .setTitle('Legends MLM Software API')
    .setDescription(
      'RESTful API for Legends Jewellery Savings & 10-Level MLM Network Platform (SRS v1.0)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Legends MLM Backend API running on: http://localhost:${port}/api/v1`);
  console.log(`📄 Swagger OpenAPI Docs available on: http://localhost:${port}/api/docs`);
}

bootstrap();
