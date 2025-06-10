"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Suspense } from "react"
import { useRouter } from "next/navigation"
import { LanguageProvider, useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const { lang } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError(t("invalid_invitation_link", lang))
      setLoading(false)
      return
    }

    fetch(`/api/invitations/verify?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        setLoading(false)
        if (data.error) {
          setError(data.error)
        } else {
          setEmail(data.email)
          setUsername(data.email.split("@")[0])
        }
      })
      .catch((err) => {
        setLoading(false)
        setError(t("failed_to_verify_invitation", lang))
        console.error(err)
      })
  }, [token, lang])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (password !== confirmPassword) {
      setError(t("passwords_do_not_match", lang))
      return
    }

    if (password.length < 8) {
      setError(t("password_length_requirement", lang))
      return
    }

    if (!username.trim()) {
      setError(t("username_required", lang))
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          username,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t("something_went_wrong", lang))
        setSubmitting(false)
        return
      }

      setSuccess(true)

      // Redirect to login page after 3 seconds
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (err) {
      console.error(err)
      setError(t("failed_to_complete_setup", lang))
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-gray-600">{t("verifying_invitation", lang)}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">{t("invalid_invitation", lang)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>{t("error", lang)}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push("/login")}>{t("go_to_login", lang)}</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">{t("account_setup_complete", lang)}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">{t("account_created_redirect", lang)}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">{t("complete_account_setup", lang)}</CardTitle>
          <CardDescription className="text-center">{t("invitation_description", lang)}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email", lang)}</Label>
              <Input id="email" type="email" value={email || ""} disabled />
              <p className="text-sm text-muted-foreground">{t("email_cannot_change", lang)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">{t("username", lang)}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("choose_username", lang)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password", lang)}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("create_password", lang)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirm_password", lang)}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("confirm_your_password", lang)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("setting_up_account", lang)}
                </>
              ) : (
                t("complete_setup", lang)
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <LanguageProvider>
      <Suspense
        fallback={
          <div className="flex justify-center items-center min-h-screen bg-gray-50">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        }
      >
        <AcceptInvitationContent />
      </Suspense>
    </LanguageProvider>
  )
}