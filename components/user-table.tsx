"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { MoreHorizontal, Search, Eye, Pencil, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { User } from "@/types/user.types";
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"
// Define the User type


interface UserTableProps {
  users: User[]
}

export function UserTable({ users }: UserTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const { lang } = useLanguage()

  // Filter users based on search term and role filter
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === "all" || roleFilter === "" || user.role.name === roleFilter

    return matchesSearch && matchesRole
  })

  const handleDelete = (id: string) => {
    // In a real app, this would call an API to delete the user
    alert(`${t("delete_user_with_id", lang)}: ${id}`)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("search_users", lang)}
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filter_by_role", lang)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_roles", lang)}</SelectItem>
            <SelectItem value="Admin">{t("admin", lang)}</SelectItem>
            <SelectItem value="User">{t("user", lang)}</SelectItem>
            <SelectItem value="Editor">{t("editor", lang)}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("user", lang)}</TableHead>
              <TableHead>{t("username", lang)}</TableHead>
              <TableHead>{t("email", lang)}</TableHead>
              <TableHead>{t("role", lang)}</TableHead>
              <TableHead>{t("created", lang)}</TableHead>
              <TableHead className="text-right">{t("actions", lang)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.profile_img || undefined} alt={user.name} />
                      <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                  </div>
                </TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      user.role.name === "Admin"
                        ? "bg-blue-100 text-blue-800"
                        : user.role.name === "Editor"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {user.role.name}
                  </span>
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">{t("open_menu", lang)}</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href={`/user/${user.id}`}>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          {t("view", lang)}
                        </DropdownMenuItem>
                      </Link>
                      <Link href={`/user/${user.id}/edit`}>
                        <DropdownMenuItem>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("edit", lang)}
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem onClick={() => handleDelete(user.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("delete", lang)}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
