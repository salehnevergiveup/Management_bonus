"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, X } from "lucide-react"
import { ProcessStatus, AppColor } from "@/constants/enums"
import toast from "react-hot-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

interface User {
  id: string
  name: string
  email: string
  profile_img?: string
}

interface ConnectedUser {
  id: string
  username: string
}

interface Process {
  id: string
  process_name: string
  status: string
  start_time?: string
  end_time?: string
  created_at: string
  updated_at: string
  isActive: boolean
  user_id: string
  user: User
  from_date?: string
  to_date?: string
  connected_users?: ConnectedUser[]
}

interface AccountTurnover {
  id: string
  username: string
  game: string
  currency: string
  turnover: number
  createdAt: string
}

interface Bonus {
  id: string
  name: string
  function: string
  description: string
  baseline?: number
}

interface Match {
  id: string
  username: string
  game?: string
  status: string
  amount: number
  currency: string
  bonus_id?: string
  bonus_name?: string
  bonus_value?: number
  created_at: string
  updated_at?: string
}

interface ProcessDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  processId: string | null
}

export function ProcessDetailsDialog({ open, onOpenChange, processId }: ProcessDetailsDialogProps) {
  const [process, setProcess] = useState<Process | null>(null)
  const [accountTurnovers, setAccountTurnovers] = useState<AccountTurnover[]>([])
  const [filteredAccountTurnovers, setFilteredAccountTurnovers] = useState<AccountTurnover[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([])
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isBonusesLoading, setIsBonusesLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const { lang, setLang } = useLanguage()

  // Search and filter states for Account Turnover
  const [turnoverSearch, setTurnoverSearch] = useState({
    username: "",
    game: "",
    currency: "",
    turnover: "",
  })

  // Search and filter states for Matches
  const [matchSearch, setMatchSearch] = useState({
    username: "",
    game: "",
    status: "",
    amount: "",
    bonus: "",
  })

  // Available currencies and games for dropdowns
  const currencies = ["MYR", "USD"]
  const matchStatuses = ["PENDING", "SUCCESS", "FAILED"]

  // Add these pagination-related states after the existing state declarations
  const [turnoverPage, setTurnoverPage] = useState(1)
  const [turnoverPageSize, setTurnoverPageSize] = useState(10)
  const [matchesPage, setMatchesPage] = useState(1)
  const [matchesPageSize, setMatchesPageSize] = useState(10)

  useEffect(() => {
    if (open && processId) {
      fetchProcessDetails(processId)
      fetchBonuses()
    } else {
      // Reset state when dialog closes
      setProcess(null)
      setAccountTurnovers([])
      setFilteredAccountTurnovers([])
      setMatches([])
      setFilteredMatches([])
      resetSearchFilters()
    }
  }, [open, processId])

  // Apply filters to account turnovers whenever the search criteria or data changes
  useEffect(() => {
    if (accountTurnovers.length > 0) {
      applyTurnoverFilters()
    }
  }, [turnoverSearch, accountTurnovers])

  // Apply filters to matches whenever the search criteria or data changes
  useEffect(() => {
    if (matches.length > 0) {
      applyMatchFilters()
    }
  }, [matchSearch, matches])

  // Update the resetSearchFilters function to also reset pagination
  const resetSearchFilters = () => {
    setTurnoverSearch({
      username: "",
      game: "",
      currency: "",
      turnover: "",
    })
    setMatchSearch({
      username: "",
      game: "",
      status: "",
      amount: "",
      bonus: "",
    })
    setTurnoverPage(1)
    setMatchesPage(1)
  }

  const fetchProcessDetails = async (id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/processes/${id}/details`)

      if (!response.ok) {
        throw new Error("Failed to fetch process details")
      }

      const data = await response.json()
      setProcess(data.process)
      setAccountTurnovers(data.accountTurnovers || [])
      setFilteredAccountTurnovers(data.accountTurnovers || [])
      setMatches(data.matches || [])
      setFilteredMatches(data.matches || [])
    } catch (error) {
      console.error("Error fetching process details:", error)
      toast.error("Failed to load process details")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBonuses = async () => {
    setIsBonusesLoading(true)
    try {
      const response = await fetch("/api/bonuses")

      if (!response.ok) {
        throw new Error("Failed to fetch bonuses")
      }

      const result = await response.json()

      // Check if the response has the expected structure
      if (result.success && Array.isArray(result.data)) {
        setBonuses(result.data)
      } else {
        console.error("Unexpected bonus data format:", result)
        toast.error("Failed to load bonuses: Unexpected data format")
      }
    } catch (error) {
      console.error("Error fetching bonuses:", error)
      toast.error("Failed to load bonuses")
    } finally {
      setIsBonusesLoading(false)
    }
  }

  const applyTurnoverFilters = () => {
    let filtered = [...accountTurnovers]

    // Filter by username
    if (turnoverSearch.username) {
      filtered = filtered.filter((item) => item.username.toLowerCase().includes(turnoverSearch.username.toLowerCase()))
    }

    // Filter by game
    if (turnoverSearch.game) {
      filtered = filtered.filter((item) => item.game.toLowerCase().includes(turnoverSearch.game.toLowerCase()))
    }

    // Filter by currency
    if (turnoverSearch.currency && turnoverSearch.currency !== "all") {
      filtered = filtered.filter((item) => item.currency === turnoverSearch.currency)
    }

    // Filter by turnover
    if (turnoverSearch.turnover) {
      const turnoverValue = Number.parseFloat(turnoverSearch.turnover)
      if (!isNaN(turnoverValue)) {
        filtered = filtered.filter((item) => item.turnover === turnoverValue)
      }
    }

    setFilteredAccountTurnovers(filtered)
  }

  const applyMatchFilters = () => {
    let filtered = [...matches]

    // Filter by username
    if (matchSearch.username) {
      filtered = filtered.filter((item) => item.username.toLowerCase().includes(matchSearch.username.toLowerCase()))
    }

    // Filter by game
    if (matchSearch.game) {
      filtered = filtered.filter((item) => item.game?.toLowerCase().includes(matchSearch.game.toLowerCase()))
    }

    // Filter by status
    if (matchSearch.status && matchSearch.status !== "all") {
      filtered = filtered.filter((item) => item.status === matchSearch.status)
    }

    // Filter by amount
    if (matchSearch.amount) {
      const amountValue = Number.parseFloat(matchSearch.amount)
      if (!isNaN(amountValue)) {
        filtered = filtered.filter((item) => item.amount === amountValue)
      }
    }

    // Filter by bonus
    if (matchSearch.bonus && matchSearch.bonus !== "all") {
      filtered = filtered.filter((item) => item.bonus_id === matchSearch.bonus)
    }

    setFilteredMatches(filtered)
  }

  const handleTurnoverSearchChange = (field: keyof typeof turnoverSearch, value: string) => {
    // For turnover field, only allow numbers
    if (field === "turnover" && value !== "" && !/^\d*\.?\d*$/.test(value)) {
      return
    }

    setTurnoverSearch((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleMatchSearchChange = (field: keyof typeof matchSearch, value: string) => {
    // For amount field, only allow numbers
    if (field === "amount" && value !== "" && !/^\d*\.?\d*$/.test(value)) {
      return
    }

    setMatchSearch((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const clearTurnoverFilters = () => {
    setTurnoverSearch({
      username: "",
      game: "",
      currency: "",
      turnover: "",
    })
  }

  const clearMatchFilters = () => {
    setMatchSearch({
      username: "",
      game: "",
      status: "",
      amount: "",
      bonus: "",
    })
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
      case "processing":
        return "bg-green-100 text-green-800"
      case "stopped":
      case "failed":
        return "bg-red-100 text-red-800"
      case "completed":
      case "success":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Add these pagination helper functions after the formatCurrency function
  const getPaginatedData = (data: any[], page: number, pageSize: number) => {
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    return data.slice(startIndex, endIndex)
  }

  const getTotalPages = (totalItems: number, pageSize: number) => {
    return Math.ceil(totalItems / pageSize)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("process_details", lang)}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">{t("loading_process_details", lang)}...</span>
          </div>
        ) : process ? (
          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="details">{t("details", lang)}</TabsTrigger>
              <TabsTrigger value="turnover">{t("account_turnover", lang)}</TabsTrigger>
              <TabsTrigger value="matches">{t("matches", lang)}</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Avatar>
                  <AvatarImage src={process.user?.profile_img || undefined} alt={process.user?.name} />
                  <AvatarFallback>{process.user?.name?.substring(0, 2).toUpperCase() || "UN"}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{process.user?.name || t("unknown", lang)}</div>
                  <div className="text-sm text-muted-foreground">{process.user?.email || t("no_email", lang)}</div>
                </div>
                <span
                  className={`ml-auto px-2 py-1 rounded-full ${
                    process.status === ProcessStatus.PROCESSING
                    ? AppColor.INFO
                    : process.status === ProcessStatus.SUCCESS
                      ? AppColor.SUCCESS
                      : process.status === ProcessStatus.FAILED
                        ? AppColor.ERROR
                        : process.status === ProcessStatus.ONBHOLD
                          ? AppColor.PURPLE // Custom color
                          : AppColor.WARNING
                  }`}
                >
                  {process.status}
                </span>
              </div>

              <h2 className="text-xl font-bold">{process.process_name || `${t("process", lang)}-${process.id.substring(0, 8)}`}</h2>

              <p className="font-medium">{t("process_id", lang)}: {process.id}</p>

              {process.from_date && process.to_date && (
                <div className="mt-2">
                  <p className="text-sm font-medium mb-1">{t("date_range", lang)}:</p>
                  <p className="text-sm">{t("from", lang)}: {new Date(process.from_date).toLocaleDateString()}</p>
                  <p className="text-sm">{t("to", lang)}: {new Date(process.to_date).toLocaleDateString()}</p>
                </div>
              )}

              {process.connected_users && process.connected_users.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium mb-1">{t("connected_users", lang)}:</p>
                  <div className="max-h-40 overflow-y-auto border rounded p-2">
                    {process.connected_users.map((user) => (
                      <div key={user.id} className="text-sm py-1 border-b last:border-0">
                        {user.username}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                {t("started", lang)}: {formatDate(process.start_time || process.created_at)}
              </p>

              {process.end_time && (
                <p className="text-sm text-muted-foreground">{t("ended", lang)}: {formatDate(process.end_time)}</p>
              )}

              <p className="text-sm text-muted-foreground">{t("last_updated", lang)}: {formatDate(process.updated_at)}</p>

              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">{t("process_summary", lang)}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-blue-800">{t("total_account_turnover", lang)}</p>
                    <p className="text-xl font-bold">{accountTurnovers.length}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-green-800">{t("total_matches", lang)}</p>
                    <p className="text-xl font-bold">{matches.length}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="turnover">
              {/* Search and Filter Section for Account Turnover */}
              <div className="mb-4 p-4 border rounded-md bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium">{t("search_and_filter", lang)}</h3>
                  <Button variant="ghost" size="sm" onClick={clearTurnoverFilters} className="h-8 text-xs">
                    <X className="h-3 w-3 mr-1" /> {t("clear_filters", lang)}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="turnover-username" className="text-xs">
                      {t("username", lang)}
                    </Label>
                    <Input
                      id="turnover-username"
                      placeholder={t("search_username", lang)}
                      value={turnoverSearch.username}
                      onChange={(e) => handleTurnoverSearchChange("username", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="turnover-game" className="text-xs">
                      {t("game", lang)}
                    </Label>
                    <Input
                      id="turnover-game"
                      placeholder={t("search_game", lang)}
                      value={turnoverSearch.game}
                      onChange={(e) => handleTurnoverSearchChange("game", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="turnover-currency" className="text-xs">
                      {t("currency", lang)}
                    </Label>
                    <Select
                      value={turnoverSearch.currency}
                      onValueChange={(value) => handleTurnoverSearchChange("currency", value)}
                    >
                      <SelectTrigger id="turnover-currency" className="h-8 text-sm">
                        <SelectValue placeholder={t("select_currency", lang)} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("all_currencies", lang)}</SelectItem>
                        {currencies.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="turnover-amount" className="text-xs">
                      {t("turnover", lang)}
                    </Label>
                    <Input
                      id="turnover-amount"
                      placeholder={t("enter_turnover", lang)}
                      value={turnoverSearch.turnover}
                      onChange={(e) => handleTurnoverSearchChange("turnover", e.target.value)}
                      className="h-8 text-sm"
                      type="text"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-muted-foreground">
                  {t("showing", lang)} {filteredAccountTurnovers.length > 0 ? (turnoverPage - 1) * turnoverPageSize + 1 : 0} {t("to", lang)}{" "}
                  {Math.min(turnoverPage * turnoverPageSize, filteredAccountTurnovers.length)} {t("of", lang)}{" "}
                  {filteredAccountTurnovers.length} {t("entries", lang)}
                </div>
                <Select
                  value={turnoverPageSize.toString()}
                  onValueChange={(val) => {
                    setTurnoverPageSize(Number(val))
                    setTurnoverPage(1)
                  }}
                >
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue placeholder={t("rows_per_page", lang)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 {t("rows", lang)}</SelectItem>
                    <SelectItem value="50">50 {t("rows", lang)}</SelectItem>
                    <SelectItem value="100">100 {t("rows", lang)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("username", lang)}</TableHead>
                        <TableHead>{t("game", lang)}</TableHead>
                        <TableHead>{t("currency", lang)}</TableHead>
                        <TableHead>{t("turnover", lang)}</TableHead>
                        <TableHead>{t("created_at", lang)}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccountTurnovers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            {accountTurnovers.length === 0
                              ? t("no_account_turnover_data", lang)
                              : t("no_results_match_criteria", lang)}
                          </TableCell>
                        </TableRow>
                      ) : (
                        getPaginatedData(filteredAccountTurnovers, turnoverPage, turnoverPageSize).map((turnover) => (
                          <TableRow key={turnover.id}>
                            <TableCell className="font-medium">{turnover.username}</TableCell>
                            <TableCell>{turnover.game}</TableCell>
                            <TableCell>{turnover.currency}</TableCell>
                            <TableCell>{turnover.turnover.toLocaleString()}</TableCell>
                            <TableCell>{formatDate(turnover.createdAt)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {filteredAccountTurnovers.length > turnoverPageSize && (
                <div className="flex items-center justify-center space-x-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setTurnoverPage(1)} disabled={turnoverPage === 1}>
                    {t("first", lang)}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTurnoverPage((prev) => Math.max(prev - 1, 1))}
                    disabled={turnoverPage === 1}
                  >
                    {t("previous", lang)}
                  </Button>
                  <span className="text-sm">
                    {t("page", lang)} {turnoverPage} {t("of", lang)} {getTotalPages(filteredAccountTurnovers.length, turnoverPageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTurnoverPage((prev) =>
                        Math.min(prev + 1, getTotalPages(filteredAccountTurnovers.length, turnoverPageSize)),
                      )
                    }
                    disabled={turnoverPage === getTotalPages(filteredAccountTurnovers.length, turnoverPageSize)}
                  >
                    {t("next", lang)}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTurnoverPage(getTotalPages(filteredAccountTurnovers.length, turnoverPageSize))}
                    disabled={turnoverPage === getTotalPages(filteredAccountTurnovers.length, turnoverPageSize)}
                  >
                    {t("last", lang)}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="matches">
              {/* Search and Filter Section for Matches */}
              <div className="mb-4 p-4 border rounded-md bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium">{t("search_and_filter", lang)}</h3>
                  <Button variant="ghost" size="sm" onClick={clearMatchFilters} className="h-8 text-xs">
                    <X className="h-3 w-3 mr-1" /> {t("clear_filters", lang)}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <Label htmlFor="match-username" className="text-xs">
                      {t("username", lang)}
                    </Label>
                    <Input
                      id="match-username"
                      placeholder={t("search_username", lang)}
                      value={matchSearch.username}
                      onChange={(e) => handleMatchSearchChange("username", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="match-game" className="text-xs">
                      {t("game", lang)}
                    </Label>
                    <Input
                      id="match-game"
                      placeholder={t("search_game", lang)}
                      value={matchSearch.game}
                      onChange={(e) => handleMatchSearchChange("game", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="match-status" className="text-xs">
                      {t("status", lang)}
                    </Label>
                    <Select
                      value={matchSearch.status}
                      onValueChange={(value) => handleMatchSearchChange("status", value)}
                    >
                      <SelectTrigger id="match-status" className="h-8 text-sm">
                        <SelectValue placeholder={t("select_status", lang)} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("all_statuses", lang)}</SelectItem>
                        {matchStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="match-amount" className="text-xs">
                      {t("amount", lang)}
                    </Label>
                    <Input
                      id="match-amount"
                      placeholder={t("enter_amount", lang)}
                      value={matchSearch.amount}
                      onChange={(e) => handleMatchSearchChange("amount", e.target.value)}
                      className="h-8 text-sm"
                      type="text"
                    />
                  </div>
                  <div>
                    <Label htmlFor="match-bonus" className="text-xs">
                      {t("bonus", lang)}
                    </Label>
                    <Select
                      value={matchSearch.bonus}
                      onValueChange={(value) => handleMatchSearchChange("bonus", value)}
                    >
                      <SelectTrigger id="match-bonus" className="h-8 text-sm">
                        <SelectValue placeholder={t("select_bonus", lang)} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("all_bonuses", lang)}</SelectItem>
                        {isBonusesLoading ? (
                          <SelectItem value="loading" disabled>
                            {t("loading_bonuses", lang)}...
                          </SelectItem>
                        ) : bonuses.length > 0 ? (
                          bonuses.map((bonus) => (
                            <SelectItem key={bonus.id} value={bonus.id}>
                              {bonus.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            {t("no_bonuses_available", lang)}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-muted-foreground">
                  {t("showing", lang)} {filteredMatches.length > 0 ? (matchesPage - 1) * matchesPageSize + 1 : 0} {t("to", lang)}{" "}
                  {Math.min(matchesPage * matchesPageSize, filteredMatches.length)} {t("of", lang)} {filteredMatches.length} {t("entries", lang)}
                </div>
                <Select
                  value={matchesPageSize.toString()}
                  onValueChange={(val) => {
                    setMatchesPageSize(Number(val))
                    setMatchesPage(1)
                  }}
                >
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue placeholder={t("rows_per_page", lang)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 {t("rows", lang)}</SelectItem>
                    <SelectItem value="50">50 {t("rows", lang)}</SelectItem>
                    <SelectItem value="100">100 {t("rows", lang)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("username", lang)}</TableHead>
                        <TableHead>{t("game", lang)}</TableHead>
                        <TableHead>{t("status", lang)}</TableHead>
                        <TableHead>{t("amount", lang)}</TableHead>
                        <TableHead>{t("bonus", lang)}</TableHead>
                        <TableHead>{t("created_at", lang)}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMatches.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            {matches.length === 0 ? t("no_matches_data", lang) : t("no_results_match_criteria", lang)}
                          </TableCell>
                        </TableRow>
                      ) : (
                        getPaginatedData(filteredMatches, matchesPage, matchesPageSize).map((match) => (
                          <TableRow key={match.id}>
                            <TableCell className="font-medium">{match.username}</TableCell>
                            <TableCell>{match.game || t("not_available", lang)}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(match.status)}`}>
                                {match.status}
                              </span>
                            </TableCell>
                            <TableCell>{formatCurrency(match.amount, match.currency)}</TableCell>
                            <TableCell>
                              {match.bonus_name ? (
                                <div>
                                  <span className="font-medium">{match.bonus_name}</span>
                                  {match.bonus_value && (
                                    <span className="text-xs text-muted-foreground ml-1">({match.bonus_value}%)</span>
                                  )}
                                </div>
                              ) : (
                                t("not_available", lang)
                              )}
                            </TableCell>
                            <TableCell>{formatDate(match.created_at)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {filteredMatches.length > matchesPageSize && (
                <div className="flex items-center justify-center space-x-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setMatchesPage(1)} disabled={matchesPage === 1}>
                    {t("first", lang)}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMatchesPage((prev) => Math.max(prev - 1, 1))}
                    disabled={matchesPage === 1}
                  >
                    {t("previous", lang)}
                  </Button>
                  <span className="text-sm">
                    {t("page", lang)} {matchesPage} {t("of", lang)} {getTotalPages(filteredMatches.length, matchesPageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setMatchesPage((prev) =>
                        Math.min(prev + 1, getTotalPages(filteredMatches.length, matchesPageSize)),
                      )
                    }
                    disabled={matchesPage === getTotalPages(filteredMatches.length, matchesPageSize)}
                  >
                    {t("next", lang)}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMatchesPage(getTotalPages(filteredMatches.length, matchesPageSize))}
                    disabled={matchesPage === getTotalPages(filteredMatches.length, matchesPageSize)}
                  >
                    {t("last", lang)}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="py-4 text-center text-muted-foreground">{t("no_process_details", lang)}</div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("close", lang)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
