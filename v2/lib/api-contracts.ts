// 前後端共用的 API request/response 形狀。前端 fetch 時直接 import 用。

import type {
  AdminStats,
  AnalyzeResult,
  EcoFact,
  ErrorReportRecord,
  OrgPublicInfo,
  RecognitionRecord,
} from "./types";

// POST /api/analyze
//   body: multipart/form-data
//     - image: File (1 張)
//     - cityId: string
//     - turnstileToken: string
//     - keyMode: "own" | "org"
//     - orgCode?: string  (keyMode=org 時必填)
//     - apiKey?: string   (keyMode=own 時必填，仍會 server proxy 但不存 key)
//   resp: { recognitionId: number; result: AnalyzeResult }
//   status:
//     400 缺欄位 / Turnstile fail / 組織代號無效
//     401 Turnstile fail（細分）
//     500 Gemini 失敗
export interface AnalyzeApiResponse {
  recognitionId: number;
  result: AnalyzeResult;
}

// POST /api/report-error
//   body: multipart/form-data
//     - image: File (1 張)
//     - recognitionId?: number
//     - reportedItemId?: string
//     - userComment?: string
//     - cityId?: string
//   resp: { reportId: number }
export interface ReportErrorApiResponse {
  reportId: number;
}

// POST /api/orgs/validate
//   body: { code: string }
//   resp: { ok: boolean; name?: string }
export interface OrgValidateRequest {
  code: string;
}
export interface OrgValidateResponse {
  ok: boolean;
  name?: string;
}

// ───── admin ────────────────────────────────────────────

// POST /api/admin/login
export interface AdminLoginRequest {
  username: string;
  password: string;
}

// POST /api/admin/change-password
export interface AdminChangePasswordRequest {
  current: string;
  next: string;
}

// GET /api/admin/records?limit=&offset=
export interface AdminRecordsResponse {
  records: RecognitionRecord[];
}

// GET /api/admin/reports?limit=&offset=
export interface AdminReportsResponse {
  reports: ErrorReportRecord[];
}

// GET /api/admin/stats
export type AdminStatsResponse = AdminStats;

// GET /api/admin/orgs
export interface AdminOrgsResponse {
  orgs: (OrgPublicInfo & { id: number; createdAt: string })[];
}

// POST /api/admin/orgs
export interface AdminCreateOrgRequest {
  code: string;
  name: string;
  apiKey: string;
}

// PATCH /api/admin/orgs/:id
export interface AdminUpdateOrgRequest {
  name?: string;
  apiKey?: string;
  active?: boolean;
}

// ───── 環保冷知識 ───────────────────────────────────────

// GET /api/eco-facts?count=N  （公開，辨識中畫面用）
//   resp: { facts: string[] }  隨機 N 筆啟用中的冷知識
export interface EcoFactsResponse {
  facts: string[];
}

// GET /api/admin/eco-facts
export interface AdminEcoFactsResponse {
  facts: EcoFact[];
}

// POST /api/admin/eco-facts
export interface AdminCreateEcoFactRequest {
  content: string;
}

// PATCH /api/admin/eco-facts/:id
export interface AdminUpdateEcoFactRequest {
  content?: string;
  active?: boolean;
}
