import { Request } from "express";
import { mkdir } from "fs/promises";
import path from "path";
import fs from "fs/promises";

const uploadDir = path.join(process.cwd(), "public", "uploads");

export async function mediaUpload(blob: string, req: Request) {
  const folderPath = path.join(uploadDir, blob);
  await mkdir(folderPath, { recursive: true });

  const files = req.files as Express.Multer.File[];

  if (!files?.length) {
    throw new Error("No files received");
  }

  const result = await Promise.all(
    files.map((file) => {
      const filePath = path.join(folderPath, file.originalname);
      const result = fs.writeFile(filePath, file.buffer);
      console.log(
        "what we get after Files are uploaded: ",
        result,
        " and the buffer state being: ",
        file.buffer
      );

      return result;
    })
  );

  console.log("After writing all the files we got: ", result);

  const url = `/uploads/${blob}`;

  return { message: "success", data: url };
}
