"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Pencil, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/badge";
import {AppColor,UserStatus,Roles} from "@/constants/enums";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { User } from "@/types/user.types";
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

interface UserProfileProps {
  user: User;
  onBack: () => void;
}

export function UserProfile({ user, onBack }: UserProfileProps) {
  const { lang } = useLanguage()
  const displayImage =
    user.profile_img && user.profile_img.startsWith("data:")
      ? user.profile_img
      : user.profile_img
        ? `data:image/png;base64,${user.profile_img}`
        : undefined

  const [isInviting, setIsInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const handleResendInvitation = async () => {
    setIsInviting(true)
    setInviteSuccess(null)
    setInviteError(null)
    setInviteLink(null)

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          role_id: user.role.id,
          resend: true, // indicates a resend action
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t("failed_resend_invitation", lang))
      }

      setInviteSuccess(`${t("invitation_resent_to", lang)} ${user.email}`)

      // For development, display the invitation link
      if (data.invitationLink) {
        setInviteLink(`${window.location.origin}${data.invitationLink}`)
      }
    } catch (error: any) {
      setInviteError(error.message)
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>{t("user_profile", lang)}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-6">
        <Avatar className="h-24 w-24">
          <AvatarImage src={displayImage || "/placeholder.svg"} alt={user.name} />
          <AvatarFallback className="text-2xl">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div>
          <Badge
            color={
              user.status === UserStatus.ACTIVE
                ? AppColor.SUCCESS
                : user.status === UserStatus.INACTIVE
                  ? AppColor.WARNING
                  : user.status === UserStatus.BANNED
                    ? AppColor.ERROR
                    : AppColor.INFO
            }
            text={user.status}
          />
        </div>

        <div className="w-full space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("name", lang)}</p>
              <p>{user.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("username", lang)}</p>
              <p>{user.username}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("email", lang)}</p>
            <p>{user.email}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("phone", lang)}</p>
            <p>{user.phone || t("not_provided", lang)}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("role", lang)}</p>
            <p
              className={`inline-block px-2 py-1 rounded-full text-xs ${
                user.role.name === Roles.Admin
                  ? AppColor.SUCCESS
                  : user.role.name === Roles.Management
                    ? AppColor.INFO
                    : AppColor.ERROR
              }`}
            >
              {user.role.name}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("created", lang)}</p>
              <p>{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("last_updated", lang)}</p>
              <p>{new Date(user.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Resend Invitation section (shown only when inactive) */}
        {user.status === UserStatus.INACTIVE && (
          <div className="w-full mt-4 space-y-2">
            {inviteSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <AlertTitle>{t("success", lang)}</AlertTitle>
                <AlertDescription>{inviteSuccess}</AlertDescription>
              </Alert>
            )}
            {inviteError && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertTitle>{t("error", lang)}</AlertTitle>
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            )}
            {inviteLink && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertTitle>{t("invitation_link_dev_only", lang)}</AlertTitle>
                <AlertDescription className="break-all">
                  <a href={inviteLink} target="_blank" rel="noopener noreferrer">
                    {inviteLink}
                  </a>
                </AlertDescription>
              </Alert>
            )}
            <Button variant="outline" className="w-full" onClick={handleResendInvitation} disabled={isInviting}>
              {isInviting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("sending_invitation", lang)}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t("resend_invitation", lang)}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">{t("user_not_activated", lang)}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back", lang)}
        </Button>
        <Link href={`/users/${user.id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            {t("edit", lang)}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

export default UserProfile