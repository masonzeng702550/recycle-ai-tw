// 集中讀環境變數，所有 server-only 模組透過這裡取
// 缺少時直接 throw，比拿到 undefined 又默默壞掉容易 debug

import "server-only";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function opt(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const env = {
  jwtSecret: () => need("JWT_SECRET"),
  adminUsername: () => need("ADMIN_USERNAME"),
  // 兩種來源擇一：優先 hash，否則拿 plain（首次部署便利用）
  adminPasswordHash: () => opt("ADMIN_PASSWORD_HASH"),
  adminPasswordPlain: () => opt("ADMIN_PASSWORD"),
  turnstileSecret: () => need("TURNSTILE_SECRET_KEY"),
};
