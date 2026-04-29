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

export interface IdentifiedResult {
  status: "identified";
  itemId: string;
  itemName: string;
  group: CategoryGroup;
  confidence: Confidence;
  explanation: string;
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
