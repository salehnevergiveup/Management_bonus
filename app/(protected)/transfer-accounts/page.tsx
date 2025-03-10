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
import toast from "react-hot-toast";

interface TransferAccount {
  id: string;
  account_username: string;
  password: string;
  created_at: string;
  updated_at: string;
  player_count?: number;
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
  data: TransferAccount[];
  success: boolean;
  pagination: PaginationData;
  message: string;
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

  // Form state for create/edit
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formErrors, setFormErrors] = useState<{ username?: string; password?: string }>({});

  const fetchAccounts = async () => {
    if (auth) {
      console.log(auth.models);
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

      const data: ApiResponse = await response.json();
      setAccounts(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching transfer accounts:", error);
      toast.error("Failed to fetch transfer accounts");
    }
  };

  useEffect(() => {
    fetchAccounts();
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

  const validateForm = () => {
    const errors: { username?: string; password?: string } = {};
    
    if (!formUsername || formUsername.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }
    
    if (!formPassword || formPassword.length < 6) {
      errors.password = "Password must be at least 6 characters";
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
          password: formPassword
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create transfer account");
      }

      const result = await response.json();
      toast.success("Transfer account created successfully");
      setFormUsername("");
      setFormPassword("");
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
      const response = await fetch(`/api/transfer-accounts/${selectedAccount.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_username: formUsername,
          password: formPassword
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update transfer account");
      }

      const result = await response.json();
      toast.success("Transfer account updated successfully");
      setFormUsername("");
      setFormPassword("");
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete transfer account");
      }

      toast.success("Transfer account deleted successfully");
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
    setFormUsername("");
    setFormPassword("");
    setFormErrors({});
    setCreateDialogOpen(true);
  };

  const handleEdit = (account: TransferAccount) => {
    setSelectedAccount(account);
    setFormUsername(account.account_username);
    setFormPassword(account.password);
    setFormErrors({});
    setEditDialogOpen(true);
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
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Account
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
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead>Player Count</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading accounts...
                    </TableCell>
                  </TableRow>
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
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
                            <DropdownMenuItem onClick={() => handleEdit(account)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setAccountToDelete(account);
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