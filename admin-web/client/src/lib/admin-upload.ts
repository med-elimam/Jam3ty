import { uploadAdminFile } from '@workspace/api-client-react';
import type { AdminUpload } from '@workspace/api-client-react';

export const ADMIN_UPLOAD_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,video/mp4,video/webm';

export function formatUploadBytes(value?: number | null): string {
  if (!value || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function inferMimeTypeFromUrl(url: string): string {
  const pathname = url.split('?', 1)[0]?.toLowerCase() ?? '';
  if (pathname.endsWith('.pdf')) return 'application/pdf';
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg';
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.webp')) return 'image/webp';
  if (pathname.endsWith('.mp4')) return 'video/mp4';
  if (pathname.endsWith('.webm')) return 'video/webm';
  return '';
}

export async function uploadAdminContentFile(file: File): Promise<AdminUpload> {
  const result = await uploadAdminFile({ file });
  return result.data;
}
