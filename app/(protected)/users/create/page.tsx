"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserForm } from "@/components/user-form";
import { InviteForm } from "@/components/invite-form";
import { Breadcrumb } from "@/components/breadcrumb";


export default function CreateUserPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)

  const handleSubmit = (formData: any) => {
    setLoading(true)

    setTimeout(() => {
      setLoading(false)
      alert("User created successfully!")
      router.push("/user")
    }, 1000)
  }

  const handleInvite = (email: string, roleId: string) => {
    setInviteLoading(true)

    // In a real app, this would call an API to send an invitation
    setTimeout(() => {
      setInviteLoading(false)
      alert(`Invitation sent to ${email}`)
    }, 1000)
  }

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: "Users", href: "/users" }, { label: "Create" }]} />

      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Add New User</CardTitle>
          </CardHeader>
          <Tabs defaultValue="create">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create User</TabsTrigger>
              <TabsTrigger value="invite">Send Invitation</TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <UserForm
                roles={[]}
                onSubmit={handleSubmit}
                onCancel={() => router.push("/user")}
                isLoading={loading}
              />
            </TabsContent>

            <TabsContent value="invite">
              <InviteForm
                roles={[]}
                onSubmit={handleInvite}
                onCancel={() => router.push("/user")}
                isLoading={inviteLoading}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}

