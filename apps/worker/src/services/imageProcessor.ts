import sharp from 'sharp';

export async function processImageBuffer(buf: Buffer, width = 1200, height = 628) {
  // Resize to a reasonable size for featured images, convert to jpeg with quality
  const image = sharp(buf).rotate().resize(width, height, { fit: 'cover' }).jpeg({ quality: 84 }).toBuffer();
  return image;
}
