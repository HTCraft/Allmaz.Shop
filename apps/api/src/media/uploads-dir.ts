import { join } from 'path';

/**
 * Папка локального хранилища загруженных файлов. В production на PaaS файловая система контейнера
 * эфемерна, поэтому там файлы уходят во внешнее хранилище (см. remote-storage.ts), а эта папка
 * служит только временным буфером для multer.
 */
export const UPLOADS_DIR = process.env['UPLOADS_DIR'] ?? join(process.cwd(), 'uploads');
