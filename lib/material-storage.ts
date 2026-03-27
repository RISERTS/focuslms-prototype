import { randomUUID } from "crypto";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const bucket = process.env.S3_BUCKET_NAME;
const region = process.env.AWS_REGION;
const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

let cachedS3Client: S3Client | null = null;

function getS3Client() {
  if (!cachedS3Client) {
    if (!region) {
      throw new Error("Missing AWS_REGION");
    }

    cachedS3Client = new S3Client({ region });
  }

  return cachedS3Client;
}

function shouldUseS3() {
  return Boolean(bucket && region);
}

function safeExtension(filename: string) {
  const ext = path.extname(filename);
  return ext ? ext.toLowerCase() : "";
}

export async function saveMaterialFile(file: File) {
  const ext = safeExtension(file.name);
  const fileName = `${Date.now()}-${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (shouldUseS3()) {
    const key = `materials/${fileName}`;

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
        ContentDisposition: `inline; filename="${file.name.replace(/"/g, "")}"`,
      })
    );

    const fileUrl = publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, "")}/${key}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return {
      fileKey: key,
      fileUrl,
      fileType: file.type || ext.replace(".", "").toUpperCase() || "FILE",
      originalFileName: file.name,
    };
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "materials");
  await mkdir(uploadsDir, { recursive: true });

  const relativePath = path.join("uploads", "materials", fileName).replace(/\\/g, "/");
  const absolutePath = path.join(process.cwd(), "public", relativePath);

  await writeFile(absolutePath, buffer);

  return {
    fileKey: `local:${relativePath}`,
    fileUrl: `/${relativePath}`,
    fileType: file.type || ext.replace(".", "").toUpperCase() || "FILE",
    originalFileName: file.name,
  };
}

export async function deleteMaterialFile(fileKey: string | null | undefined) {
  if (!fileKey) return;

  if (fileKey.startsWith("local:")) {
    const relativePath = fileKey.replace(/^local:/, "");
    const absolutePath = path.join(process.cwd(), "public", relativePath);
    await rm(absolutePath, { force: true });
    return;
  }

  if (shouldUseS3()) {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: fileKey,
      })
    );
  }
}