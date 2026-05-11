import { prisma } from "@/lib/prisma";

/** Bản ghi bảng AdminManagedKey — dùng delegate tách riêng để `tsc` vẫn qua khi Prisma client chưa regenerate (Windows EPERM). */
export type AdminManagedKeyRecord = {
  id: string;
  label: string;
  envKey: string;
  value: string;
  description: string | null;
  enabled: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminManagedKeyCreateData = {
  label: string;
  envKey: string;
  value: string;
  description: string | null;
  enabled: boolean;
  sortOrder: number;
};

export type AdminManagedKeyUpdateData = Partial<{
  label: string;
  envKey: string;
  value: string;
  description: string | null;
  enabled: boolean;
  sortOrder: number;
}>;

type Delegate = {
  findMany: (args?: {
    orderBy?: Array<Record<string, "asc" | "desc">>;
  }) => Promise<AdminManagedKeyRecord[]>;
  create: (args: { data: AdminManagedKeyCreateData }) => Promise<AdminManagedKeyRecord>;
  update: (args: { where: { id: string }; data: AdminManagedKeyUpdateData }) => Promise<AdminManagedKeyRecord>;
  delete: (args: { where: { id: string } }) => Promise<AdminManagedKeyRecord>;
};

export function adminManagedKeys(): Delegate {
  return (prisma as unknown as { adminManagedKey: Delegate }).adminManagedKey;
}
