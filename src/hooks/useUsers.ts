import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface UserRow {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "manager" | "viewer";
  divisionAccess: string[];
  isActive: boolean;
  createdAt: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json() as Promise<UserRow[]>;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; fullName: string; role: string; divisionAccess?: string[] }) => {
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create user");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; role?: string; divisionAccess?: string[]; isActive?: boolean }) => {
      const res = await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update user");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to deactivate user");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
