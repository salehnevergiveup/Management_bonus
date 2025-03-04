"use client"

import { useState, useEffect } from "react"
import { CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Upload, Save } from "lucide-react"
import { Badge } from "@/components/badge"
import { AppColor } from "@/constants/colors"
import { UserStatus } from "@/constants/userStatus"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Role {
  id: string
  name: string
}

export interface ProfileUser {
  id: string
  name: string
  username: string
  email: string
  phone: string | null
  status: UserStatus
  profile_img: string | null
  role_id: string
  role: Role
}

interface UserProfileEditProps {
  user: ProfileUser
  onSubmit: (formData: any) => void
  onCancel: () => void
  isLoading: boolean
}

export function UserProfileEdit({
  user,
  onSubmit,
  onCancel,
  isLoading,
}: UserProfileEditProps) {
  const [formData, setFormData] = useState({
    name: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    profile_img: null as string | null,
  })
  
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        profile_img: user.profile_img,
      })
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSizeInBytes = 1024 * 1024 // 1MB
    if (file.size > maxSizeInBytes) {
      setError("File size should not exceed 1MB")
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        profile_img: reader.result as string,
      }))
    }

    reader.onerror = () => {
      setError("Error reading file. Please try again.")
    }

    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validate password fields if user is trying to change password
    if (formData.newPassword || formData.confirmPassword || formData.currentPassword) {
      if (!formData.currentPassword) {
        setError("Current password is required to change your password")
        return
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        setError("New passwords don't match")
        return
      }
      
      if (formData.newPassword.length < 8) {
        setError("New password must be at least 8 characters long")
        return
      }
    }
    
    // Prepare the data to submit
    const dataToSubmit = {
      name: formData.name,
      profile_img: formData.profile_img,
      // Only include password fields if user is changing password
      ...(formData.newPassword ? {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      } : {})
    }
    
    onSubmit(dataToSubmit)
  }

  // displayImage is the profile_img stored as a data URL
  const displayImage = formData.profile_img || undefined

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-col items-center space-y-2">
          <Avatar className="h-24 w-24">
            <AvatarImage src={displayImage} alt={formData.name} />
            <AvatarFallback className="text-2xl">
              {formData.name
                ? formData.name.substring(0, 2).toUpperCase()
                : "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center">
            <Label
              htmlFor="picture"
              className="cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md flex items-center"
            >
              <Upload className="mr-2 h-4 w-4" />
              Change Photo
            </Label>
            <Input
              id="picture"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        </div>
        
        {/* Display account information (non-editable) */}
        <div className="bg-muted/40 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Account Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Email:</span>
              <p>{user.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Username:</span>
              <p>{user.username}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Role:</span>
              <p>
                <Badge color={AppColor.SUCCESS} text={user.role.name} />
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <p>
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
              </p>
            </div>
          </div>
        </div>
        
        {/* Editable fields */}
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">Change Password</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Leave these fields blank if you don't want to change your password
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            "Saving..."
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Profile
            </>
          )}
        </Button>
      </CardFooter>
    </form>
  )
}