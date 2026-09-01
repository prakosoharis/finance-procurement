"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUsers, useCreateUser, useUpdateUser, useDeactivateUser, type UserRow } from "@/hooks/useUsers";
import { allowedDivisionsFor } from "@/lib/access";
import type { PnlRow } from "@/types";
import { Card, CardBar } from "@/components/dashboard/Card";

const ROLES = ["admin", "manager", "viewer"] as const;
const PREVIEW_DIVISIONS = ["SMM", "SUN", "OliveLink", "Combine"];

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();

  const [form, setForm] = useState({ email: "", fullName: "", role: "viewer" as (typeof ROLES)[number] });
  const [lastTempPassword, setLastTempPassword] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const result = await createUser.mutateAsync(form);
    setLastTempPassword(result.tempPassword);
    setForm({ email: "", fullName: "", role: "viewer" });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
        <div>
          <label className="mb-1 block text-[11px] text-muted">Email</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="rounded border border-border bg-bg3 px-2 py-1.5 text-xs text-text outline-none focus:border-teal"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-muted">Full name</label>
          <input
            required
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            className="rounded border border-border bg-bg3 px-2 py-1.5 text-xs text-text outline-none focus:border-teal"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-muted">Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as (typeof ROLES)[number] }))}
            className="rounded border border-border bg-bg3 px-2 py-1.5 text-xs text-text outline-none focus:border-teal"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={createUser.isPending} className="rounded-md bg-teal px-3 py-1.5 text-xs font-semibold text-bg">
          Add user
        </button>
      </form>

      {lastTempPassword && (
        <p className="rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-gold">
          User created. Temporary password (relay this out-of-band, it will not be shown again):{" "}
          <span className="font-mono">{lastTempPassword}</span>
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted">Loading users...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-bg3 text-left text-[11px] uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-t border-border even:bg-bg2">
                  <td className="px-3 py-2 text-text">{u.fullName}</td>
                  <td className="px-3 py-2 text-muted">{u.email}</td>
                  <td className="px-3 py-2">
                    <select
                      defaultValue={u.role}
                      onChange={(e) => updateUser.mutate({ id: u.id, role: e.target.value })}
                      className="rounded border border-border bg-bg3 px-2 py-1 text-xs text-text"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <span className={u.isActive ? "text-green" : "text-red"}>{u.isActive ? "active" : "deactivated"}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {u.isActive && (
                      <button onClick={() => deactivateUser.mutate(u.id)} className="text-[11px] text-red hover:underline">
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {users && users.length > 0 && <PreviewAsPanel users={users} />}
    </div>
  );
}

function PreviewAsPanel({ users }: { users: UserRow[] }) {
  const [previewUserId, setPreviewUserId] = useState(users[0].id);
  const previewUser = users.find((u) => u.id === previewUserId) ?? users[0];

  const { data: allRows, isLoading } = useQuery({
    queryKey: ["pnl-all-divisions-preview"],
    queryFn: async () => {
      const res = await fetch(`/api/pnl?division=All&year=All&quarter=FY&type=actual`);
      if (!res.ok) throw new Error("Failed to load division snapshot");
      return res.json() as Promise<PnlRow[]>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const latestByDivision = useMemo(() => {
    const map = new Map<string, PnlRow>();
    for (const r of allRows ?? []) {
      const existing = map.get(r.division);
      if (!existing || r.year > existing.year) map.set(r.division, r);
    }
    return map;
  }, [allRows]);

  const allowed = allowedDivisionsFor(previewUser);
  const hiddenDivisions = allowed === null ? [] : PREVIEW_DIVISIONS.filter((d) => !allowed.includes(d));

  return (
    <Card>
      <CardBar>
        <span>👁 Preview as</span>
        <select
          value={previewUserId}
          onChange={(e) => setPreviewUserId(e.target.value)}
          className="ml-2 rounded border border-border bg-bg3 px-2 py-1 text-[11px] normal-case text-text outline-none"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName} ({u.role})
            </option>
          ))}
        </select>
      </CardBar>
      <div className="p-4">
        {isLoading ? (
          <p className="text-xs text-muted">Loading division snapshots...</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {PREVIEW_DIVISIONS.map((div) => {
              const canRead = allowed === null || allowed.includes(div);
              const row = latestByDivision.get(div);
              return (
                <div key={div} className={`rounded-lg border p-3 ${canRead ? "border-border bg-bg3" : "border-red/30 bg-red/[0.04]"}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-text">{div}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        !canRead ? "bg-red/15 text-red" : previewUser.role === "viewer" ? "bg-teal/15 text-teal" : "bg-green/15 text-green"
                      }`}
                    >
                      {!canRead ? "NONE" : previewUser.role === "viewer" ? "READ" : "R+W"}
                    </span>
                  </div>
                  {!canRead ? (
                    <p className="text-[11px] text-red">🔒 Access Denied</p>
                  ) : row ? (
                    <div className="space-y-0.5 text-[10px] text-muted">
                      <p>
                        VC: <span className="font-mono text-text">${row.totalValueCreation.toFixed(2)}Mn</span>
                      </p>
                      <p>
                        NVC: <span className="font-mono text-text">${row.netValueCreation.toFixed(2)}Mn</span>
                      </p>
                      <p>
                        Cost: <span className="font-mono text-text">${row.totalCostIncurred.toFixed(2)}Mn</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted">No FY data yet</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {hiddenDivisions.length > 0 && (
          <p className="mt-3 text-[11px] text-muted">
            {previewUser.fullName} cannot see: <span className="text-red">{hiddenDivisions.join(", ")}</span>
          </p>
        )}
      </div>
    </Card>
  );
}
