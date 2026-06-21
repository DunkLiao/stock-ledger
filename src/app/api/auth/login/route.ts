import { NextRequest, NextResponse } from "next/server";
import {
  verifyCredentials,
  createToken,
  getEnvCredentials,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const creds = getEnvCredentials();
  if (!creds.username || !creds.password) {
    return NextResponse.json(
      { success: false, error: "伺服器未設定帳號密碼，請設定環境變數 AUTH_USERNAME 與 AUTH_PASSWORD" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: "請輸入帳號與密碼" },
      { status: 400 },
    );
  }

  if (!verifyCredentials(username, password)) {
    return NextResponse.json(
      { success: false, error: "帳號或密碼錯誤" },
      { status: 401 },
    );
  }

  const token = createToken(username);
  const response = NextResponse.json({ success: true });
  response.cookies.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60, // 24 hours
  });

  return response;
}
