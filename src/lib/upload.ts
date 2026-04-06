import { randomUUID } from "crypto";
import { createWriteStream, mkdirSync, existsSync, unlinkSync } from "fs";
import { join, extname } from "path";
import { pipeline } from "stream/promises";
import type { MultipartFile } from "@fastify/multipart";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE || "5242880");
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function saveFile(file: MultipartFile, businessSlug: string): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_TYPES.join(", ")}`);
  }

  const dir = join(UPLOAD_DIR, businessSlug);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const ext = extname(file.filename) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const filepath = join(dir, filename);

  await pipeline(file.file, createWriteStream(filepath));

  if (file.file.truncated) {
    unlinkSync(filepath);
    throw new Error(`File too large. Max size: ${MAX_SIZE} bytes`);
  }

  return `/uploads/${businessSlug}/${filename}`;
}

export function deleteFile(filePath: string) {
  const fullPath = join(UPLOAD_DIR, filePath.replace("/uploads/", ""));
  if (existsSync(fullPath)) {
    unlinkSync(fullPath);
  }
}
