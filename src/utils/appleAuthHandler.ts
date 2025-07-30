import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const APPLE_JWKS_URL = process.env.APPLE_JWKS_URL || "";

const client = jwksClient({
  jwksUri: APPLE_JWKS_URL,
});

function getAppleSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err || !key) return reject(err || new Error("Signing key not found"));

      const signingKey =
        typeof key.getPublicKey === "function"
          ? key.getPublicKey()
          : (key as any).publicKey;

      resolve(signingKey);
    });
  });
}

export async function verifyAppleToken(
  idToken: string
): Promise<{ sub: string; email?: string }> {
  const decoded = jwt.decode(idToken, { complete: true });

  if (!decoded || typeof decoded === "string" || !decoded.header?.kid) {
    throw new Error("Invalid Apple token");
  }

  const kid = decoded.header.kid;
  const publicKey = await getAppleSigningKey(kid);

  const payload = jwt.verify(idToken, publicKey, {
    algorithms: ["RS256"],
  }) as jwt.JwtPayload;

  if (!payload.sub) {
    throw new Error("Apple token missing user ID (sub)");
  }

  return {
    sub: payload.sub,
    email:
      typeof payload.email === "string" && payload.email_verified
        ? payload.email
        : undefined,
  };
}
