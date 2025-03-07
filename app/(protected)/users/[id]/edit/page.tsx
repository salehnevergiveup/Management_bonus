"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { UserForm } from "@/components/user-form"
import { Breadcrumb } from "@/components/breadcrumb"
import { useUser } from "@/contexts/usercontext";


export default function EditUserPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [roles, setRoles] = useState<any[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const { auth, isLoading } = useUser();

  useEffect(() => {
    if (auth) {
      if (!auth.can("users:edit")) {
        router.push("/dashboard");
        return; 
      } 
    }
    async function fetchData() {
      try {
        const userRes = await fetch(`/api/users/${userId}`)
        if (!userRes.ok) throw new Error("User not found")
        const userData = await userRes.json()
        setUser(userData)
      } catch (error: any) {
        setFetchError(error.message)
      }
    }

    async function fetchRoles() {
      try {
        const rolesRes = await fetch(`/api/roles`)
        if (!rolesRes.ok) throw new Error("Roles not found")
        const rolesData = await rolesRes.json()
        setRoles(rolesData)
      } catch (error) {
        setRoles([])
      }
    }

    fetchData()
    fetchRoles()
  }, [userId])

  if (fetchError) {
    return (
      <div className="container mx-auto py-6">
        <Breadcrumb
          items={[
            { label: "Users", href: "/users" },
            { label: "Edit", href: `/users/${userId}` },
            { label: "User Not Found" },
          ]}
        />
        <div className="flex justify-center">
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            {fetchError}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <p>Loading user data...</p>
      </div>
    )
  }

  const handleSubmit = async (formData: any) => {
    setLoading(true)
    try {
      console.log(formData); 
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      setLoading(false)
      if (!res.ok) throw new Error("Failed to update user")
      alert("User updated successfully!")
      router.push(`/users/${userId}`)
    } catch (error: any) {
      setLoading(false)
      alert(error.message)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb
        items={[
          { label: "Users", href: "/users" },
          { label: user.name, href: `/users/${userId}` },
          { label: "Edit" },
        ]}
      />
      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Edit User</CardTitle>
          </CardHeader>
          <UserForm
            user={user}
            roles={roles}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={loading}
          />
        </Card>
      </div>
    </div>
  )
}
