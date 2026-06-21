import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "change-me";
const TOKEN_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

export function getEnvCredentials() {
  return {
    username: process.env.AUTH_USERNAME || "",
    password: process.env.AUTH_PASSWORD || "",
  };
}

export function verifyCredentials(username: string, password: string): boolean {
  const creds = getEnvCredentials();
  if (!creds.username || !creds.password) return false;
  return username === creds.username && password === creds.password;
}

export function createToken(username: string): string {
  const payload = JSON.stringify({
    username,
    exp: Date.now() + TOKEN_MAX_AGE,
  });
  const payloadHex = Buffer.from(payload, "utf-8").toString("hex");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payloadHex)
    .digest("hex");
  return `${payloadHex}.${signature}`;
}

export function verifyToken(token: string): { username: string } | null {
  try {
    const [payloadHex, signature] = token.split(".");
    if (!payloadHex || !signature) return null;

    const expectedSig = crypto
      .createHmac("sha256", SECRET)
      .update(payloadHex)
      .digest("hex");
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(
      Buffer.from(payloadHex, "hex").toString("utf-8"),
    );
    if (payload.exp < Date.now()) return null;

    return { username: payload.username };
  } catch {
    return null;
  }
}
