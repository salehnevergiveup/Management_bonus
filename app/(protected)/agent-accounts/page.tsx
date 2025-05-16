"use client"

import { useState, useEffect, useMemo } from "react"
import { Eye, EyeOff, Edit, Trash, MoreHorizontal, Plus, Search } from "lucide-react"
import { Breadcrumb } from "@/components/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUser } from "@/contexts/usercontext"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ConfirmationDialog } from "@/components/dialog"
import { Label } from "@/components/ui/label"
import toast from "react-hot-toast"
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

interface AgentAccount {
  id: string
  username: string
  password: string
  status: string
  progress: string
  process_id: string
  created_at: string
  updated_at: string
}

export default function AgentAccountManagementPage() {
  const { auth, isLoading } = useUser()
  const [allAgentAccounts, setAllAgentAccounts] = useState<AgentAccount[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<AgentAccount | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<AgentAccount | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const { lang, setLang } = useLanguage()

  // Form state for create/edit
  const [formUsername, setFormUsername] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [formErrors, setFormErrors] = useState<{ username?: string; password?: string }>({})

  // Filter and paginate accounts on the client side
  const filteredAccounts = useMemo(() => {
    if (!searchTerm) return allAgentAccounts

    return allAgentAccounts.filter(
      (account) =>
        account.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (account.status && account.status.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (account.process_id && account.process_id.toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [allAgentAccounts, searchTerm])

  // Calculate pagination
  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredAccounts.slice(startIndex, startIndex + pageSize)
  }, [filteredAccounts, currentPage, pageSize])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredAccounts.length / pageSize)),
    [filteredAccounts, pageSize],
  )

  const fetchAgentAccounts = async () => {
    if (auth) {
      if (!auth.canAccess("agent-accounts")) {
        router.push("/dashboard")
        return
      }
    }
    try {
      // Fetch all accounts at once
      const response = await fetch(`/api/agent-accounts?all=true`)

      if (!response.ok) {
        throw new Error("Failed to fetch agent accounts")
      }

      const data = await response.json()
      setAllAgentAccounts(data.data)
    } catch (error) {
      console.error("Error fetching agent accounts:", error)
      toast.error("Failed to fetch agent accounts")
    }
  }

  useEffect(() => {
    if (!isLoading && auth) {
      fetchAgentAccounts()
    }
  }, [isLoading, auth, router])

  // Reset to first page when search term or page size changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, pageSize])

  const validateForm = (isCreate = true) => {
    const errors: { username?: string; password?: string } = {}

    if (!formUsername || formUsername.length < 3) {
      errors.username = t("username_validation", lang)
    }

    if (isCreate && (!formPassword || formPassword.length < 6)) {
      errors.password = t("password_validation", lang)
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const createAgentAccount = async () => {
    if (!validateForm(true)) return

    try {
      const response = await fetch("/api/agent-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formUsername,
          password: formPassword,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create agent account")
      }

      const result = await response.json()
      toast.success("Agent account created successfully")
      setFormUsername("")
      setFormPassword("")
      setCreateDialogOpen(false)
      fetchAgentAccounts()
    } catch (error) {
      console.error("Error creating agent account:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create agent account")
    }
  }

  const updateAgentAccount = async () => {
    if (!selectedAccount || !validateForm(false)) return

    try {
      const updateData: Record<string, any> = {
        username: formUsername,
        password: formPassword,
      }

      const response = await fetch(`/api/agent-accounts/${selectedAccount.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update agent account")
      }

      const result = await response.json()
      toast.success("Agent account updated successfully")

      setFormUsername("")
      setFormPassword("")
      setEditDialogOpen(false)
      fetchAgentAccounts()
    } catch (error) {
      console.error("Error updating agent account:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update agent account")
    }
  }

  const deleteAgentAccount = async () => {
    if (!accountToDelete) return

    try {
      const response = await fetch(`/api/agent-accounts/${accountToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete agent account")
      }

      toast.success("Agent account deleted successfully")
      fetchAgentAccounts()
    } catch (error) {
      console.error("Error deleting agent account:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete agent account")
    } finally {
      setDeleteDialogOpen(false)
      setAccountToDelete(null)
    }
  }

  const handleCreate = () => {
    setFormUsername("")
    setFormPassword("")
    setFormErrors({})
    setCreateDialogOpen(true)
  }

  const handleEdit = (account: AgentAccount) => {
    setSelectedAccount(account)
    setFormUsername(account.username)
    setFormPassword(account.password)
    setFormErrors({})
    setEditDialogOpen(true)
  }

  const handleDelete = (account: AgentAccount) => {
    setAccountToDelete(account)
    setDeleteDialogOpen(true)
  }

  const togglePasswordVisibility = (accountId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  // Calculate pagination display values
  const startItem = filteredAccounts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, filteredAccounts.length)
  const hasPreviousPage = currentPage > 1
  const hasNextPage = currentPage < totalPages

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: t("agent_account_management", lang) }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{t("agent_account_management", lang)}</CardTitle>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <Button onClick={handleCreate} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {t("create_agent_account", lang)}
            </Button>
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => {
                setPageSize(Number(val))
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t("rows_per_page", lang)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 {t("rows", lang)}</SelectItem>
                <SelectItem value="10">10 {t("rows", lang)}</SelectItem>
                <SelectItem value="20">20 {t("rows", lang)}</SelectItem>
                <SelectItem value="50">50 {t("rows", lang)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("search_agent_accounts", lang)}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("username", lang)}</TableHead>
                  <TableHead>{t("password", lang)}</TableHead>
                  <TableHead>{t("status", lang)}</TableHead>
                  <TableHead>{t("progress", lang)}</TableHead>
                  <TableHead>{t("process_id", lang)}</TableHead>
                  <TableHead>{t("created_at", lang)}</TableHead>
                  <TableHead>{t("updated_at", lang)}</TableHead>
                  <TableHead className="text-right">{t("actions", lang)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {t("loading_agent_accounts", lang)}
                    </TableCell>
                  </TableRow>
                ) : paginatedAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {t("no_agent_accounts", lang)}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.username}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="mr-2">{visiblePasswords[account.id] ? account.password : "••••••••"}</span>
                          <Button variant="ghost" size="sm" onClick={() => togglePasswordVisibility(account.id)}>
                            {visiblePasswords[account.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{account.status || "N/A"}</TableCell>
                      <TableCell>{account.progress || "N/A"}</TableCell>
                      <TableCell>{account.process_id || "N/A"}</TableCell>
                      <TableCell>{account.created_at ? formatDate(account.created_at) : "N/A"}</TableCell>
                      <TableCell>{account.updated_at ? formatDate(account.updated_at) : "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(account)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t("edit", lang)}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(account)}>
                              <Trash className="mr-2 h-4 w-4" />
                              {t("delete", lang)}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredAccounts.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                {t("showing", lang)} <span className="font-medium">{startItem}</span> {t("to", lang)}{" "}
                <span className="font-medium">{endItem}</span> {t("of", lang)}{" "}
                <span className="font-medium">{filteredAccounts.length}</span> {t("agent_accounts", lang)}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center space-x-2 w-full sm:w-auto justify-center">
                  <Button
                    variant="outline"
                    onClick={() => goToPage(1)}
                    disabled={isLoading || !hasPreviousPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    {t("first", lang)}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={isLoading || !hasPreviousPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    {t("previous", lang)}
                  </Button>
                  <span className="px-2 text-sm">
                    {t("page", lang)} {currentPage} {t("of", lang)} {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={isLoading || !hasNextPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    {t("next", lang)}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => goToPage(totalPages)}
                    disabled={isLoading || !hasNextPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    {t("last", lang)}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Agent Account Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("create_agent_account", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="username">{t("username", lang)}</Label>
              <Input
                id="username"
                placeholder={t("enter_username", lang)}
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
              />
              {formErrors.username && <p className="text-sm text-red-500">{formErrors.username}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password", lang)}</Label>
              <div className="flex space-x-2">
                <Input
                  id="password"
                  type={visiblePasswords["create"] ? "text" : "password"}
                  placeholder={t("enter_password", lang)}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => togglePasswordVisibility("create")}>
                  {visiblePasswords["create"] ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {formErrors.password && <p className="text-sm text-red-500">{formErrors.password}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
            <Button onClick={createAgentAccount}>{t("create", lang)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Agent Account Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("edit_agent_account", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit_username">{t("username", lang)}</Label>
              <Input
                id="edit_username"
                placeholder={t("enter_username", lang)}
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
              />
              {formErrors.username && <p className="text-sm text-red-500">{formErrors.username}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_password">{t("password", lang)}</Label>
              <div className="flex space-x-2">
                <Input
                  id="edit_password"
                  type={visiblePasswords["edit"] ? "text" : "password"}
                  placeholder={t("enter_password", lang)}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => togglePasswordVisibility("edit")}>
                  {visiblePasswords["edit"] ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {formErrors.password && <p className="text-sm text-red-500">{formErrors.password}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
            <Button onClick={updateAgentAccount}>{t("update", lang)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={deleteAgentAccount}
        title={t("confirm_delete", lang)}
        children={
          <>
            <p>{t("delete_warning", lang)}</p>
            <p className="mt-2">{t("delete_irreversible", lang)}</p>
          </>
        }
        confirmText={t("delete", lang)}
      />
    </div>
  )
}
