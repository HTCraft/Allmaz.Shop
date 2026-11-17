import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { UPLOADS_DIR } from './media/uploads-dir';


async function bootstrap() {
  if (process.env['NODE_ENV'] === 'production' && !process.env['JWT_SECRET']) {
    throw new Error('JWT_SECRET не задан — в production запуск без него небезопасен');
  }

  // Папка для загруженных файлов (изображения/видео товаров) — создаём, если её ещё нет
  mkdirSync(UPLOADS_DIR, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // За балансировщиком Render (прокси) без этого req.ip — всегда адрес прокси,
  // и все rate-limit'ы (логин, регистрация) считались бы на всех посетителей разом
  if (process.env['NODE_ENV'] === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // CORS_ORIGINS — список через запятую (например, apex и www); по умолчанию — FRONTEND_URL
  const corsOrigins = (process.env['CORS_ORIGINS'] ?? process.env['FRONTEND_URL'] ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true, // обязательно для httpOnly cookie между портами
  });

  // Отдаём загруженные файлы товаров статикой: /uploads/имя-файла.jpg
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads/' });

  // Render передаёт порт в PORT; локально — API_PORT
  const port = process.env['PORT'] ?? process.env['API_PORT'] ?? 4000;
  await app.listen(port);
  console.log(`API запущен на порту ${port}`);
  console.log(`Загруженные файлы хранятся в: ${UPLOADS_DIR}`);
}

bootstrap();
