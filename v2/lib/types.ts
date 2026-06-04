// v2 共用型別

export type CityId = "taipei" | "kaohsiung";

export type CategoryGroup =
  | "paper"
  | "plastic"
  | "glass"
  | "metal"
  | "food"
  | "general"
  | "hazardous"
  | "large"
  | "electronics"
  | "clothing";

export interface Item {
  id: string;
  nameZh: string;
  aliases: string[];
  group: CategoryGroup;
  emoji?: string;
  defaultTips?: string[];
}

export interface CityItemRule {
  disposal: string;
  binColor?: string;
  schedule?: string;
  notes?: string[];
  sourceUrl?: string;
}

export interface CityRule {
  cityId: CityId;
  cityName: string;
  items: Record<string, CityItemRule>;
  groupDefaults: Record<
    CategoryGroup,
    { disposal: string; binColor?: string; sourceUrl?: string }
  >;
}

export type Confidence = "high" | "medium" | "low";

export interface IdentifiedComponent {
  itemId: string;
  itemName: string;
  group: CategoryGroup;
}

export interface IdentifiedResult {
  status: "identified";
  itemId: string;
  itemName: string;
  group: CategoryGroup;
  confidence: Confidence;
  explanation: string;
  // 複合材質物品才會有；列出每個需要分拆處理的部件
  components?: IdentifiedComponent[];
}

export interface UncertainResult {
  status: "uncertain";
  partialName?: string;
  candidateItemIds?: string[];
  questions: { id: string; q: string; options: string[] }[];
  requestBetterImage: boolean;
}

export interface ErrorResult {
  status: "error";
  message: string;
  // RATE_LIMIT  → Google 回 429/quota/rate，視為「系統忙線中」而非辨識失敗，
  //               不寫 DB、不算進辨識率，前端會跳系統錯誤彈窗後 reload。
  // INVALID_KEY → 401/403，組織 key 失效，要通知管理員。
  code?: "RATE_LIMIT" | "INVALID_KEY";
}

export type AnalyzeResult = IdentifiedResult | UncertainResult | ErrorResult;

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
}

export interface ReportEntry {
  ts: number;
  itemId: string;
  reportedItemId?: string;
  reason?: string;
}

// ─── v2.1 後端共用 ────────────────────────────────────────

export type KeyMode = "own" | "org";

export interface OrgPublicInfo {
  code: string;
  name: string;
  active: boolean;
}

export interface RecognitionRecord {
  id: number;
  createdAt: string;
  cityId: string;
  status: "identified" | "uncertain" | "error";
  itemId: string | null;
  itemName: string | null;
  groupName: string | null;
  confidence: string | null;
  explanation: string | null;
  keyMode: KeyMode;
  orgCode: string | null;
}

export type ErrorReportSource = "manual" | "auto_uncertain" | "auto_error";

export interface ErrorReportRecord {
  id: number;
  createdAt: string;
  recognitionId: number | null;
  blobUrl: string;
  blobPathname: string;
  userComment: string | null;
  reportedItemId: string | null;
  cityId: string | null;
  source: ErrorReportSource;
}

export interface EcoFact {
  id: number;
  content: string;
  imageUrl: string | null;
  active: boolean;
  createdAt: string;
}

// 公開端點回傳的單筆冷知識（精簡，不含 admin 欄位）
export interface PublicEcoFact {
  content: string;
  imageUrl: string | null;
}

export interface AdminStats {
  totalRecognitions: number;
  identifiedCount: number;
  uncertainCount: number;
  errorCount: number;
  reportCount: number;
  byGroup: { group: string; count: number }[];
  byDay: { day: string; count: number }[];
  // 「正確率」= 1 − (錯誤回報數 / 已辨識數)，僅作為粗略指標
  accuracyEstimate: number | null;
}
