import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

async function bootstrap() {
  // Папка для загруженных файлов (изображения/видео товаров) — создаём, если её ещё нет
  mkdirSync(UPLOADS_DIR, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true, // обязательно для httpOnly cookie между портами
  });

  // Отдаём загруженные файлы товаров статикой: /uploads/имя-файла.jpg
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads/' });

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port);
  console.log(`API запущен на http://localhost:${port}`);
  console.log(`Загруженные файлы хранятся в: ${UPLOADS_DIR}`);
}

bootstrap();
