import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { Request } from "express";

const DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const allowedAdminUploadMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
] as const;

export const allowedAdminUploadMimeTypeSet = new Set<string>(allowedAdminUploadMimeTypes);

const extensionByMimeType: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

export class UploadError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface ParsedAdminUpload {
  originalName: string;
  mimeType: string;
  data: Buffer;
}

export interface StoredAdminUpload {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export function getAdminUploadMaxBytes(): number {
  const configured = Number(process.env.ADMIN_UPLOAD_MAX_BYTES);
  if (Number.isFinite(configured) && configured > 0) {
    return Math.trunc(configured);
  }
  return DEFAULT_MAX_UPLOAD_BYTES;
}

export function getAdminUploadDir(): string {
  return process.env.ADMIN_UPLOAD_DIR
    ? path.resolve(process.env.ADMIN_UPLOAD_DIR)
    : path.resolve(process.cwd(), "uploads", "admin");
}

function parseBoundary(contentType: string | undefined): string {
  const match = contentType?.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = match?.[1] ?? match?.[2];
  if (!boundary) {
    throw new UploadError(400, "MISSING_BOUNDARY", "Multipart boundary is required");
  }
  return boundary.trim();
}

async function readLimitedBody(req: Request, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) {
      throw new UploadError(413, "FILE_TOO_LARGE", `File exceeds the ${maxBytes} byte upload limit`);
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

function parseHeaderParams(value: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const part of value.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey || rawValue.length === 0) continue;
    params[rawKey.toLowerCase()] = rawValue.join("=").trim().replace(/^"|"$/g, "");
  }
  return params;
}

function parsePartHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of raw.split("\r\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    headers[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
  }
  return headers;
}

export async function parseAdminUpload(req: Request): Promise<ParsedAdminUpload> {
  const boundary = parseBoundary(req.headers["content-type"]);
  const maxBytes = getAdminUploadMaxBytes();
  const body = await readLimitedBody(req, maxBytes + 1024 * 1024);
  const boundaryMarker = Buffer.from(`--${boundary}`);
  let position = body.indexOf(boundaryMarker);

  while (position !== -1) {
    position += boundaryMarker.length;
    const nextTwo = body.slice(position, position + 2).toString("latin1");
    if (nextTwo === "--") break;
    if (nextTwo === "\r\n") position += 2;

    const headerEnd = body.indexOf("\r\n\r\n", position, "latin1");
    if (headerEnd === -1) break;

    const headers = parsePartHeaders(body.slice(position, headerEnd).toString("utf8"));
    const contentDisposition = headers["content-disposition"];
    const disposition = contentDisposition ? parseHeaderParams(contentDisposition) : {};
    const bodyStart = headerEnd + 4;
    const nextBoundary = body.indexOf(Buffer.from(`\r\n--${boundary}`), bodyStart);
    if (nextBoundary === -1) break;

    if (disposition.name === "file" && disposition.filename) {
      const mimeType = headers["content-type"]?.toLowerCase() ?? "application/octet-stream";
      const data = body.slice(bodyStart, nextBoundary);
      if (data.length === 0) {
        throw new UploadError(400, "EMPTY_FILE", "Uploaded file is empty");
      }
      if (data.length > maxBytes) {
        throw new UploadError(413, "FILE_TOO_LARGE", `File exceeds the ${maxBytes} byte upload limit`);
      }
      if (!allowedAdminUploadMimeTypeSet.has(mimeType)) {
        throw new UploadError(415, "UNSUPPORTED_MEDIA_TYPE", `Unsupported file type: ${mimeType}`);
      }
      return { originalName: disposition.filename, mimeType, data };
    }

    position = body.indexOf(boundaryMarker, nextBoundary);
  }

  throw new UploadError(400, "MISSING_FILE", "Multipart field 'file' is required");
}

function safeOriginalName(fileName: string): string {
  const cleaned = path.basename(fileName).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "upload";
}

export async function storeAdminUpload(upload: ParsedAdminUpload): Promise<StoredAdminUpload> {
  const uploadDir = getAdminUploadDir();
  await fs.mkdir(uploadDir, { recursive: true });

  const originalName = safeOriginalName(upload.originalName);
  const originalExt = path.extname(originalName);
  const fallbackExt = extensionByMimeType[upload.mimeType] ?? "";
  const storedName = `${new Date().toISOString().slice(0, 10)}-${randomUUID()}${originalExt || fallbackExt}`;
  const targetPath = path.join(uploadDir, storedName);

  await fs.writeFile(targetPath, upload.data, { flag: "wx" });

  return {
    url: `/uploads/admin/${storedName}`,
    fileName: upload.originalName,
    mimeType: upload.mimeType,
    sizeBytes: upload.data.length,
  };
}
