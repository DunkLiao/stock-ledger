const TOKEN_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

function getSecret() {
  return process.env.AUTH_SECRET || "change-me";
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function getHmacKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

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

export async function createToken(username: string): Promise<string> {
  const payload = JSON.stringify({
    username,
    exp: Date.now() + TOKEN_MAX_AGE,
  });
  const payloadHex = bytesToHex(new TextEncoder().encode(payload));
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    await getHmacKey(),
    new TextEncoder().encode(payloadHex),
  );
  const signature = bytesToHex(new Uint8Array(signatureBuffer));
  return `${payloadHex}.${signature}`;
}

export async function verifyToken(token: string): Promise<{ username: string } | null> {
  try {
    const [payloadHex, signature] = token.split(".");
    if (!payloadHex || !signature) return null;

    const verified = await crypto.subtle.verify(
      "HMAC",
      await getHmacKey(),
      hexToBytes(signature),
      new TextEncoder().encode(payloadHex),
    );
    if (!verified) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(hexToBytes(payloadHex)),
    );
    if (payload.exp < Date.now()) return null;

    return { username: payload.username };
  } catch {
    return null;
  }
}
