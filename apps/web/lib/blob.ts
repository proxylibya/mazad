import { put } from '@vercel/blob';
import crypto from 'crypto';

function sanitizePathSegment(value: string): string {
    return value
        .replace(/\\/g, '/')
        .split('/')
        .filter(Boolean)
        .join('/')
        .replace(/[^a-zA-Z0-9._\/-]/g, '_')
        .replace(/_+/g, '_');
}

export async function uploadBufferToBlob(params: {
    buffer: Buffer;
    filename: string;
    contentType: string;
    folder?: string;
}): Promise<{ url: string; pathname: string; }> {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
        throw new Error('BLOB_READ_WRITE_TOKEN is not set');
    }

    const { buffer, filename, contentType, folder } = params;

    const safeFolder = folder ? sanitizePathSegment(folder) : 'uploads';
    const safeFilename = sanitizePathSegment(filename);
    const random = crypto.randomBytes(6).toString('hex');
    const pathname = `${safeFolder}/${Date.now()}_${random}_${safeFilename}`;

    const result = await put(pathname, buffer, {
        access: 'public',
        contentType,
        token,
    });

    return { url: result.url, pathname: result.pathname };
}
