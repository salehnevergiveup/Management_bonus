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
import { PaginationData } from "@/types/pagination-data.type";
import { GetResponse } from "@/types/get-response.type";

interface AgentAccount {
  id: string;
  username: string;
  password: string;
  status: string;
  progress: string;
  process_id: string;
  created_at: string;
  updated_at: string;
}

export default function AgentAccountManagementPage() {
  const { auth, isLoading } = useUser();
  const [agentAccounts, setAgentAccounts] = useState<AgentAccount[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<AgentAccount | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AgentAccount | null>(null);
  const router = useRouter();

  // Form state for create/edit
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [formProgress, setFormProgress] = useState("");
  const [formProcessId, setFormProcessId] = useState("");
  const [formErrors, setFormErrors] = useState<{ username?: string; password?: string }>({});

  const fetchAgentAccounts = async () => {
    if (auth) {
      if (!auth.canAccess("agent-accounts")) {
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

      const response = await fetch(`/api/agent-accounts?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch agent accounts");
      }

      const data: GetResponse = await response.json();
      setAgentAccounts(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching agent accounts:", error);
      toast.error("Failed to fetch agent accounts");
    }
  };

  useEffect(() => {
    if (!isLoading && auth) {
      fetchAgentAccounts();
    }
  }, [isLoading, auth, router, currentPage, pageSize]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== "") {
        fetchAgentAccounts();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const validateForm = (isCreate = true) => {
    const errors: { username?: string; password?: string } = {};
    
    if (!formUsername || formUsername.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }
    
    if (isCreate && (!formPassword || formPassword.length < 6)) {
      errors.password = "Password must be at least 6 characters";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createAgentAccount = async () => {
    if (!validateForm(true)) return;
    
    try {
      const response = await fetch("/api/agent-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formUsername,
          password: formPassword
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create agent account");
      }

      const result = await response.json();
      toast.success("Agent account created successfully");
      setFormUsername("");
      setFormPassword("");
      setCreateDialogOpen(false);
      fetchAgentAccounts();
    } catch (error) {
      console.error("Error creating agent account:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create agent account");
    }
  };

  const updateAgentAccount = async () => {
    if (!selectedAccount || !validateForm(false)) return;

    try {
      const updateData: Record<string, any> = {
        username: formUsername
      };

      if (formPassword) {
        updateData.password = formPassword;
      }

      if (formStatus) {
        updateData.status = formStatus;
      }

      if (formProgress) {
        updateData.progress = formProgress;
      }

      if (formProcessId) {
        updateData.process_id = formProcessId;
      }

      const response = await fetch(`/api/agent-accounts/${selectedAccount.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update agent account");
      }

      const result = await response.json();
      toast.success("Agent account updated successfully");
      
      setFormUsername("");
      setFormPassword("");
      setFormStatus("");
      setFormProgress("");
      setFormProcessId("");
      setEditDialogOpen(false);
      fetchAgentAccounts();
    } catch (error) {
      console.error("Error updating agent account:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update agent account");
    }
  };

  const deleteAgentAccount = async () => {
    if (!accountToDelete) return;

    try {
      const response = await fetch(`/api/agent-accounts/${accountToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete agent account");
      }

      toast.success("Agent account deleted successfully");
      fetchAgentAccounts();
    } catch (error) {
      console.error("Error deleting agent account:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete agent account");
    } finally {
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleCreate = () => {
    setFormUsername("");
    setFormPassword("");
    setFormStatus("");
    setFormProgress("");
    setFormProcessId("");
    setFormErrors({});
    setCreateDialogOpen(true);
  };

  const handleEdit = (account: AgentAccount) => {
    setSelectedAccount(account);
    setFormUsername(account.username);
    setFormPassword("");
    setFormStatus(account.status || "");
    setFormProgress(account.progress || "");
    setFormProcessId(account.process_id || "");
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleDelete = (account: AgentAccount) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: "Agent Account Management" }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Agent Account Management</CardTitle>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <Button 
              onClick={handleCreate} 
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Agent Account
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
                placeholder="Search agent accounts..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value === "") {
                    setCurrentPage(1);
                    fetchAgentAccounts();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setCurrentPage(1);
                    fetchAgentAccounts();
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
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Process ID</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Loading agent accounts...
                    </TableCell>
                  </TableRow>
                ) : agentAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No agent accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  agentAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.username}</TableCell>
                      <TableCell>{account.status || 'N/A'}</TableCell>
                      <TableCell>{account.progress || 'N/A'}</TableCell>
                      <TableCell>{account.process_id || 'N/A'}</TableCell>
                      <TableCell>{account.created_at ? formatDate(account.created_at) : 'N/A'}</TableCell>
                      <TableCell>{account.updated_at ? formatDate(account.updated_at) : 'N/A'}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleDelete(account)}>
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
                of <span className="font-medium">{pagination.total}</span> agent accounts
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

      {/* Create Agent Account Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Agent Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
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
              <Input 
                id="password"
                type="password" 
                placeholder="Enter password" 
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
              />
              {formErrors.password && (
                <p className="text-sm text-red-500">{formErrors.password}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createAgentAccount}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Agent Account Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Agent Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit_username">Username</Label>
              <Input 
                id="edit_username" 
                placeholder="Enter username" 
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
              />
              {formErrors.username && (
                <p className="text-sm text-red-500">{formErrors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_password">Password (leave blank to keep unchanged)</Label>
              <Input 
                id="edit_password"
                type="password" 
                placeholder="Enter new password" 
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
              />
              {formErrors.password && (
                <p className="text-sm text-red-500">{formErrors.password}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status</Label>
              <Input 
                id="edit_status" 
                placeholder="Enter status" 
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_progress">Progress</Label>
              <Input 
                id="edit_progress" 
                placeholder="Enter progress" 
                value={formProgress}
                onChange={(e) => setFormProgress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_process_id">Process ID</Label>
              <Input 
                id="edit_process_id" 
                placeholder="Enter process ID" 
                value={formProcessId}
                onChange={(e) => setFormProcessId(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateAgentAccount}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={deleteAgentAccount}
        title="Confirm Delete"
        children={
          <>
            <p>Are you sure you want to delete this agent account?</p>
            <p className="mt-2">This action cannot be undone.</p>
          </>
        }
        confirmText="Delete"
      />
    </div>
  );
}