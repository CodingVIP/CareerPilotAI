import { del, get, put } from '@vercel/blob';

const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['pdf', 'docx', 'txt', 'md']);

export function decodeResumeData(base64: string, fileType: string): Buffer {
  const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  if (!buffer.length || buffer.length > MAX_RESUME_BYTES) {
    throw new Error('Resume exceeds the 10 MB upload limit.');
  }
  if (!ALLOWED_TYPES.has(fileType)) {
    throw new Error('Unsupported resume type.');
  }
  const header = buffer.subarray(0, 8);
  const validSignature =
    (fileType === 'pdf' && header.toString('ascii', 0, 4) === '%PDF') ||
    (fileType === 'docx' && header[0] === 0x50 && header[1] === 0x4b) ||
    (fileType === 'txt' || fileType === 'md');
  if (!validSignature) {
    throw new Error('File contents do not match the declared resume type.');
  }
  return buffer;
}

export async function uploadPrivateResume(
  userId: string,
  resumeId: string,
  fileType: string,
  buffer: Buffer,
): Promise<{ pathname: string; url: string; size: number }> {
  const pathname = `resumes/${encodeURIComponent(userId)}/${encodeURIComponent(resumeId)}.${fileType}`;
  const blob = await put(pathname, buffer, {
    access: 'private',
    contentType:
      fileType === 'pdf'
        ? 'application/pdf'
        : fileType === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'text/plain',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return { pathname: blob.pathname, url: blob.url, size: buffer.length };
}

export async function readPrivateResume(pathname: string) {
  return get(pathname, { access: 'private', useCache: false });
}

export async function deletePrivateResume(pathname: string): Promise<void> {
  await del(pathname);
}
