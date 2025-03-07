"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteForm } from "@/components/invite-form";
import { Breadcrumb } from "@/components/breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle } from "lucide-react";
import { useUser } from "@/contexts/usercontext";

export default function InviteUserPage() {
  const router = useRouter();
  const [inviteLoading, setInviteLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const { auth, isLoading } = useUser();

  useEffect(() => {
    if (auth) {
      if (!auth.can("users:create")) {
        router.push("/dashboard");
        return; 
      } 
    }
    fetch("/api/roles")
      .then((res) => res.json())
      .then((data) => {
        setRoles(data);
      })
      .catch((err) => {
        console.error("Error fetching roles:", err);
      });
  }, []);

  const handleInvite = async (email: string, roleId: string) => {
    setInviteLoading(true);
    setError(null);
    setSuccess(null);
    setInviteLink(null);

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role_id: roleId }),
      });

      const data = (await response.json()) as {
        invitationLink?: string;
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      setSuccess(`Invitation sent to ${email}`);


      if (data.invitationLink) {
        setInviteLink(`${window.location.origin}${data.invitationLink}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: "Users", href: "/users" }, { label: "Invite" }]} />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Send Invitation</CardTitle>
          </CardHeader>
          <InviteForm
            roles={roles}
            onSubmit={handleInvite}
            onCancel={() => router.push("/users")}
            isLoading={inviteLoading}
          />
        </Card>
      </div>
    </div>
  );
}
