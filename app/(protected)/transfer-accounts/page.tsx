"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Edit, Trash, MoreHorizontal, Plus, Search } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { fetchRequests, hasPermission, createRequest } from "@/lib/requstHandling";
import {PaginationData} from  "@/types/pagination-data.type"
import   {GetResponse} from "@/types/get-response.type" 
import {RequestData} from   "@/types/request-data.type" 

interface TransferAccount {
  id: string;
  account_username: string;
  password: string;
  transfer_account: string;
  created_at: string;
  updated_at: string;
  player_count?: number;
}



export default function TransferAccountManagementPage() {
  const { auth, isLoading } = useUser();
  const [accounts, setAccounts] = useState<TransferAccount[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<TransferAccount | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<TransferAccount | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const router = useRouter();

  // Permission request states
  const [permissionsMap, setPermissionsMap] = useState<Map<string, RequestData>>(new Map());
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestAction, setRequestAction] = useState<string>("");
  const [requestMessage, setRequestMessage] = useState("");
  const [completePermission, setCompletePermission] = useState<{modelId: string, action: string} | null>(null);

  // Form state for create/edit
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formTransferAccount, setFormTransferAccount] = useState("");  
  const [formErrors, setFormErrors] = useState<{ username?: string; password?: string, transferAccount?: string }>({});

  // Load accepted permission requests
  const loadPermissions = async () => {
    if (!auth) return;
    
    try {
      const map = await fetchRequests('TransferAccount', 'accepted');
      setPermissionsMap(map);
    } catch (error) {
      console.error("Error loading permissions:", error);
    }
  };

  // Complete a permission after use
  const markPermissionComplete = async (modelId: string, action: string) => {
    try {
      let key = "";  
      if(action === "create") {  
        key = `new:${action}`;
      } else {  
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

  const fetchAccounts = async () => {
    if (auth) {
      if (!auth.canAccess("transfer-accounts")) {
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

      const response = await fetch(`/api/transfer-accounts?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch transfer accounts");
      }

      const data: GetResponse = await response.json();
      setAccounts(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching transfer accounts:", error);
      toast.error("Failed to fetch transfer accounts");
    }
  };

  useEffect(() => {
    if (!isLoading && auth) {
      fetchAccounts();
      loadPermissions();
    }
  }, [isLoading, auth, router, currentPage, pageSize]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== "") {
        fetchAccounts();
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
    const errors: { username?: string; password?: string; transferAccount?: string } = {};
    
    if (!formUsername || formUsername.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }
    
    if (!formPassword || formPassword.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (!formTransferAccount) {
      errors.transferAccount = "Transfer account is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createAccount = async () => {
    if (!validateForm()) return;
    
    try {
      const response = await fetch("/api/transfer-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_username: formUsername,
          password: formPassword,
          transfer_account: formTransferAccount
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create transfer account");
      }

      // If this was a permission-based create, mark it as complete
      if (!auth?.can("transfer-accounts:create") && hasPermission(permissionsMap, "new", "create")) {
        setCompletePermission({
          modelId: "new",
          action: "create"
        });
      }

      const result = await response.json();
      toast.success("Transfer account created successfully");
      setFormUsername("");
      setFormPassword("");
      setFormTransferAccount(""); 
      setCreateDialogOpen(false);
      fetchAccounts();
    } catch (error) {
      console.error("Error creating transfer account:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create transfer account");
    }
  };

  const updateAccount = async () => {
    if (!selectedAccount || !validateForm()) return;
  
    try {
      // Use the dynamic route structure with the ID in the path
      const response = await fetch(`/api/transfer-accounts/${selectedAccount.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_username: formUsername,
          password: formPassword,
          transfer_account: formTransferAccount
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update transfer account");
      }
  
      if (!auth?.can("transfer-accounts:edit") && hasPermission(permissionsMap, selectedAccount.id, "edit")) {
        setCompletePermission({
          modelId: selectedAccount.id,
          action: "edit"
        });
      }
  
      const result = await response.json();
      toast.success("Transfer account updated successfully");
      setFormUsername("");
      setFormPassword("");
      setFormTransferAccount(""); 
      setEditDialogOpen(false);
      fetchAccounts();
    } catch (error) {
      console.error("Error updating transfer account:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update transfer account");
    }
  };

  const deleteAccount = async () => {
    if (!accountToDelete) return;

    try {
      const response = await fetch(`/api/transfer-accounts/${accountToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 409) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete transfer account");
      }

      // If this was a permission-based delete, mark it as complete
      if (!auth?.can("transfer-accounts:delete") && hasPermission(permissionsMap, accountToDelete.id, "delete")) {
        setCompletePermission({
          modelId: accountToDelete.id,
          action: "delete"
        });
      }
      
      if(response.status === 409) {  
        const data = await response.json();
        throw new Error(data.error || "Failed to delete transfer account");
      }else {  
        toast.success("Transfer account deleted successfully");
      }
      fetchAccounts();
    } catch (error) {
      console.error("Error deleting transfer account:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete transfer account");
    } finally {
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleCreate = () => {
    if (!auth?.can("transfer-accounts:create") && !hasPermission(permissionsMap, "new", "create")) {
      openRequestDialog("create");
      return;
    }
    
    setFormUsername("");
    setFormPassword("");
    setFormTransferAccount("");
    setFormErrors({});
    setCreateDialogOpen(true);
  };

  const handleEdit = (account: TransferAccount) => {
    setSelectedAccount(account);
    setFormUsername(account.account_username);
    setFormPassword(account.password);
    setFormTransferAccount(account.transfer_account || "");
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleDelete = (account: TransferAccount) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  // Open permission request dialog
  const openRequestDialog = (action: string, account?: TransferAccount) => {
    setRequestAction(action);
    setSelectedAccount(account || null);
    setRequestMessage("");
    setRequestDialogOpen(true);
  };
  
  // Submit permission request
  const submitPermissionRequest = async () => {
    if (!auth || requestMessage.length < 10) return;
    
    try {
      const modelId = selectedAccount?.id || "new"; // Use "new" for create actions
      const result = await createRequest(
        "TransferAccount",
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

  const togglePasswordVisibility = (accountId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: "Transfer Account Management" }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Transfer Account Management</CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={handleCreate}
              variant={auth?.can("transfer-accounts:create") || hasPermission(permissionsMap, "new", "create") ? "default" : "outline"}
            >
              <Plus className="mr-2 h-4 w-4" />
              {auth?.can("transfer-accounts:create") || hasPermission(permissionsMap, "new", "create") 
                ? "Create Account" 
                : "Request to Create Account"}
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
                placeholder="Search accounts..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value === "") {
                    setCurrentPage(1);
                    fetchAccounts();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setCurrentPage(1);
                    fetchAccounts();
                  }
                }}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Transfer Account</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead>Player Count</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Loading accounts...
                    </TableCell>
                  </TableRow>
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No transfer accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.account_username}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="mr-2">
                            {visiblePasswords[account.id] ? account.password : '••••••••'}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => togglePasswordVisibility(account.id)}
                          >
                            {visiblePasswords[account.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{account.transfer_account || 'N/A'}</TableCell>
                      <TableCell>{formatDate(account.created_at)}</TableCell>
                      <TableCell>{formatDate(account.updated_at)}</TableCell>
                      <TableCell>{account.player_count || 0}</TableCell>
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
                            {(auth?.can("transfer-accounts:edit") || hasPermission(permissionsMap, account.id, "edit")) ? (
                              <DropdownMenuItem onClick={() => handleEdit(account)}>
                                <Edit className="mr-2 h-4 w-4" />
                                {hasPermission(permissionsMap, account.id, "edit") && !auth?.can("transfer-accounts:edit") 
                                  ? "Execute Edit Permission" 
                                  : "Edit"}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => openRequestDialog("edit", account)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Request to Edit
                              </DropdownMenuItem>
                            )}
                            
                            {/* Delete option - show if user has permission or has accepted request */}
                            {(auth?.can("transfer-accounts:delete") || hasPermission(permissionsMap, account.id, "delete")) ? (
                              <DropdownMenuItem onClick={() => handleDelete(account)}>
                                <Trash className="mr-2 h-4 w-4" />
                                {hasPermission(permissionsMap, account.id, "delete") && !auth?.can("transfer-accounts:delete") 
                                  ? "Execute Delete Permission" 
                                  : "Delete"}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => openRequestDialog("delete", account)}>
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
                of <span className="font-medium">{pagination.total}</span> accounts
              </div>
              
              {pagination.totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(1)} 
                    disabled={isLoading || !pagination.hasPreviousPage}
                    size="sm"
                  >
                    First
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(currentPage - 1)} 
                    disabled={isLoading || !pagination.hasPreviousPage}
                    size="sm"
                  >
                    Previous
                  </Button>
                  <span className="px-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(currentPage + 1)} 
                    disabled={isLoading || !pagination.hasNextPage}
                    size="sm"
                  >
                    Next
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(pagination.totalPages)} 
                    disabled={isLoading || !pagination.hasNextPage}
                    size="sm"
                  >
                    Last
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Account Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Transfer Account</DialogTitle>
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
              <Label htmlFor="transfer_account">Transfer Account</Label>
              <Input
                id="transfer_account"
                placeholder="Enter transfer account"
                value={formTransferAccount}
                onChange={(e) => setFormTransferAccount(e.target.value)}
              />
              {formErrors.transferAccount && (
                <p className="text-sm text-red-500">{formErrors.transferAccount}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="flex space-x-2">
                <Input 
                  id="password" 
                  type={visiblePasswords['create'] ? "text" : "password"} 
                  placeholder="Enter password" 
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
                <Button 
                  type="button"
                  variant="outline" 
                  size="icon" 
                  onClick={() => togglePasswordVisibility('create')}
                >
                  {visiblePasswords['create'] ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {formErrors.password && (
                <p className="text-sm text-red-500">{formErrors.password}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createAccount}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Transfer Account</DialogTitle>
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
              <Label htmlFor="edit_transfer_account">Transfer Account</Label>
              <Input
                id="edit_transfer_account"
                placeholder="Enter transfer account"
                value={formTransferAccount}
                onChange={(e) => setFormTransferAccount(e.target.value)}
              />
              {formErrors.transferAccount && (
                <p className="text-sm text-red-500">{formErrors.transferAccount}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_password">Password</Label>
              <div className="flex space-x-2">
                <Input 
                  id="edit_password" 
                  type={visiblePasswords['edit'] ? "text" : "password"} 
                  placeholder="Enter password" 
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
                <Button 
                  type="button"
                  variant="outline" 
                  size="icon" 
                  onClick={() => togglePasswordVisibility('edit')}
                >
                  {visiblePasswords['edit'] ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {formErrors.password && (
                <p className="text-sm text-red-500">{formErrors.password}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateAccount}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Request Permission to {requestAction.charAt(0).toUpperCase() + requestAction.slice(1)} Transfer Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedAccount && (
              <div className="space-y-2">
                <Label>Account</Label>
                <p className="font-medium">{selectedAccount.account_username}</p>
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
        onConfirm={deleteAccount}
        title="Confirm Delete"
        children={
          <>
            <p>Are you sure you want to delete this transfer account?</p>
            {accountToDelete?.player_count && accountToDelete.player_count > 0 && (
              <p className="mt-2 text-red-500">
                Warning: This account has {accountToDelete.player_count} associated players that will be affected.
              </p>
            )}
            <p className="mt-2">This action cannot be undone.</p>
          </>
        }
        confirmText="Delete"
      />
    </div>
  );
}