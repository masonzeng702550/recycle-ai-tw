"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AdminCreateOrgRequest,
  AdminOrgsResponse,
  AdminUpdateOrgRequest,
} from "@/lib/api-contracts";
import type { OrgPublicInfo } from "@/lib/types";

type Org = OrgPublicInfo & { id: number; createdAt: string };

const CODE_RE = /^[A-Za-z0-9-]{3,32}$/;

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-TW", { hour12: false });
}

interface FormState {
  code: string;
  name: string;
  apiKey: string;
}

const EMPTY_FORM: FormState = { code: "", name: "", apiKey: "" };

export default function OrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // edit modal
  const [editOrg, setEditOrg] = useState<Org | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; apiKey: string }>({
    name: "",
    apiKey: "",
  });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/admin/orgs", { cache: "no-store" });
      if (!resp.ok) {
        setError(`讀取失敗 (${resp.status})`);
        return;
      }
      const data = (await resp.json()) as AdminOrgsResponse;
      setOrgs(data.orgs);
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

  function openCreate() {
    setCreateForm(EMPTY_FORM);
    setCreateError(null);
    setCreateOpen(true);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!CODE_RE.test(createForm.code)) {
      setCreateError("代號需為 3–32 字元，僅可包含英數與連字號");
      return;
    }
    if (!createForm.name.trim()) {
      setCreateError("請輸入名稱");
      return;
    }
    if (!createForm.apiKey.trim()) {
      setCreateError("請輸入 API Key");
      return;
    }
    setCreateBusy(true);
    try {
      const body: AdminCreateOrgRequest = {
        code: createForm.code.trim(),
        name: createForm.name.trim(),
        apiKey: createForm.apiKey,
      };
      const resp = await fetch("/api/admin/orgs", {
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

  async function patchOrg(id: number, body: AdminUpdateOrgRequest) {
    const resp = await fetch(`/api/admin/orgs/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data?.error ?? `更新失敗 (${resp.status})`);
    }
  }

  async function toggleActive(org: Org) {
    setBusyId(org.id);
    try {
      await patchOrg(org.id, { active: !org.active });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(org: Org) {
    setEditOrg(org);
    setEditForm({ name: org.name, apiKey: "" });
    setEditError(null);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editOrg) return;
    setEditError(null);
    setEditBusy(true);
    try {
      const body: AdminUpdateOrgRequest = {};
      if (editForm.name.trim() && editForm.name.trim() !== editOrg.name) {
        body.name = editForm.name.trim();
      }
      if (editForm.apiKey.trim()) {
        body.apiKey = editForm.apiKey;
      }
      if (Object.keys(body).length === 0) {
        setEditOrg(null);
        return;
      }
      await patchOrg(editOrg.id, body);
      setEditOrg(null);
      await load();
    } catch (e) {
      setEditError((e as Error).message);
    } finally {
      setEditBusy(false);
    }
  }

  async function deleteOrg(org: Org) {
    if (!confirm(`確定要刪除組織「${org.name}」（${org.code}）？此動作無法復原。`)) {
      return;
    }
    setBusyId(org.id);
    try {
      const resp = await fetch(`/api/admin/orgs/${org.id}`, {
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
          <h1 className="font-serif font-bold text-2xl sm:text-3xl">組織代號</h1>
          <p className="text-sm text-neutral-500 mt-1">
            把代號告知使用者，他們在設定頁輸入即可（不需要看到 API Key）
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full bg-white text-black px-5 py-2 text-sm font-medium hover:bg-neutral-200"
        >
          新增組織
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-2xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
        {/* Desktop */}
        <table className="hidden sm:table w-full text-sm">
          <thead className="bg-neutral-950 text-neutral-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left font-medium">代號</th>
              <th className="px-4 py-3 text-left font-medium">名稱</th>
              <th className="px-4 py-3 text-left font-medium">建立時間</th>
              <th className="px-4 py-3 text-left font-medium">狀態</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && orgs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-600">
                  載入中…
                </td>
              </tr>
            ) : orgs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-600">
                  尚未新增任何組織
                </td>
              </tr>
            ) : (
              orgs.map((org) => (
                <tr
                  key={org.id}
                  className="border-t border-neutral-800/80 hover:bg-neutral-950/40"
                >
                  <td className="px-4 py-2.5 font-mono text-neutral-100">
                    {org.code}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-200">{org.name}</td>
                  <td className="px-4 py-2.5 text-neutral-500 text-xs">
                    {fmtDate(org.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleActive(org)}
                      disabled={busyId === org.id}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors disabled:opacity-50 ${
                        org.active
                          ? "border-emerald-800/60 bg-emerald-950/60 text-emerald-300"
                          : "border-neutral-700 bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {org.active ? "啟用中" : "已停用"}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(org)}
                        className="px-3 py-1 rounded-full border border-neutral-800 text-xs hover:bg-neutral-900"
                      >
                        編輯
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteOrg(org)}
                        disabled={busyId === org.id}
                        className="px-3 py-1 rounded-full border border-red-900/60 text-xs text-red-300 hover:bg-red-950/40 disabled:opacity-50"
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-neutral-800">
          {loading && orgs.length === 0 ? (
            <div className="px-4 py-8 text-center text-neutral-600">載入中…</div>
          ) : orgs.length === 0 ? (
            <div className="px-4 py-8 text-center text-neutral-600">
              尚未新增任何組織
            </div>
          ) : (
            orgs.map((org) => (
              <div key={org.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-neutral-100">{org.code}</span>
                  <button
                    type="button"
                    onClick={() => toggleActive(org)}
                    disabled={busyId === org.id}
                    className={`px-2.5 py-0.5 rounded-full text-xs border ${
                      org.active
                        ? "border-emerald-800/60 bg-emerald-950/60 text-emerald-300"
                        : "border-neutral-700 bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {org.active ? "啟用中" : "已停用"}
                  </button>
                </div>
                <div className="text-sm text-neutral-200">{org.name}</div>
                <div className="text-xs text-neutral-500">{fmtDate(org.createdAt)}</div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openEdit(org)}
                    className="flex-1 px-3 py-1.5 rounded-full border border-neutral-800 text-xs hover:bg-neutral-900"
                  >
                    編輯
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteOrg(org)}
                    disabled={busyId === org.id}
                    className="flex-1 px-3 py-1.5 rounded-full border border-red-900/60 text-xs text-red-300 disabled:opacity-50"
                  >
                    刪除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create modal */}
      {createOpen && (
        <Modal title="新增組織" onClose={() => setCreateOpen(false)}>
          <form onSubmit={submitCreate} className="flex flex-col gap-4">
            <Field label="代號" hint="3–32 字元，僅英數與連字號">
              <input
                type="text"
                required
                value={createForm.code}
                onChange={(e) =>
                  setCreateForm({ ...createForm, code: e.target.value })
                }
                className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-neutral-600 font-mono"
                placeholder="taipei-school-01"
              />
            </Field>
            <Field label="名稱">
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-neutral-600"
              />
            </Field>
            <Field label="API Key" hint="建立後不會再顯示，請妥善保存">
              <input
                type="password"
                required
                value={createForm.apiKey}
                onChange={(e) =>
                  setCreateForm({ ...createForm, apiKey: e.target.value })
                }
                className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-neutral-600 font-mono"
                autoComplete="new-password"
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

      {/* Edit modal */}
      {editOrg && (
        <Modal
          title={`編輯組織 · ${editOrg.code}`}
          onClose={() => setEditOrg(null)}
        >
          <form onSubmit={submitEdit} className="flex flex-col gap-4">
            <Field label="名稱">
              <input
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-neutral-600"
              />
            </Field>
            <Field label="API Key" hint="留空則不變更">
              <input
                type="password"
                value={editForm.apiKey}
                onChange={(e) =>
                  setEditForm({ ...editForm, apiKey: e.target.value })
                }
                className="px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 focus:outline-none focus:border-neutral-600 font-mono"
                autoComplete="new-password"
                placeholder="（不變更請留空）"
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
                onClick={() => setEditOrg(null)}
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
