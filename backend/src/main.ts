import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { StructuredLogger } from './common/logger/structured-logger';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    cors: true,
    // JSON structured logs in production (what log aggregators expect);
    // Nest's default colored console output stays in dev, since it's more
    // pleasant to read locally.
    logger: isProduction ? new StructuredLogger() : undefined,
  });

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('RollCall+ API')
    .setDescription('Smart Student Attendance Management System API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  const swaggerUser = process.env.SWAGGER_USER;
  const swaggerPassword = process.env.SWAGGER_PASSWORD;

  if (isProduction && !(swaggerUser && swaggerPassword)) {
    // No credentials configured — safest default is to not expose the API
    // surface publicly rather than silently leave it open.
    Logger.warn(
      'SWAGGER_USER/SWAGGER_PASSWORD not set — /api/docs is disabled in production. ' +
        'Set both env vars to enable it behind basic auth.',
      'Bootstrap',
    );
  } else if (isProduction) {
    // Minimal hand-rolled basic auth in front of Swagger — deliberately not
    // pulling in a new package (e.g. express-basic-auth) for one route.
    app.use('/api/docs', (req: any, res: any, next: any) => {
      const header = req.headers.authorization;
      const expected = 'Basic ' + Buffer.from(`${swaggerUser}:${swaggerPassword}`).toString('base64');
      if (header === expected) return next();
      res.set('WWW-Authenticate', 'Basic realm="RollCall+ API Docs"');
      return res.status(401).send('Authentication required');
    });
    SwaggerModule.setup('api/docs', app, document);
  } else {
    // Local/dev — open, as before.
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`RollCall+ API running on http://localhost:${port}/api/v1`);
  console.log(`Health check at http://localhost:${port}/health`);
  if (!isProduction || (swaggerUser && swaggerPassword)) {
    console.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }
}
bootstrap();
