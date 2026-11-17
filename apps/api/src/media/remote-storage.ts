import { readFile, unlink } from 'fs/promises';

/**
 * Внешнее хранилище файлов RelaxDev (Storage API): файлы раздаются через CDN, не пропадают при деплое.
 * Включается переменной STORAGE_API_KEY (ключ создаётся в менеджере файлов проекта, вкладка «API Доступ»,
 * и сам попадает в переменные проекта). Без неё файлы хранятся на локальном диске (режим разработки).
 */
const STORAGE_API = 'https://relaxdev.ru/api/v1/storage';
const REMOTE_HOSTS = ['cdn.relaxdev.ru', 'files.relaxdev.ru'];

export function isRemoteStorageEnabled(): boolean {
  return Boolean(process.env['STORAGE_API_KEY']);
}

/** true для ссылок, которые выдало хранилище (их нужно удалять через Storage API, а не с диска) */
export function isRemoteUrl(url: string): boolean {
  try {
    return REMOTE_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

export class RemoteStorageError extends Error {
  constructor(
    message: string,
    public readonly quotaExceeded = false,
  ) {
    super(message);
  }
}

/** Загружает файл, сохранённый multer'ом на диск, в хранилище и возвращает публичный URL */
export async function uploadToRemoteStorage(
  file: { path: string; originalname: string; mimetype: string },
  folder = 'products',
): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([await readFile(file.path)], { type: file.mimetype }), file.originalname);
  form.append('path', folder);

  let res: Response;
  try {
    res = await fetch(`${STORAGE_API}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env['STORAGE_API_KEY']}` },
      body: form,
    });
  } catch {
    throw new RemoteStorageError('Хранилище файлов недоступно');
  }

  const data = (await res.json().catch(() => null)) as
    | { success?: boolean; url?: string; code?: string; error?: string }
    | null;

  if (!res.ok || !data?.success || !data.url) {
    throw new RemoteStorageError(
      data?.error ?? `Хранилище отклонило файл (HTTP ${res.status})`,
      res.status === 413 || data?.code === 'STORAGE_QUOTA',
    );
  }
  return data.url;
}

/** Удаляет файл из хранилища по ссылке; ошибки не критичны — запись в БД уже удалена */
export async function deleteFromRemoteStorage(url: string): Promise<void> {
  try {
    await fetch(`${STORAGE_API}/files?path=${encodeURIComponent(url)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${process.env['STORAGE_API_KEY']}` },
    });
  } catch {
    // Файл останется в хранилище — не критично
  }
}

/** Удаляет временный файл multer'а */
export async function removeLocalFile(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // уже удалён
  }
}
