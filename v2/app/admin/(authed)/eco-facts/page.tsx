"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AdminCreateEcoFactRequest,
  AdminEcoFactsResponse,
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

  const [createOpen, setCreateOpen] = useState(false);
  const [createText, setCreateText] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editFact, setEditFact] = useState<EcoFact | null>(null);
  const [editText, setEditText] = useState("");
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
      const body: AdminCreateEcoFactRequest = { content };
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
    if (content === editFact.content) {
      setEditFact(null);
      return;
    }
    setEditBusy(true);
    try {
      await patchFact(editFact.id, { content });
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
            {activeCount} 則啟用中。
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
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 flex flex-col gap-4"
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
