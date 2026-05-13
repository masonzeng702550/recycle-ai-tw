import "server-only";
import { env } from "./server-env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface VerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  hostname?: string;
}

export async function verifyTurnstile(
  token: string | undefined | null,
  remoteIp?: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!token) return { ok: false, reason: "missing-token" };
  const body = new URLSearchParams({
    secret: env.turnstileSecret(),
    response: token,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    body,
  });
  if (!res.ok) return { ok: false, reason: `siteverify-${res.status}` };
  const data = (await res.json()) as VerifyResponse;
  if (!data.success) {
    return { ok: false, reason: data["error-codes"]?.join(",") ?? "rejected" };
  }
  return { ok: true };
}
