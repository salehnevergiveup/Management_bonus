"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Breadcrumb } from "@/components/breadcrumb"
import { UserProfileEdit, type ProfileUser } from "@/components/user-profile-edit"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle } from "lucide-react"
import { useUser } from "@/contexts/usercontext"
import { useLanguage } from "@app/contexts/LanguageContext";
import { t } from "@app/lib/i18n";

export default function ProfilePage() {
  const router = useRouter()
  const { auth, isLoading } = useUser()
  
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!auth?.id) return
      
      try {
        const userRes = await fetch(`/api/profile`)
        if (!userRes.ok) {
          const data = await userRes.json()
          throw new Error(data.error || "Failed to fetch profile")
        }
        const userData = await userRes.json()
        setUser(userData)
      } catch (error: any) {
        setError(error.message)
      }
    }

    if (!isLoading) {
      fetchData()
    }
  }, [auth?.id, isLoading])

  const { lang, setLang } = useLanguage()


  const handleSubmit = async (formData: any) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    
    try {
      const res = await fetch(`/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile")
      }
      
      setSuccess("Profile updated successfully!")
      
      setUser(prev => prev ? {...prev, ...data} : null)
      
      window.scrollTo(0, 0)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <p>Loading...</p>
      </div>
    )
  }

  if (!auth) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          You must be logged in to view this page
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: t("dashboard", lang), href: "/dashboard" }, { label: t("my_profile", lang) }]} />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{t("error", lang)}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle>{t("success", lang)}</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">{t("my_profile", lang)}</CardTitle>
          </CardHeader>
          {user ? (
            <UserProfileEdit
              user={user}
              onSubmit={handleSubmit}
              onCancel={() => router.push("/dashboard")}
              isLoading={loading}
            />
          ) : (
            <div className="p-6 text-center">
              {error ? (
                <p className="text-destructive">{t("error_loading_profile", lang)}</p>
              ) : (
                <p>{t("loading_profile_data", lang)}</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}