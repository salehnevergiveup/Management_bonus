"use client";

import { useState, useEffect } from "react";
import { Edit, Trash, MoreHorizontal, Plus, Search } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/usercontext";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/dialog";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

interface TransferAccount {
  id: string;
  account_username: string;
}

interface Player {
  id: string;
  account_username: string;
  transfer_account_id: string;
  created_at: string;
  updated_at: string;
  transfer_account: TransferAccount;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ApiResponse {
  data: Player[];
  success: boolean;
  pagination: PaginationData;
  message: string;
}

export default function PlayerManagementPage() {
  const { auth, isLoading } = useUser();
  const [players, setPlayers] = useState<Player[]>([]);
  const [transferAccounts, setTransferAccounts] = useState<TransferAccount[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const router = useRouter();

  // Form state for create/edit
  const [formUsername, setFormUsername] = useState("");
  const [formTransferAccountId, setFormTransferAccountId] = useState("");
  const [formErrors, setFormErrors] = useState<{ username?: string; transferAccountId?: string }>({});

  const fetchPlayers = async () => {
    if (auth) {
      if (!auth.canAccess("players")) {
        router.push("/dashboard");
        return;
      }
    }
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append("page", currentPage.toString());
      queryParams.append("limit", pageSize.toString());

      if (searchTerm) {
        queryParams.append("search", searchTerm);
      }

      const response = await fetch(`/api/players?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch players");
      }

      const data: ApiResponse = await response.json();
      setPlayers(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching players:", error);
      toast.error("Failed to fetch players");
    }
  };

  const fetchTransferAccounts = async () => {
    try {
      const response = await fetch(`/api/transfer-accounts?all=true`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch transfer accounts");
      }

      const data = await response.json();
      setTransferAccounts(data.data);
    } catch (error) {
      console.error("Error fetching transfer accounts:", error);
      toast.error("Failed to fetch transfer accounts");
    }
  };

  useEffect(() => {
    fetchPlayers();
    fetchTransferAccounts();
  }, [isLoading, auth, router, currentPage, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== "") {
        fetchPlayers();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const validateForm = () => {
    const errors: { username?: string; transferAccountId?: string } = {};
    
    if (!formUsername || formUsername.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }
    
    if (!formTransferAccountId) {
      errors.transferAccountId = "Transfer account is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createPlayer = async () => {
    if (!validateForm()) return;
    
    try {
      const response = await fetch("/api/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_username: formUsername,
          transfer_account_id: formTransferAccountId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create player");
      }

      const result = await response.json();
      toast.success("Player created successfully");
      setFormUsername("");
      setFormTransferAccountId("");
      setCreateDialogOpen(false);
      fetchPlayers();
    } catch (error) {
      console.error("Error creating player:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create player");
    }
  };

  const updatePlayer = async () => {
    if (!selectedPlayer || !validateForm()) return;

    try {
      const response = await fetch(`/api/players/${selectedPlayer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_username: formUsername,
          transfer_account_id: formTransferAccountId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update player");
      }

      const result = await response.json();
      toast.success("Player updated successfully");
      setFormUsername("");
      setFormTransferAccountId("");
      setEditDialogOpen(false);
      fetchPlayers();
    } catch (error) {
      console.error("Error updating player:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update player");
    }
  };

  const deletePlayer = async () => {
    if (!playerToDelete) return;

    try {
      const response = await fetch(`/api/players/${playerToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete player");
      }

      toast.success("Player deleted successfully");
      fetchPlayers();
    } catch (error) {
      console.error("Error deleting player:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete player");
    } finally {
      setDeleteDialogOpen(false);
      setPlayerToDelete(null);
    }
  };

  const handleCreate = () => {
    setFormUsername("");
    setFormTransferAccountId("");
    setFormErrors({});
    setCreateDialogOpen(true);
  };

  const handleEdit = (player: Player) => {
    setSelectedPlayer(player);
    setFormUsername(player.account_username);
    setFormTransferAccountId(player.transfer_account_id);
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: "Player Management" }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Player Management</CardTitle>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <Button onClick={handleCreate} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Create Player
            </Button>
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Rows per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 rows</SelectItem>
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="20">20 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
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
                placeholder="Search players..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value === "") {
                    setCurrentPage(1);
                    fetchPlayers();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setCurrentPage(1);
                    fetchPlayers();
                  }
                }}
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Transfer Account</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Loading players...
                    </TableCell>
                  </TableRow>
                ) : players.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No players found
                    </TableCell>
                  </TableRow>
                ) : (
                  players.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">{player.account_username}</TableCell>
                      <TableCell>{player.transfer_account?.account_username || 'Unknown'}</TableCell>
                      <TableCell>{formatDate(player.created_at)}</TableCell>
                      <TableCell>{formatDate(player.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(player)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setPlayerToDelete(player);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
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

          {pagination && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{" "}
                of <span className="font-medium">{pagination.total}</span> players
              </div>
              
              {pagination.totalPages > 1 && (
                <div className="flex items-center space-x-2 w-full sm:w-auto justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(1)} 
                    disabled={isLoading || !pagination.hasPreviousPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    First
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(currentPage - 1)} 
                    disabled={isLoading || !pagination.hasPreviousPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    Previous
                  </Button>
                  <span className="px-2 text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(currentPage + 1)} 
                    disabled={isLoading || !pagination.hasNextPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    Next
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(pagination.totalPages)} 
                    disabled={isLoading || !pagination.hasNextPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    Last
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Player Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="account_username">Username</Label>
              <Input 
                id="account_username" 
                placeholder="Enter username" 
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
              />
              {formErrors.username && (
                <p className="text-sm text-red-500">{formErrors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer_account_id">Transfer Account</Label>
              <Select 
                value={formTransferAccountId} 
                onValueChange={setFormTransferAccountId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a transfer account" />
                </SelectTrigger>
                <SelectContent>
                  {transferAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.transferAccountId && (
                <p className="text-sm text-red-500">{formErrors.transferAccountId}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createPlayer}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit_account_username">Username</Label>
              <Input 
                id="edit_account_username" 
                placeholder="Enter username" 
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
              />
              {formErrors.username && (
                <p className="text-sm text-red-500">{formErrors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_transfer_account_id">Transfer Account</Label>
              <Select 
                value={formTransferAccountId} 
                onValueChange={setFormTransferAccountId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a transfer account" />
                </SelectTrigger>
                <SelectContent>
                  {transferAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.transferAccountId && (
                <p className="text-sm text-red-500">{formErrors.transferAccountId}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updatePlayer}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={deletePlayer}
        title="Confirm Delete"
        children={
          <>
            <p>Are you sure you want to delete this player?</p>
            <p className="mt-2">This action cannot be undone.</p>
          </>
        }
        confirmText="Delete"
      />
    </div>
  );
}