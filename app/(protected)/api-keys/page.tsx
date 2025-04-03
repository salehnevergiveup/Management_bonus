"use client";

import { useState, useEffect } from "react";
import { Copy, Edit, Trash, MoreHorizontal, Plus, Search, RefreshCw, Shield } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/dialog";
import { Badge } from "@/components/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import toast from "react-hot-toast";
import { PaginationData } from "@/types/pagination-data.type";
import { GetResponse } from "@/types/get-response.type";
import { Roles } from "@/constants/enums";

interface Permission {
  id: string;
  name: string;
}

interface ApiKeyPermission {
  apikey_id: string;
  permission_id: string;
  permission: Permission;
}

interface ApiKey {
  id: string;
  application: string;
  token: string;
  expires_at: string;
  is_revoked: boolean;
  created_at: string;
  APIKeyPermission?: ApiKeyPermission[];
}

export default function ApiKeyManagementPage() {
  const { auth, isLoading } = useUser();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [newKeyDialog, setNewKeyDialog] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permissionsReadOnly, setPermissionsReadOnly] = useState(false);

  const router = useRouter();

  const [formApplication, setFormApplication] = useState("");
  const [formErrors, setFormErrors] = useState<{ application?: string }>({});

  useEffect(() => {
    if (!isLoading && auth) {
      if (auth.role !== Roles.Admin) {
        router.push("/dashboard");
        return;
      }
      fetchApiKeys();
      fetchPermissions();
    }
  }, [isLoading, auth, router, currentPage, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== "") {
        fetchApiKeys();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchApiKeys = async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("page", currentPage.toString());
      queryParams.append("limit", pageSize.toString());

      if (searchTerm) {
        queryParams.append("search", searchTerm);
      }

      const response = await fetch(`/api/api-keys?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch API keys");
      }

      const data: GetResponse = await response.json();
      setApiKeys(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      toast.error("Failed to fetch API keys");
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch("/api/permissions");
      
      if (!response.ok) {
        throw new Error("Failed to fetch permissions");
      }
      
      const data = await response.json();
      setPermissions(data.data || []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Failed to fetch permissions");
    }
  };

  const validateForm = () => {
    const errors: { application?: string } = {};
    
    if (!formApplication || formApplication.length < 3) {
      errors.application = "Application name must be at least 3 characters";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createApiKey = async () => {
    if (!validateForm()) return;
    
    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          application: formApplication,
          permissions: selectedPermissions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create API key");
      }

      const result = await response.json();
      setGeneratedKey(result.data.token);
      toast.success("API key created successfully");
      setFormApplication("");
      setSelectedPermissions([]);
      setCreateDialogOpen(false);
      setNewKeyDialog(true);
      fetchApiKeys();
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create API key");
    }
  };
  
  const isAutomationKey = (key: ApiKey|null) => {
    return key?.application === "automation";
  };

  const updateApiKey = async () => {
    if (!selectedKey || !validateForm()) return;

    try {
      const response = await fetch(`/api/api-keys/${selectedKey.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          application: formApplication,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update API key");
      }

      const result = await response.json();
      toast.success("API key updated successfully");
      setFormApplication("");
      setEditDialogOpen(false);
      fetchApiKeys();
    } catch (error) {
      console.error("Error updating API key:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update API key");
    }
  };

  const updatePermissions = async () => {
    if (!selectedKey) return;
    
    if (isAutomationKey(selectedKey)) {
      setPermissionsDialogOpen(false);
      return;
    }
  
    try {
      const response = await fetch(`/api/api-keys/${selectedKey.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          permissions: selectedPermissions,
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update permissions");
      }
  
      toast.success("Permissions updated successfully");
      setPermissionsDialogOpen(false);
      fetchApiKeys();
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update permissions");
    }
  };

  const regenerateApiKey = async () => {
    if (!selectedKey) return;

    try {
      const response = await fetch(`/api/api-keys/${selectedKey.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          regenerateToken: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to regenerate API key");
      }

      const result = await response.json();
      setGeneratedKey(result.data.token);
      toast.success("API key regenerated successfully");
      setRegenerateDialogOpen(false);
      setNewKeyDialog(true);
      fetchApiKeys();
    } catch (error) {
      console.error("Error regenerating API key:", error);
      toast.error(error instanceof Error ? error.message : "Failed to regenerate API key");
    }
  };

  const deleteApiKey = async () => {
    if (!keyToDelete) return;

    try {
      const response = await fetch(`/api/api-keys/${keyToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete API key");
      }

      toast.success("API key deleted successfully");
      fetchApiKeys();
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete API key");
    } finally {
      setDeleteDialogOpen(false);
      setKeyToDelete(null);
    }
  };

  const toggleKeyStatus = async (key: ApiKey) => {
    try {
      const response = await fetch(`/api/api-keys/${key.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toggleRevoked: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update API key status");
      }

      toast.success(`API key ${key.is_revoked ? "enabled" : "disabled"} successfully`);
      fetchApiKeys();
    } catch (error) {
      console.error("Error updating API key status:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update API key status");
    }
  };

  const extendExpiration = async (key: ApiKey) => {
    try {
      const response = await fetch(`/api/api-keys/${key.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          extendExpiration: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extend expiration");
      }

      toast.success("API key expiration extended successfully");
      fetchApiKeys();
    } catch (error) {
      console.error("Error extending API key expiration:", error);
      toast.error(error instanceof Error ? error.message : "Failed to extend expiration");
    }
  };

  const handleCreate = () => {
    setFormApplication("");
    setSelectedPermissions([]);
    setFormErrors({});
    setCreateDialogOpen(true);
  };

  const handleEdit = (key: ApiKey) => {
    if (isAutomationKey(key)) {
      toast.error("The Automation API key name cannot be modified");
      return;
    }
    
    setSelectedKey(key);
    setFormApplication(key.application);
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleManagePermissions = (key: ApiKey) => {
    setSelectedKey(key);
    
    // Set currently selected permissions
    const currentPermissions = key.APIKeyPermission?.map(p => p.permission_id) || [];
    setSelectedPermissions(currentPermissions);
    
    // Set read-only mode if this is the automation key
    setPermissionsReadOnly(isAutomationKey(key));
    
    setPermissionsDialogOpen(true);
  };

  const handleRegenerateKey = (key: ApiKey) => {
    setSelectedKey(key);
    setRegenerateDialogOpen(true);
  };

  const handleDelete = (key: ApiKey) => {
    if (isAutomationKey(key)) {
      toast.error("The Automation API key cannot be deleted");
      return;
    }
    
    setKeyToDelete(key);
    setDeleteDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: "API Key Management" }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>API Key Management</CardTitle>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <Button 
              onClick={handleCreate} 
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
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
                placeholder="Search applications..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value === "") {
                    setCurrentPage(1);
                    fetchApiKeys();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setCurrentPage(1);
                    fetchApiKeys();
                  }
                }}
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {isLoading ? (
  <TableRow>
    <TableCell colSpan={6} className="h-24 text-center">
      Loading API keys...
    </TableCell>
  </TableRow>
) : apiKeys.length === 0 ? (
  <TableRow>
    <TableCell colSpan={6} className="h-24 text-center">
      No API keys found
    </TableCell>
  </TableRow>
) : (
  apiKeys.map((key) => {
    const isAutomationKey = key.application === "automation";
    return (
      <TableRow 
        key={key.id} 
        className={`${key.is_revoked ? "opacity-60" : ""} ${isAutomationKey ? "bg-blue-50" : ""}`}
      >
        <TableCell className="font-medium">
          {key.application}
          {isAutomationKey && (
            <Badge 
              color="bg-blue-100 text-blue-800 ml-2"
              text="System"
            />
          )}
        </TableCell>
        <TableCell>
          <Badge 
            color={key.is_revoked ? "bg-red-100 text-red-800" : isExpired(key.expires_at) ? "bg-gray-100 text-gray-800" : "bg-green-100 text-green-800"}
            text={key.is_revoked ? "Disabled" : isExpired(key.expires_at) ? "Expired" : "Active"}
          />
        </TableCell>
        <TableCell>
          {key.APIKeyPermission && key.APIKeyPermission.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              <Badge 
                color="bg-blue-100 text-blue-800"
                text={`${key.APIKeyPermission.length} permissions`}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={() => handleManagePermissions(key)}
              >
                {isAutomationKey ? "View" : "Manage"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center">
              <Badge 
                color="bg-gray-100 text-gray-800"
                text="No permissions"
              />
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs ml-1"
                onClick={() => handleManagePermissions(key)}
                disabled={isAutomationKey}
              >
                Add
              </Button>
            </div>
          )}
        </TableCell>
        <TableCell className={isExpired(key.expires_at) ? "text-red-500" : ""}>
          {formatDate(key.expires_at)}
        </TableCell>
        <TableCell>{formatDate(key.created_at)}</TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAutomationKey ? (
                // Special menu for automation key
                <>
                  <DropdownMenuItem onClick={() => handleManagePermissions(key)}>
                    <Shield className="mr-2 h-4 w-4" />
                    View Permissions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRegenerateKey(key)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate Token
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => extendExpiration(key)}>
                    <span className="mr-2 inline-flex items-center justify-center h-4 w-4 rounded-full bg-gray-100 text-gray-800">+</span>
                    Extend Expiration
                  </DropdownMenuItem>
                </>
              ) : (
                // Regular menu for normal keys
                <>
                  <DropdownMenuItem onClick={() => handleEdit(key)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleManagePermissions(key)}>
                    <Shield className="mr-2 h-4 w-4" />
                    Manage Permissions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRegenerateKey(key)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate Token
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleKeyStatus(key)}>
                    {key.is_revoked ? (
                      <>
                        <span className="mr-2 inline-flex items-center justify-center h-4 w-4 rounded-full bg-gray-100 text-gray-800">✓</span>
                        Enable
                      </>
                    ) : (
                      <>
                        <span className="mr-2 inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-100 text-red-800">✕</span>
                        Disable
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => extendExpiration(key)}>
                    <span className="mr-2 inline-flex items-center justify-center h-4 w-4 rounded-full bg-gray-100 text-gray-800">+</span>
                    Extend Expiration
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(key)}>
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  })
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
                of <span className="font-medium">{pagination.total}</span> API keys
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

      {/* Create API Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-grow pr-4">
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="application">Application Name</Label>
                <Input 
                  id="application" 
                  placeholder="Enter application name" 
                  value={formApplication}
                  onChange={(e) => setFormApplication(e.target.value)}
                />
                {formErrors.application && (
                  <p className="text-sm text-red-500">{formErrors.application}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-[200px] overflow-y-auto">
                  {permissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No permissions found</p>
                  ) : (
                    permissions.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`permission-${permission.id}`}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={(checked: any) => {
                            if (checked) {
                              setSelectedPermissions([...selectedPermissions, permission.id]);
                            } else {
                              setSelectedPermissions(selectedPermissions.filter(id => id !== permission.id));
                            }
                          }}
                        />
                        <Label 
                          htmlFor={`permission-${permission.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {permission.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <Alert>
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  After creation, the API key will be shown only once. Make sure to copy it immediately.
                </AlertDescription>
              </Alert>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createApiKey}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit API Key Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit_application">Application Name</Label>
              <Input 
                id="edit_application" 
                placeholder="Enter application name" 
                value={formApplication}
                onChange={(e) => setFormApplication(e.target.value)}
              />
              {formErrors.application && (
                <p className="text-sm text-red-500">{formErrors.application}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateApiKey}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
  <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
    <DialogHeader>
      <DialogTitle>
        {permissionsReadOnly ? "View Permissions" : "Manage Permissions"}
      </DialogTitle>
    </DialogHeader>
    <ScrollArea className="flex-grow pr-4">
      <div className="space-y-4 py-2">
        <p className="text-sm">
          {permissionsReadOnly 
            ? `Viewing permissions for ${selectedKey?.application}`
            : `Managing permissions for ${selectedKey?.application}`}
        </p>
        
        {permissionsReadOnly && isAutomationKey(selectedKey) && (
          <Alert>
            <AlertTitle>System API Key</AlertTitle>
            <AlertDescription>
              This is a system API key used for automation. Its permissions cannot be modified.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="border rounded-md p-3 space-y-2 max-h-[300px] overflow-y-auto">
          {permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No permissions found</p>
          ) : (
            permissions.map((permission) => (
              <div key={permission.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`edit-permission-${permission.id}`}
                  checked={selectedPermissions.includes(permission.id)}
                  onCheckedChange={(checked) => {
                    if (permissionsReadOnly) return;
                    
                    if (checked) {
                      setSelectedPermissions([...selectedPermissions, permission.id]);
                    } else {
                      setSelectedPermissions(selectedPermissions.filter(id => id !== permission.id));
                    }
                  }}
                  disabled={permissionsReadOnly}
                />
                <Label 
                  htmlFor={`edit-permission-${permission.id}`}
                  className={`text-sm font-normal ${permissionsReadOnly ? "" : "cursor-pointer"}`}
                >
                  {permission.name}
                </Label>
              </div>
            ))
          )}
        </div>
      </div>
    </ScrollArea>
    <DialogFooter className="mt-4">
      <Button onClick={() => setPermissionsDialogOpen(false)}>
        {permissionsReadOnly ? "Close" : "Cancel"}
      </Button>
      {!permissionsReadOnly && (
        <Button onClick={updatePermissions}>Save Changes</Button>
      )}
    </DialogFooter>
  </DialogContent>
</Dialog>

      {/* Regenerate API Key Dialog */}
      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Regenerate API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Alert variant="destructive">
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Regenerating this API key will invalidate the existing one. Any application using the current key will stop working until updated with the new key.
              </AlertDescription>
            </Alert>
            <p className="text-sm">
              Are you sure you want to regenerate the API key for <strong>{selectedKey?.application}</strong>?
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRegenerateDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={regenerateApiKey}>Regenerate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New API Key Dialog */}
      <Dialog open={newKeyDialog} onOpenChange={setNewKeyDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New API Key Generated</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Alert variant="destructive">
              <AlertTitle>Important - Copy this key now!</AlertTitle>
              <AlertDescription>
                This API key will only be shown once. Make sure to copy it now as you won't be able to retrieve it later.
              </AlertDescription>
            </Alert>
            <div className="p-3 bg-muted rounded-md">
              <ScrollArea className="w-full max-h-[100px]">
                <code className="text-sm font-mono break-all whitespace-pre-wrap">{generatedKey}</code>
              </ScrollArea>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-2 w-full"
                onClick={() => generatedKey && copyToClipboard(generatedKey)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKeyDialog(false)}>I've Copied It</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={deleteApiKey}
        title="Confirm Delete"
        children={
          <>
            <p>Are you sure you want to delete the API key for <strong>{keyToDelete?.application}</strong>?</p>
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Deleting this API key will immediately revoke access for any applications using it. This action cannot be undone.
              </AlertDescription>
            </Alert>
          </>
        }
        confirmText="Delete"
      />
    </div>
  );
}