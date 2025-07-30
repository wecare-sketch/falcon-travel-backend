import { randomBytes } from "crypto";

export function generateSlug(input: string): string {
  const baseSlug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const randomSuffix = randomBytes(2).toString("hex");

  return `${baseSlug}-${randomSuffix}`;
}
