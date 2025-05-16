"use client"

import toast from "react-hot-toast"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Trash2, Plus } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

interface Match {
  username: string
  transfer_account_id: string | null
  process_id?: string
  amount: number
  currency: string
  transferAccountUsername?: string
  searchQuery?: string
}

interface Player {
  id: string
  account_username: string
  transfer_account_id: string
  created_at: string
  updated_at: string
  transferAccount: {
    id: string
    username: string
    password: string
    pin_code: string
    type: string
    parent_id: string | null
    created_at: string
    updated_at: string
  }
}

interface CreateMatchDialogProps {
  isOpen: boolean
  onClose: () => void
  isRequest?: boolean
  processId: string
  onSuccess?: () => void // Add callback for successful submission
}

export default function CreateMatchDialog({
  isOpen,
  onClose,
  isRequest = false,
  processId,
  onSuccess,
}: CreateMatchDialogProps) {
  const { lang } = useLanguage()
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([
    {
      username: "",
      amount: 0,
      currency: "USD",
      transfer_account_id: null,
      transferAccountUsername: "",
      searchQuery: "",
    },
  ])
  const [requestMessage, setRequestMessage] = useState("")
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null)

  const fetchPlayers = async () => {
    try {
      const response = await fetch("/api/players")
      if (!response.ok) {
        throw new Error(t("failed_fetch_players", lang))
      }
      const data = await response.json()
      setPlayers(data.data)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchPlayers()
    }
  }, [isOpen])

  const addMatch = () => {
    setMatches([
      ...matches,
      {
        username: "",
        amount: 0,
        currency: "USD",
        transfer_account_id: null,
        transferAccountUsername: "",
        searchQuery: "",
      },
    ])
  }

  const removeMatch = (index: number) => {
    if (matches.length > 1) {
      const newMatches = [...matches]
      newMatches.splice(index, 1)
      setMatches(newMatches)
    }
  }

  const updateMatch = (index: number, field: keyof Match, value: string | number | null) => {
    const newMatches = [...matches]
    newMatches[index] = { ...newMatches[index], [field]: value }

    if (field === "username" && typeof value === "string") {
      newMatches[index].searchQuery = value

      const matchingPlayer = players.find((p) => p.account_username === value)
      if (matchingPlayer) {
        newMatches[index].transfer_account_id = matchingPlayer.transfer_account_id
        newMatches[index].transferAccountUsername = matchingPlayer.transferAccount.username
      } else {
        newMatches[index].transfer_account_id = null
        newMatches[index].transferAccountUsername = ""
      }
    }

    setMatches(newMatches)
  }

  const validateMatches = () => {
    return matches.every((match) => match.username && match.transfer_account_id && match.amount > 0 && match.currency)
  }

  const handleCreateMatch = () => {
    return matches.map((match) => ({
      username: match.username,
      amount: match.amount,
      currency: match.currency,
      transfer_account_id: match.transfer_account_id,
      process_id: processId,
    }))
  }

  const handleCreateMatchRequest = () => {
    return {
      model_name: "Match",
      model_id: "batch-create",
      action: "create",
      message: JSON.stringify({
        matches: matches.map((match) => ({
          username: match.username,
          amount: match.amount,
          currency: match.currency,
          transfer_account_id: match.transfer_account_id,
          process_id: processId,
        })),
        reason: requestMessage,
      }),
    }
  }

  const handleSubmit = async () => {
    if (!validateMatches()) {
      toast.error(t("fill_required_fields", lang))
      return
    }

    if (isRequest && !requestMessage.trim()) {
      toast.error(t("provide_reason", lang))
      return
    }

    let endpoint = ""
    let payload: any = null
    let method = ""

    if (isRequest) {
      endpoint = "/api/requests"
      payload = handleCreateMatchRequest()
      method = "POST"
    } else {
      endpoint = "/api/matches/create-matches"
      payload = { matches: handleCreateMatch() }
      method = "POST"
    }

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw Error(t("unable_create_matches", lang))
      }
      toast.success(isRequest ? t("request_submitted_successfully", lang) : t("matches_created_successfully", lang))

      // Call the onSuccess callback to refresh the parent component
      if (onSuccess) {
        onSuccess()
      }

      onClose()
      setMatches([
        {
          username: "",
          amount: 0,
          currency: "USD",
          transfer_account_id: null,
          transferAccountUsername: "",
          searchQuery: "",
        },
      ])
      setRequestMessage("")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleFocus = (index: number) => {
    setActiveSearchIndex(index)
  }

  const handleBlur = () => {
    setTimeout(() => {
      setActiveSearchIndex(null)
    }, 200)
  }

  const selectPlayer = (index: number, player: Player) => {
    const newMatches = [...matches]
    newMatches[index] = {
      ...newMatches[index],
      username: player.account_username,
      transfer_account_id: player.transfer_account_id,
      transferAccountUsername: player.transferAccount.username,
      searchQuery: player.account_username,
    }
    setMatches(newMatches)
    setActiveSearchIndex(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isRequest ? t("request_to_create_matches", lang) : t("create_multiple_matches", lang)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {matches.map((match, index) => (
            <Card key={index} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("username", lang)}</Label>
                  <div className="relative">
                    <Input
                      value={match.username}
                      onChange={(e) => {
                        updateMatch(index, "username", e.target.value)
                      }}
                      onFocus={() => handleFocus(index)}
                      onBlur={handleBlur}
                      placeholder={t("enter_username", lang)}
                      className={!match.transfer_account_id && match.username ? "border-red-500" : ""}
                    />
                    {!match.transfer_account_id && match.username && (
                      <p className="text-xs text-red-500 mt-1">{t("no_player_found", lang)}</p>
                    )}

                    {activeSearchIndex === index && match.searchQuery && (
                      <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {players
                          .filter((player) =>
                            player.account_username.toLowerCase().includes(match.searchQuery?.toLowerCase() || ""),
                          )
                          .map((player) => (
                            <div
                              key={player.id}
                              className="p-2 hover:bg-gray-100 cursor-pointer"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                selectPlayer(index, player)
                              }}
                            >
                              {player.account_username}
                            </div>
                          ))}
                        {players.filter((player) =>
                          player.account_username.toLowerCase().includes(match.searchQuery?.toLowerCase() || ""),
                        ).length === 0 && <div className="p-2 text-gray-500">{t("no_players_found", lang)}</div>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("amount", lang)}</Label>
                  <Input
                    type="number"
                    value={match.amount || ""}
                    onChange={(e) => updateMatch(index, "amount", Number.parseFloat(e.target.value) || 0)}
                    placeholder={t("enter_amount", lang)}
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("currency", lang)}</Label>
                  <Select value={match.currency} onValueChange={(value) => updateMatch(index, "currency", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="MYR">MYR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("transfer_account", lang)}</Label>
                  <Input
                    value={match.transferAccountUsername || ""}
                    disabled
                    placeholder={t("auto_selected", lang)}
                    className="bg-gray-100"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeMatch(index)}
                    disabled={matches.length === 1}
                    className="mb-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          <Button variant="outline" onClick={addMatch} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {t("add_another_match", lang)}
          </Button>

          {isRequest && (
            <div className="space-y-2">
              <Label>{t("reason_for_request", lang)}</Label>
              <Textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder={t("explain_why_create_matches", lang)}
                rows={4}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("cancel", lang)}
          </Button>
          <Button onClick={handleSubmit} disabled={!validateMatches() || (isRequest && !requestMessage.trim())}>
            {isRequest ? t("submit_request", lang) : t("create_matches", lang)} ({matches.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
