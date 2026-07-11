import fs from "fs/promises";
import path from "path";
import { createHash, randomUUID } from "crypto";
import type { Request } from "express";
import { parseAdminUpload, UploadError } from "./admin-upload";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSIONS: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

export function getManualEvidenceMaxBytes() {
  const configured = Number(process.env.MANUAL_PAYMENT_EVIDENCE_MAX_BYTES);
  return Number.isFinite(configured) && configured > 0 ? Math.trunc(configured) : 8 * 1024 * 1024;
}

export function getManualEvidenceDir() {
  return process.env.MANUAL_PAYMENT_EVIDENCE_DIR
    ? path.resolve(process.env.MANUAL_PAYMENT_EVIDENCE_DIR)
    : path.resolve(process.cwd(), "private-uploads", "manual-payments");
}

function hasValidMagic(data: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mimeType === "image/png") return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/webp") return data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

export async function storeManualPaymentEvidence(req: Request) {
  const upload = await parseAdminUpload(req);
  if (!ALLOWED.has(upload.mimeType) || !hasValidMagic(upload.data, upload.mimeType)) {
    throw new UploadError(415, "UNSUPPORTED_EVIDENCE_TYPE", "Evidence must be a valid JPEG, PNG, or WebP image");
  }
  const maxBytes = getManualEvidenceMaxBytes();
  if (upload.data.length > maxBytes) throw new UploadError(413, "EVIDENCE_TOO_LARGE", `Evidence exceeds ${maxBytes} bytes`);
  const sha256 = createHash("sha256").update(upload.data).digest("hex");
  const storageKey = `${randomUUID()}${EXTENSIONS[upload.mimeType]}`;
  const directory = getManualEvidenceDir();
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, storageKey), upload.data, { flag: "wx" });
  return { storageKey, mimeType: upload.mimeType, sizeBytes: upload.data.length, sha256, originalName: path.basename(upload.originalName) };
}

export function resolveManualEvidencePath(storageKey: string) {
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(storageKey)) throw new UploadError(400, "INVALID_STORAGE_KEY", "Invalid evidence key");
  return path.join(getManualEvidenceDir(), storageKey);
}
