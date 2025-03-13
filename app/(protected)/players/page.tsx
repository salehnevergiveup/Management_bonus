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
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/dialog";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { fetchRequests, hasPermission, createRequest } from "@/lib/requstHandling";
import {PaginationData} from  "@/types/pagination-data.type"
import {GetResponse} from "@/types/get-response.type" 
import {RequestData} from "@/types/request-data.type" 

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

  // Permission request states
  const [permissionsMap, setPermissionsMap] = useState<Map<string, RequestData>>(new Map());
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestAction, setRequestAction] = useState<string>("");
  const [requestMessage, setRequestMessage] = useState("");
  const [completePermission, setCompletePermission] = useState<{modelId: string, action: string} | null>(null);

  // Form state for create/edit
  const [formUsername, setFormUsername] = useState("");
  const [formTransferAccountId, setFormTransferAccountId] = useState("");
  const [formErrors, setFormErrors] = useState<{ username?: string; transferAccountId?: string }>({});

  // Load accepted permission requests
  const loadPermissions = async () => {
    if (!auth) return;
    
    try {
      const map = await fetchRequests('Player', 'accepted');
      setPermissionsMap(map);
    } catch (error) {
      console.error("Error loading permissions:", error);
    }
  };

  const markPermissionComplete = async (modelId: string, action: string) => {
    try {
      let key ="";  
      if(action == "create") {  
        key = `new:${action}`;

      }else {  
        key = `${modelId}:${action}`;

      }
      const permission = permissionsMap.get(key);
      
      if (permission) {
        const response = await fetch(`/api/requests/${permission.id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          const newMap = new Map(permissionsMap);
          newMap.delete(key);
          setPermissionsMap(newMap);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error("Error completing permission:", error);
      return false;
    }
  };

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

      const data: GetResponse = await response.json();
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
    if (!isLoading && auth) {
      fetchPlayers();
      fetchTransferAccounts();
      loadPermissions();
    }
  }, [isLoading, auth, router, currentPage, pageSize]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== "") {
        fetchPlayers();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle permission completion
  useEffect(() => {
    if (completePermission) {
      markPermissionComplete(completePermission.modelId, completePermission.action)
        .then(success => {
          if (success) {
            toast.success("Permission used successfully");
          }
          setCompletePermission(null);
        });
    }
  }, [completePermission]);

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

      if (!auth?.can("players:create") && hasPermission(permissionsMap, "new", "create")) {
        setCompletePermission({
          modelId: "new",
          action: "create"
        });
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
      
      // If this was a permission-based edit, mark it as complete
      if (!auth?.can("players:edit") && hasPermission(permissionsMap, selectedPlayer.id, "edit")) {
        setCompletePermission({
          modelId: selectedPlayer.id,
          action: "edit"
        });
      }
      
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
      
      // If this was a permission-based delete, mark it as complete
      if (!auth?.can("players:delete") && hasPermission(permissionsMap, playerToDelete.id, "delete")) {
        setCompletePermission({
          modelId: playerToDelete.id,
          action: "delete"
        });
      }
      
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
    if (!auth?.can("players:create") && !hasPermission(permissionsMap, "new", "create")) {
      openRequestDialog("create");
      return;
    }
    
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

  const handleDelete = (player: Player) => {
    setPlayerToDelete(player);
    setDeleteDialogOpen(true);
  };
  
  // Open permission request dialog
  const openRequestDialog = (action: string, player?: Player) => {
    setRequestAction(action);
    setSelectedPlayer(player || null);
    setRequestMessage("");
    setRequestDialogOpen(true);
  };
  
  // Submit permission request
  const submitPermissionRequest = async () => {
    if (!auth || requestMessage.length < 10) return;
    
    try {
      const modelId = selectedPlayer?.id || "new"; // Use "new" for create actions
      const result = await createRequest(
        "Player",
        modelId,
        requestAction,
        requestMessage,
        auth.id
      );
      
      if (result.success) {
        toast.success("Permission request submitted successfully");
        setRequestDialogOpen(false);
      } else {
        toast.error(result.error || "Failed to submit request");
      }
    } catch (error) {
      console.error("Error submitting permission request:", error);
      toast.error("Failed to submit permission request");
    }
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
            <Button 
              onClick={handleCreate} 
              className="w-full sm:w-auto"
              variant={auth?.can("players:create") || hasPermission(permissionsMap, "new", "create") ? "default" : "outline"}
            >
              <Plus className="mr-2 h-4 w-4" />
              {auth?.can("players:create") || hasPermission(permissionsMap, "new", "create") ? "Create Player" : "Request to Create Player"}
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
                            {/* Edit option - show if user has permission or has accepted request */}
                            {(auth?.can("players:edit") || hasPermission(permissionsMap, player.id, "edit")) ? (
                              <DropdownMenuItem onClick={() => handleEdit(player)}>
                                <Edit className="mr-2 h-4 w-4" />
                                {hasPermission(permissionsMap, player.id, "edit") && !auth?.can("players:edit") 
                                  ? "Execute Edit Permission" 
                                  : "Edit"}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => openRequestDialog("edit", player)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Request to Edit
                              </DropdownMenuItem>
                            )}
                            
                            {/* Delete option - show if user has permission or has accepted request */}
                            {(auth?.can("players:delete") || hasPermission(permissionsMap, player.id, "delete")) ? (
                              <DropdownMenuItem onClick={() => handleDelete(player)}>
                                <Trash className="mr-2 h-4 w-4" />
                                {hasPermission(permissionsMap, player.id, "delete") && !auth?.can("players:delete") 
                                  ? "Execute Delete Permission" 
                                  : "Delete"}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => openRequestDialog("delete", player)}>
                                <Trash className="mr-2 h-4 w-4" />
                                Request to Delete
                              </DropdownMenuItem>
                            )}
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

      {/* Permission Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Request Permission to {requestAction.charAt(0).toUpperCase() + requestAction.slice(1)} Player
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedPlayer && (
              <div className="space-y-2">
                <Label>Player</Label>
                <p className="font-medium">{selectedPlayer.account_username}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="request_message">Reason for Request</Label>
              <Textarea
                id="request_message"
                placeholder="Explain why you need this permission..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={4}
              />
              {requestMessage.length < 10 && requestMessage.length > 0 && (
                <p className="text-sm text-red-500">Please provide a more detailed explanation (at least 10 characters)</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitPermissionRequest}
              disabled={!requestMessage || requestMessage.length < 10}
            >
              Submit Request
            </Button>
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