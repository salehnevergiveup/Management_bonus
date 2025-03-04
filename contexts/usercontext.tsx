"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { json } from "stream/consumers";

export interface UserWithMethods {
  id: string;
  name: string;
  email: string;
  username: string;
  picture: string;
  role: string;
  permissions: string[];
  can(permission: string): boolean;
  canAccess(model: string): boolean;
}

interface UserContextType {
  user: UserWithMethods | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const loading = status === "loading";
  React.useEffect(() => {
    if (status !== "loading" && !session?.user) {
      router.push("/login");
    }
  }, [status, session, router]);

  const user = React.useMemo(() => {
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

  const refresh = async () => {
    await update();
  };

  const value = { user, loading, refresh };
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}