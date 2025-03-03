"use client"

import type React from "react"
import { useState } from "react"
import { CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Mail, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Role {
  id: string
  name: string
}

interface InviteFormProps {
  roles: Role[]
  onSubmit: (email: string, roleId: string) => void
  onCancel: () => void
  isLoading: boolean
}

export function InviteForm({ roles, onSubmit, onCancel, isLoading }: InviteFormProps) {
  const [email, setEmail] = useState("")
  const [roleId, setRoleId] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setError("Email is required")
      return
    }
    
    if (!roleId) {
      setError("Please select a role")
      return
    }
    
    setError(null)
    onSubmit(email, roleId)
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4 pt-6">
        <div className="text-center mb-4">
          <Mail className="h-12 w-12 mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Send an invitation email to allow a user to join your system</p>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="inviteEmail">Email Address</Label>
          <Input
            id="inviteEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inviteRole">Role</Label>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger id="inviteRole">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button type="button" variant="outline" onClick={onCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send Invitation"
          )}
        </Button>
      </CardFooter>
    </form>
  )
}