"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export interface UserWithMethods {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
  can(permission: string): boolean;
  canAccess(model: string): boolean;
}

export function useUser() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "loading" && !session?.user) {
      router.push("/login");
    }
  }, [status, session, router]);

  const user: UserWithMethods | null = useMemo(() => {
    if (!session?.user) return null;

    return {
      ...session.user,
      can(permission: string) {
        return this.permissions.includes(permission.toLowerCase());
      },
      canAccess(model: string) {
        const models = [...new Set(this.permissions.map((p) => p.split(":")[0]))];
        return models.includes(model.toLowerCase());
      },
    } as UserWithMethods;
  }, [session]);

  return { user, loading: status === "loading" };
}
