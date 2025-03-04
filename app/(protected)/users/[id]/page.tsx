"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { UserProfile } from "../../../../components/user-profile";
import { Breadcrumb } from "@/components/breadcrumb";
import { useUser } from "@/contexts/usercontext";
import { UserStatus } from "@/constants/userStatus";
import type { User } from "@/types/user";





export default function ViewUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { user: sessionUser, loading: sessionLoading } = useUser();
 
  // State to store the fetched user
  const [fetchedUser, setFetchedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
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

  if (sessionLoading || loading) {
    return <p>Loading...</p>;
  }

  if (!fetchedUser) {
    return (
      <div className="container mx-auto py-6">
        <Breadcrumb
          items={[
            { label: "Users", href: "/users" },
            { label: "User Not Found" },
          ]}
        />
        <div className="flex justify-center">
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            User not found. The user may have been deleted or you may have followed an invalid link.
          </div>
        </div>
      </div>
    );
  }
  console.log(fetchedUser.status); 
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
          onBack={() => router.push("/user")}
        />
      </div>
    </div>
  );
}
