"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Upload } from "lucide-react"
import { Badge } from "@/components/badge"
import { AppColor,UserStatus } from "@/constants/enums"
import type { User } from "@/types/user.types";
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"


interface Role {
  id: string
  name: string
}

interface UserFormProps {
  user?: User
  roles: Role[]
  onSubmit: (formData: any) => void
  onCancel: () => void
  isLoading: boolean
}

export function UserForm({
  user,
  roles,
  onSubmit,
  onCancel,
  isLoading,
}: UserFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    phone: "",
    role_id: "",
    status: UserStatus.ACTIVE, // default status
    profile_img: null as string | null,
  })
  const { lang, setLang } = useLanguage()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (user && roles.length > 0) {
      setFormData({
        name: user.name,
        username: user.username,
        email: user.email,
        password: "",
        phone: user.phone || "",
        role_id: user.role_id, 
        status: user.status as UserStatus,
        profile_img: user.profile_img,
      })
      setIsInitialized(true)
    }
  }, [user, roles])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role_id: value }))
  }

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      status: value as UserStatus, 
    }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSizeInBytes = 1024 * 1024 // 1MB
    if (file.size > maxSizeInBytes) {
      alert("File size should not exceed 1MB")
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
      console.error("Error reading file")
      alert("There was an error reading the file. Please try again.")
    }

    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const isEditMode = !!user

  // displayImage is now simply the profile_img since it's stored as a full data URL.
  const displayImage = formData.profile_img || undefined
  
  // Check if the role_id exists in the roles array
  const roleExists = roles.some(role => role.id === formData.role_id)


  // Don't render the form until it's initialized
  if (isEditMode && !isInitialized) {
    return <div>t("loading_user_data", lang)</div>
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-2">
          <Avatar className="h-24 w-24">
            <AvatarImage src={displayImage || "/placeholder.svg"} alt={formData.name} />
            <AvatarFallback className="text-2xl">
              {formData.name ? formData.name.substring(0, 2).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center">
            <Label
              htmlFor="picture"
              className="cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md flex items-center"
            >
              <Upload className="mr-2 h-4 w-4" />
              {t("upload_photo", lang)}
            </Label>
            <Input id="picture" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
        </div>
        <div className="mt-2 flex justify-center">
          <Badge
            color={
              formData.status === UserStatus.ACTIVE
                ? AppColor.SUCCESS
                : formData.status === UserStatus.INACTIVE
                  ? AppColor.WARNING
                  : formData.status === UserStatus.BANNED
                    ? AppColor.ERROR
                    : AppColor.INFO
            }
            text={formData.status}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">{t("name", lang)}</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">{t("username", lang)}</Label>
          <Input id="username" name="username" value={formData.username} onChange={handleChange} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t("email", lang)}</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
        </div>

        {!isEditMode && (
          <div className="space-y-2">
            <Label htmlFor="password">{t("password", lang)}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required={!isEditMode}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="phone">{t("phone", lang)}</Label>
          <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">{t("role", lang)}</Label>
          <Select value={formData.role_id} defaultValue={formData.role_id} onValueChange={handleRoleChange}>
            <SelectTrigger id="role">
              <SelectValue placeholder={t("select_a_role", lang)} />
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

        <div className="space-y-2">
          <Label htmlFor="status">{t("status", lang)}</Label>
          <Select value={formData.status} onValueChange={handleStatusChange}>
            <SelectTrigger id="status">
              <SelectValue placeholder={t("select_a_status", lang)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UserStatus.ACTIVE}>{t("active", lang)}</SelectItem>
              <SelectItem value={UserStatus.INACTIVE}>{t("inactive", lang)}</SelectItem>
              <SelectItem value={UserStatus.BANNED}>{t("banned", lang)}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button type="button" variant="outline" onClick={onCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("cancel", lang)}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? isEditMode
              ? t("saving", lang)
              : t("creating", lang)
            : isEditMode
              ? t("save_changes", lang)
              : t("create_user", lang)}
        </Button>
      </CardFooter>
    </form>
  )
}