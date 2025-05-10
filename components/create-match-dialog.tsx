"use client";

import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Match {
  username: string;
  currency: string;
  transferAccountId: string;
  transferAccountUsername?: string;
  amount: number;
  status: string;
}

interface Player {
  id: string;
  account_username: string;
  transfer_account_id: string;
  created_at: string;
  updated_at: string;
  transferAccount: {
    id: string;
    username: string;
    password: string;
    pin_code: string;
    type: string;
    parent_id: string | null;
    created_at: string;
    updated_at: string;
  };
}

interface CreateMatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isRequest?: boolean;
}

export default function CreateMatchDialog({ isOpen, onClose, isRequest = false }: CreateMatchDialogProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([{
    username: "",
    currency: "USD",
    transferAccountId: "",
    transferAccountUsername: "",
    amount: 0,
    status: "pending"
  }]);
  const [requestMessage, setRequestMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPlayers = async () => {
    try {
      const response = await fetch("/api/players");
      if (!response.ok) {
        throw new Error("Failed to fetch players");
      }
      const data = await response.json();
      setPlayers(data.data);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
    }
  }, [isOpen]);

  const addMatch = () => {
    setMatches([...matches, {
      username: "",
      currency: "USD",
      transferAccountId: "",
      transferAccountUsername: "",
      amount: 0,
      status: "pending"
    }]);
  };

  const removeMatch = (index: number) => {
    if (matches.length > 1) {
      const newMatches = [...matches];
      newMatches.splice(index, 1);
      setMatches(newMatches);
    }
  };

  const updateMatch = (index: number, field: keyof Match, value: string | number) => {
    const newMatches = [...matches];
    newMatches[index] = { ...newMatches[index], [field]: value };

    // If username changes, check for matching player
    if (field === "username" && typeof value === "string") {
      const matchingPlayer = players.find(p => p.account_username === value);
      if (matchingPlayer) {
        newMatches[index].transferAccountId = matchingPlayer.transfer_account_id;
        newMatches[index].transferAccountUsername = matchingPlayer.transferAccount.username;
      } else {
        newMatches[index].transferAccountId = "";
        newMatches[index].transferAccountUsername = "";
      }
    }

    setMatches(newMatches);
  };

  const validateMatches = () => {
    return matches.every(match => 
      match.username && 
      match.transferAccountId && 
      match.amount > 0 && 
      match.currency
    );
  };

  const handleCreateMatch = () => {
    return matches.map(match => ({
      username: match.username,
      amount: match.amount,
      currency: match.currency,
      transfer_account_id: match.transferAccountId,
      status: "pending",
      process_id: "default-process-id",
      game: "default-game" 
    }));
  };

  const handleCreateMatchRequest = () => {
    return {
      model_name: "Match",
      model_id: "batch-create",
      action: "create",
      message: JSON.stringify({
        matches: matches.map(match => ({
          username: match.username,
          amount: match.amount,
          currency: match.currency,
          transfer_account_id: match.transferAccountId
        })),
        reason: requestMessage
      })
    };
  };

  const handleSubmit = async () => {
    if (!validateMatches()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    if (isRequest && !requestMessage.trim()) {
      toast.error("Please provide a reason for the request");
      return;
    }

    let endpoint = "";
    let payload: any = null;
    let method = "";

    if (isRequest) {
      endpoint = "/api/requests";
      payload = handleCreateMatchRequest();
      method = "POST";
    } else {
      endpoint = "/api/matches";
      payload = { matches: handleCreateMatch() };
      method = "POST";
    }

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw Error("Unable to create matches");
      }
      toast.success(isRequest ? "Match creation request submitted successfully" : "Matches created successfully");
      onClose();
      setMatches([{
        username: "",
        currency: "USD",
        transferAccountId: "",
        transferAccountUsername: "",
        amount: 0,
        status: "pending"
      }]);
      setRequestMessage("");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Filter players based on search query
  const filteredPlayers = players.filter(player => 
    player.account_username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isRequest ? "Request to Create Matches" : "Create Multiple Matches"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {matches.map((match, index) => (
            <Card key={index} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <div className="relative">
                    <Input
                      value={match.username}
                      onChange={(e) => {
                        updateMatch(index, "username", e.target.value);
                        setSearchQuery(e.target.value);
                      }}
                      placeholder="Enter username"
                      className={!match.transferAccountId && match.username ? "border-red-500" : ""}
                    />
                    {!match.transferAccountId && match.username && (
                      <p className="text-xs text-red-500 mt-1">No player found</p>
                    )}
                  </div>
                  
                  {/* Dropdown suggestions for players */}
                  {searchQuery && index === matches.length - 1 && (
                    <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {filteredPlayers.map(player => (
                        <div
                          key={player.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            updateMatch(index, "username", player.account_username);
                            setSearchQuery("");
                          }}
                        >
                          {player.account_username}
                        </div>
                      ))}
                      {filteredPlayers.length === 0 && (
                        <div className="p-2 text-gray-500">No players found</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={match.amount || ""}
                    onChange={(e) => updateMatch(index, "amount", parseFloat(e.target.value) || 0)}
                    placeholder="Enter amount"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={match.currency}
                    onValueChange={(value) => updateMatch(index, "currency", value)}
                  >
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
                  <Label>Transfer Account</Label>
                  <Input
                    value={match.transferAccountUsername || ""}
                    disabled
                    placeholder="Auto-selected"
                    className="bg-gray-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Input
                    value={match.status}
                    disabled
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

          <Button
            variant="outline"
            onClick={addMatch}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Match
          </Button>

          {isRequest && (
            <div className="space-y-2">
              <Label>Reason for Request</Label>
              <Textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Explain why you need to create these matches..."
                rows={4}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!validateMatches() || (isRequest && !requestMessage.trim())}
          >
            {isRequest ? "Submit Request" : "Create Matches"} ({matches.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}