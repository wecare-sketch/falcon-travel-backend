import { Request } from "express";
import cloudinary from "../config/storage";

import {
  UploadApiOptions,
  UploadApiResponse,
  UploadApiErrorResponse,
} from "cloudinary";

export async function mediaHandler(
  req: Request,
  email: string,
  eventSlug: string,
  options?: Partial<UploadApiOptions>
) {
  let files: Express.Multer.File[] = [];

  if (Array.isArray(req.files)) {
    files = req.files;
  } else if (req.file) {
    files = [req.file];
  }

  if (!files.length) throw new Error("No files received");

  const defaultOptions: UploadApiOptions = {
    folder: `events/${eventSlug}/${email}`,
    resource_type: "auto",
  };

  const uploadOptions = { ...defaultOptions, ...options };

  const uploadedFiles = await Promise.all(
    files.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (
            err: UploadApiErrorResponse | undefined,
            result: UploadApiResponse | undefined
          ) => {
            if (err) return reject(err);
            if (!result?.secure_url) return reject(new Error("Upload failed"));
            resolve(result.secure_url);
          }
        );

        stream.end(file.buffer);
      });
    })
  );

  return uploadedFiles;
}

export async function deleteCloudinaryAssets(urls: string[]) {
  const deletions = urls.map((url) => {
    const parts = url.split("/");
    const publicIdWithExt = parts.slice(-2).join("/");
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");

    return cloudinary.uploader.destroy(publicId);
  });

  await Promise.allSettled(deletions);
}
