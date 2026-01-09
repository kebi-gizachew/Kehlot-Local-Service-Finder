import fs from 'fs';
import path from 'path';

const VALID_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export default async function saveBase64Image(base64String, { folder = 'profiles', prefix = 'provider' } = {}) {
  if (!base64String || typeof base64String !== 'string') throw new Error('No image provided');

  const match = base64String.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URI format');

  const mime = match[1].toLowerCase();
  const data = match[2];

  if (!VALID_IMAGE_MIMES.has(mime)) throw new Error(`Unsupported image format: ${mime}`);

  // Determine extension
  const ext = mime === 'image/jpeg' || mime === 'image/jpg' ? 'jpg' : mime.split('/')[1];

  const buffer = Buffer.from(data, 'base64');

  if (buffer.length === 0) throw new Error('Decoded image is empty');
  if (buffer.length > MAX_BYTES) throw new Error('Image exceeds maximum allowed size (5MB)');

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads', folder);
  fs.mkdirSync(uploadsDir, { recursive: true });

  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.promises.writeFile(filePath, buffer, { mode: 0o644 });

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const publicUrl = `${baseUrl.replace(/\/$/, '')}/uploads/${folder}/${fileName}`;

  return publicUrl;
}
