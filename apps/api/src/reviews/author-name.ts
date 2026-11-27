/** Публично показываем имя, а если его нет — маскированную часть email до @ */
export function authorName(user: { name: string | null; email: string }): string {
  if (user.name?.trim()) return user.name.trim();
  const local = user.email.split('@')[0] ?? '';
  return `${local.slice(0, 2)}***`;
}
