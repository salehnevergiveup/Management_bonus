"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/dialog";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { TransferAccountTypes } from "@constants/enums";

interface TransferAccount {
  id: string;
  username: string;
}
interface Player {
  id: string;
  account_username: string;
  transfer_account_id: string;
  created_at: string;
  updated_at: string;
  transferAccount: TransferAccount;
}

export default function PlayerManagementPage() {
  const { auth, isLoading } = useUser();
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [transferAccounts, setTransferAccounts] = useState<TransferAccount[]>([]);
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

  // Filter and paginate players on the client side
  const filteredPlayers = useMemo(() => {
    if (!searchTerm) return allPlayers;
    
    return allPlayers.filter(player => 
      player.account_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.transferAccount?.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allPlayers, searchTerm]);

  // Calculate pagination
  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPlayers.slice(startIndex, startIndex + pageSize);
  }, [filteredPlayers, currentPage, pageSize]);

  const totalPages = useMemo(() => 
    Math.max(1, Math.ceil(filteredPlayers.length / pageSize)), 
    [filteredPlayers, pageSize]
  );

  const fetchPlayers = async () => {
    if (auth) {
      if (!auth.canAccess("players")) {
        router.push("/dashboard");
        return;
      }
    }
    try {
      // Fetch all players at once
      const response = await fetch(`/api/players?all=true`);

      if (!response.ok) {
        throw new Error("Failed to fetch players");
      }

      const data = await response.json();
      setAllPlayers(data.data);
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
      const transferAccounts = data.data.filter((account: any) => account.type  != TransferAccountTypes.MAIN_ACCOUNT ) 
      setTransferAccounts(transferAccounts);
    } catch (error) {
      console.error("Error fetching transfer accounts:", error);
      toast.error("Failed to fetch transfer accounts");
    }
  };

  useEffect(() => {
    if (!isLoading && auth) {
      fetchPlayers();
      fetchTransferAccounts();
    }
  }, [isLoading, auth, router]);

  // Reset to first page when search term or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

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
      console.error("Error creating players:", error);
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
      console.error("Error updating players:", error);
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
      console.error("Error deleting players:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete player");
    } finally {
      setDeleteDialogOpen(false);
      setPlayerToDelete(null);
    }
  };

  const handleCreate = () => {
    if (!auth?.can("players:create")) {
      return;
    }
    
    setFormUsername("");
    setFormTransferAccountId("");
    setFormErrors({});
    setCreateDialogOpen(true);
  };

  const handleEdit = (player: Player) => {
    if (!auth?.can("players:edit")) {
      return;
    }
    
    setSelectedPlayer(player);
    setFormUsername(player.account_username);
    setFormTransferAccountId(player.transfer_account_id);
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleDelete = (player: Player) => {
    if (!auth?.can("players:delete")) {
      return;
    }
    
    setPlayerToDelete(player);
    setDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  // Calculate pagination display values
  const startItem = filteredPlayers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredPlayers.length);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: "Player Management" }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Player Management</CardTitle>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            {auth?.can("players:create") && (
              <Button 
                onClick={handleCreate} 
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Player
              </Button>
            )}
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => {
                setPageSize(Number(val));
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  {(auth?.can("players:edit") || auth?.can("players:delete")) && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Loading players...
                    </TableCell>
                  </TableRow>
                ) : paginatedPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No players found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPlayers.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">{player.account_username}</TableCell>
                      <TableCell>{player.transferAccount?.username || 'Unknown'}</TableCell>
                      <TableCell>{formatDate(player.created_at)}</TableCell>
                      <TableCell>{formatDate(player.updated_at)}</TableCell>
                      {(auth?.can("players:edit") || auth?.can("players:delete")) && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {auth?.can("players:edit") && (
                                <DropdownMenuItem onClick={() => handleEdit(player)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              
                              {auth?.can("players:delete") && (
                                <DropdownMenuItem onClick={() => handleDelete(player)}>
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredPlayers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{startItem}</span> to{" "}
                <span className="font-medium">{endItem}</span>{" "}
                of <span className="font-medium">{filteredPlayers.length}</span> players
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
                    First
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(currentPage - 1)} 
                    disabled={isLoading || !hasPreviousPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    Previous
                  </Button>
                  <span className="px-2 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(currentPage + 1)} 
                    disabled={isLoading || !hasNextPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    Next
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(totalPages)} 
                    disabled={isLoading || !hasNextPage}
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
                      {account.username} 
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
                      {account.username}
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