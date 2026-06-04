"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AdminCreateEcoFactRequest,
  AdminEcoFactsResponse,
  AdminEcoFactUploadResponse,
  AdminUpdateEcoFactRequest,
} from "@/lib/api-contracts";
import type { EcoFact } from "@/lib/types";

const MAX_LEN = 200;

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-TW", { hour12: false });
}

export default function EcoFactsPage() {
  const [facts, setFacts] = useState<EcoFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Create form state
  const [createOpen, setCreateOpen] = useState(false);
  const [createText, setCreateText] = useState("");
  const [createImageUrl, setCreateImageUrl] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit form state
  const [editFact, setEditFact] = useState<EcoFact | null>(null);
  const [editText, setEditText] = useState("");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/admin/eco-facts", { cache: "no-store" });
      if (!resp.ok) {
        setError(`讀取失敗 (${resp.status})`);
        return;
      }
      const data = (await resp.json()) as AdminEcoFactsResponse;
      setFacts(data.facts);
      setError(null);
    } catch {
      setError("網路錯誤");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeCount = facts.filter((f) => f.active).length;

  function openCreate() {
    setCreateText("");
    setCreateImageUrl(null);
    setCreateError(null);
    setCreateOpen(true);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const content = createText.trim();
    if (!content) {
      setCreateError("請輸入內容");
      return;
    }
    if (content.length > MAX_LEN) {
      setCreateError(`內容請勿超過 ${MAX_LEN} 字`);
      return;
    }
    setCreateBusy(true);
    try {
      const body: AdminCreateEcoFactRequest = {
        content,
        imageUrl: createImageUrl,
      };
      const resp = await fetch("/api/admin/eco-facts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setCreateError(data?.error ?? `建立失敗 (${resp.status})`);
        return;
      }
      setCreateOpen(false);
      await load();
    } catch {
      setCreateError("網路錯誤");
    } finally {
      setCreateBusy(false);
    }
  }

  async function patchFact(id: number, body: AdminUpdateEcoFactRequest) {
    const resp = await fetch(`/api/admin/eco-facts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data?.error ?? `更新失敗 (${resp.status})`);
    }
  }

  async function toggleActive(fact: EcoFact) {
    setBusyId(fact.id);
    try {
      await patchFact(fact.id, { active: !fact.active });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(fact: EcoFact) {
    setEditFact(fact);
    setEditText(fact.content);
    setEditImageUrl(fact.imageUrl);
    setEditError(null);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editFact) return;
    setEditError(null);
    const content = editText.trim();
    if (!content) {
      setEditError("內容不可為空");
      return;
    }
    if (content.length > MAX_LEN) {
      setEditError(`內容請勿超過 ${MAX_LEN} 字`);
      return;
    }
    const contentChanged = content !== editFact.content;
    const imageChanged = (editImageUrl ?? null) !== (editFact.imageUrl ?? null);
    if (!contentChanged && !imageChanged) {
      setEditFact(null);
      return;
    }
    setEditBusy(true);
    try {
      const patch: AdminUpdateEcoFactRequest = {};
      if (contentChanged) patch.content = content;
      if (imageChanged) patch.imageUrl = editImageUrl;
      await patchFact(editFact.id, patch);
      setEditFact(null);
      await load();
    } catch (e) {
      setEditError((e as Error).message);
    } finally {
      setEditBusy(false);
    }
  }

  async function deleteFact(fact: EcoFact) {
    if (!confirm(`確定要刪除這則冷知識？此動作無法復原。\n\n「${fact.content}」`)) {
      return;
    }
    setBusyId(fact.id);
    try {
      const resp = await fetch(`/api/admin/eco-facts/${fact.id}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(data?.error ?? `刪除失敗 (${resp.status})`);
        return;
      }
      await load();
    } catch {
      setError("網路錯誤");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl">環保冷知識</h1>
          <p className="text-sm text-neutral-500 mt-1">
            辨識中畫面會隨機播放「啟用中」的冷知識。共 {facts.length} 則、
            {activeCount} 則啟用中。可選擇性附上梗圖。
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full bg-white text-black px-5 py-2 text-sm font-medium hover:bg-neutral-200"
        >
          新增冷知識
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-2xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
        {loading && facts.length === 0 ? (
          <div className="px-4 py-8 text-center text-neutral-600">載入中…</div>
        ) : facts.length === 0 ? (
          <div className="px-4 py-8 text-center text-neutral-600">
            尚未新增任何冷知識
          </div>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {facts.map((fact) => (
              <li key={fact.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  {fact.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fact.imageUrl}
                      alt=""
                      className="w-20 h-20 rounded-xl object-cover bg-neutral-950 border border-neutral-800 shrink-0"
                    />
                  )}
                  <p
                    className={`flex-1 text-sm leading-relaxed ${
                      fact.active ? "text-neutral-100" : "text-neutral-500"
                    }`}
                  >
                    {fact.content}
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleActive(fact)}
                    disabled={busyId === fact.id}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs border transition-colors disabled:opacity-50 ${
                      fact.active
                        ? "border-emerald-800/60 bg-emerald-950/60 text-emerald-300"
                        : "border-neutral-700 bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {fact.active ? "啟用中" : "已停用"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-neutral-600">
                    {fmtDate(fact.createdAt)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(fact)}
                      className="px-3 py-1 rounded-full border border-neutral-800 text-xs hover:bg-neutral-900"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFact(fact)}
                      disabled={busyId === fact.id}
                      className="px-3 py-1 rounded-full border border-red-900/60 text-xs text-red-300 hover:bg-red-950/40 disabled:opacity-50"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {createOpen && (
        <Modal title="新增冷知識" onClose={() => setCreateOpen(false)}>
          <form onSubmit={submitCreate} className="flex flex-col gap-4">
            <Field label="內容" hint={`最多 ${MAX_LEN} 字`}>
              <textarea
                required
                rows={3}
                value={createText}
                maxLength={MAX_LEN}
                onChange={(e) => setCreateText(e.target.value)}
                className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-neutral-600 resize-none"
                placeholder="例如：鋁罐可以無限次回收，再製只需用約 5% 的能源。"
              />
            </Field>
            <Field label="梗圖（可選）" hint="會壓縮到 1080px JPEG，PNG/HEIC/GIF 都可上傳">
              <MemeUpload
                imageUrl={createImageUrl}
                onChange={setCreateImageUrl}
              />
            </Field>
            {createError && (
              <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-xl px-3 py-2">
                {createError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full border border-neutral-800 px-4 py-1.5 text-sm hover:bg-neutral-900"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={createBusy}
                className="rounded-full bg-white text-black px-5 py-1.5 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50"
              >
                {createBusy ? "建立中…" : "建立"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editFact && (
        <Modal title="編輯冷知識" onClose={() => setEditFact(null)}>
          <form onSubmit={submitEdit} className="flex flex-col gap-4">
            <Field label="內容" hint={`最多 ${MAX_LEN} 字`}>
              <textarea
                required
                rows={3}
                value={editText}
                maxLength={MAX_LEN}
                onChange={(e) => setEditText(e.target.value)}
                className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-neutral-600 resize-none"
              />
            </Field>
            <Field label="梗圖（可選）">
              <MemeUpload imageUrl={editImageUrl} onChange={setEditImageUrl} />
            </Field>
            {editError && (
              <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-xl px-3 py-2">
                {editError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditFact(null)}
                className="rounded-full border border-neutral-800 px-4 py-1.5 text-sm hover:bg-neutral-900"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={editBusy}
                className="rounded-full bg-white text-black px-5 py-1.5 text-sm font-medium hover:bg-neutral-200 disabled:opacity-50"
              >
                {editBusy ? "儲存中…" : "儲存"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── 梗圖上傳元件 ──────────────────────────────────────
// 包含「選檔 → POST upload-image → 設定 imageUrl」整個流程，
// 與「清除」按鈕。預覽用瀏覽器原生 <img>。
function MemeUpload({
  imageUrl,
  onChange,
}: {
  imageUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const resp = await fetch("/api/admin/eco-facts/upload-image", {
        method: "POST",
        body: fd,
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setErr(data?.error ?? `上傳失敗 (${resp.status})`);
        return;
      }
      const data = (await resp.json()) as AdminEcoFactUploadResponse;
      onChange(data.url);
    } catch {
      setErr("網路錯誤");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {imageUrl ? (
        <div className="flex gap-3 items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="梗圖預覽"
            className="w-32 h-32 rounded-xl object-cover bg-neutral-950 border border-neutral-800"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="px-3 py-1.5 rounded-full border border-neutral-800 text-xs hover:bg-neutral-900 disabled:opacity-50"
            >
              {busy ? "上傳中…" : "換一張"}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={busy}
              className="px-3 py-1.5 rounded-full border border-red-900/60 text-xs text-red-300 hover:bg-red-950/40 disabled:opacity-50"
            >
              移除
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="px-4 py-3 rounded-xl border border-dashed border-neutral-700 text-sm text-neutral-400 hover:bg-neutral-900 disabled:opacity-50 text-left"
        >
          {busy ? "上傳中…" : "+ 選擇梗圖"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      {err && (
        <span className="text-xs text-red-400">{err}</span>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-bold text-lg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-200 text-xl leading-none"
            aria-label="關閉"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-neutral-400">{label}</span>
      {children}
      {hint && <span className="text-xs text-neutral-600">{hint}</span>}
    </label>
  );
}
