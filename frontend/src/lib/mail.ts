import "server-only";

import nodemailer from "nodemailer";

import { getServerEnv } from "@/lib/server-env";

type SendTextEmailResult =
  | { ok: true }
  | { ok: false; reason: "smtp_not_configured" | "smtp_send_failed" };

interface SmtpConfig {
  from: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

let transporterCache: nodemailer.Transporter | null = null;

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseSecure(value: string | undefined, port: number): boolean {
  if (!value) {
    return port === 465;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function getSmtpConfig(): SmtpConfig | null {
  const host =
    getServerEnv("SMTP_HOST") ??
    getServerEnv("EMAIL_SMTP_HOST") ??
    "smtp.gmail.com";
  const port = parsePort(
    getServerEnv("SMTP_PORT") ?? getServerEnv("EMAIL_SMTP_PORT"),
    587
  );
  const secure = parseSecure(
    getServerEnv("SMTP_SECURE") ?? getServerEnv("EMAIL_SMTP_SECURE"),
    port
  );
  const user =
    getServerEnv("SMTP_USER") ?? getServerEnv("EMAIL_SMTP_USER") ?? "";
  const password =
    getServerEnv("SMTP_PASSWORD") ?? getServerEnv("EMAIL_SMTP_PASSWORD") ?? "";
  const from = getServerEnv("SMTP_FROM") ?? getServerEnv("EMAIL_FROM") ?? user;

  if (!host || !user || !password || !from) {
    return null;
  }

  return {
    from,
    host,
    port,
    secure,
    user,
    password,
  };
}

function getTransporter(config: SmtpConfig): nodemailer.Transporter {
  if (!transporterCache) {
    transporterCache = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }

  return transporterCache;
}

export async function sendTextEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<SendTextEmailResult> {
  const config = getSmtpConfig();
  if (!config) {
    return { ok: false, reason: "smtp_not_configured" };
  }

  try {
    await getTransporter(config).sendMail({
      from: config.from,
      to,
      subject,
      text,
    });
    return { ok: true };
  } catch (error) {
    console.error("sendTextEmail error:", error);
    return { ok: false, reason: "smtp_send_failed" };
  }
}
