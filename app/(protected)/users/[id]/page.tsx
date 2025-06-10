"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { UserProfile } from "../../../../components/user-profile";
import { Breadcrumb } from "@/components/breadcrumb";
import { useUser } from "@/contexts/usercontext";
import { UserStatus } from "@/constants/enums";
import type { User } from "@/types/user.types";
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"



export default function ViewUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string; 
  const [fetchedUser, setFetchedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { auth, isLoading } = useUser();
  const { lang, setLang } = useLanguage()

  useEffect(() => {

    if (auth) {
      if (!auth.can("users:view")) {
        router.push("/dashboard");
        return; 
      } 
    }
    
    fetch(`/api/users/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("User not found");
        return res.json();
      })
      .then((data: User) => {
        setFetchedUser(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setFetchedUser(null);
        setLoading(false);
      });
  }, [userId]);

  if (isLoading  || loading) {
    return <p>{t("loading", lang)}</p>;
  }

  if (!fetchedUser) {
    return (
      <div className="container mx-auto py-6">
        <Breadcrumb
          items={[
            { label: t("users", lang), href: "/users" },
            { label:t("user_not_found", lang) },
          ]}
        />
        <div className="flex justify-center">
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          {t("user_not_found", lang)}. The user may have been deleted or you may have followed an invalid link.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="container mx-auto py-6">
      <Breadcrumb
        items={[
          { label: "Users", href: "/users" },
          { label: fetchedUser.name },
        ]}
      />
      <div className="flex justify-center"> 
        <UserProfile
          user={fetchedUser}
          onBack={() => router.push(`/users/`)}
        />
      </div>
    </div>
  );
}
