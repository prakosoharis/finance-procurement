"use client";

import { useState } from "react";
import { useUsers, useCreateUser, useUpdateUser, useDeactivateUser } from "@/hooks/useUsers";

const ROLES = ["admin", "manager", "viewer"] as const;

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
    </div>
  );
}
