"use client";

import { useState, useEffect, useMemo } from "react";
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
import {GetResponse} from "@/types/get-response.type" 
import {RequestData} from "@/types/request-data.type" 
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

interface TransferAccount {
  id: string;
  username: string;
  password: string;
  pin_code: string;
  type: string;
  process_id: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  player_count?: number;
}

export default function TransferAccountManagementPage() {
  const { auth, isLoading } = useUser();
  const [allAccounts, setAllAccounts] = useState<TransferAccount[]>([]); // Store all accounts
  const [displayedAccounts, setDisplayedAccounts] = useState<TransferAccount[]>([]); // Accounts to display
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<TransferAccount | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<TransferAccount | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [visiblePinCodes, setVisiblePinCodes] = useState<Record<string, boolean>>({});
  const [parentAccounts, setParentAccounts] = useState<TransferAccount[]>([]);
  const router = useRouter();

  // Front-end pagination state
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Permission request states
  const [permissionsMap, setPermissionsMap] = useState<Map<string, RequestData>>(new Map());
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestAction, setRequestAction] = useState<string>("");
  const [requestMessage, setRequestMessage] = useState("");
  const [completePermission, setCompletePermission] = useState<{modelId: string, action: string} | null>(null);

  // Form state for create/edit
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPinCode, setFormPinCode] = useState("");
  const [formType, setFormType] = useState("sub_account");
  const [formParentId, setFormParentId] = useState("");
  const [formErrors, setFormErrors] = useState<{ username?: string; password?: string; pinCode?: string; parentId?: string }>({});
  const { lang, setLang } = useLanguage()
  
  // Account types
  const accountTypes = [
    { value: "main_account", label: "Main Account" },
    { value: "sub_account", label: "Sub Account" }
  ];

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

  // Fetch potential parent accounts (only main accounts)
  const fetchParentAccounts = async () => {
    try {
      const response = await fetch(`/api/transfer-accounts?type=main_account&limit=100`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch parent accounts");
      }
      
      const data = await response.json();
      setParentAccounts(data.data);
    } catch (error) {
      console.error("Error fetching parent accounts:", error);
      toast.error("Failed to fetch parent accounts");
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

  // Fetch all accounts data once
  const fetchAllAccounts = async () => {
    if (auth) {
      if (!auth.canAccess("transfer-accounts")) {
        router.push("/dashboard");
        return;
      }
    }
    try {
      // Request all accounts without pagination
      const queryParams = new URLSearchParams();
      queryParams.append("limit", "1000"); // Request a large amount
      
      const response = await fetch(`/api/transfer-accounts?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch transfer accounts");
      }

      const data: GetResponse = await response.json();
      setAllAccounts(data.data);
      setTotalItems(data.data.length);
      
      // Initial filtering by search term
      filterAndPaginateAccounts(data.data, searchTerm, currentPage, pageSize);
    } catch (error) {
      console.error("Error fetching transfer accounts:", error);
      toast.error("Failed to fetch transfer accounts");
    }
  };

  // Filter and paginate accounts on the client-side
  const filterAndPaginateAccounts = (accounts: TransferAccount[], search: string, page: number, size: number) => {
    // First filter accounts by search term
    let filtered = accounts;
    if (search.trim() !== "") {
      const searchLower = search.toLowerCase();
      filtered = accounts.filter(account => 
        account.username.toLowerCase().includes(searchLower) ||
        account.type?.toLowerCase().includes(searchLower)
      );
    }
    
    // Calculate total pages
    const calculatedTotalPages = Math.ceil(filtered.length / size);
    setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);
    setTotalItems(filtered.length);
    
    // Paginate the filtered results
    const start = (page - 1) * size;
    const end = start + size;
    setDisplayedAccounts(filtered.slice(start, end));
  };

  useEffect(() => {
    if (!isLoading && auth) {
      fetchAllAccounts();
      fetchParentAccounts();
      loadPermissions();
    }
  }, [isLoading, auth, router]);

  // Apply filtering and pagination whenever relevant state changes
  useEffect(() => {
    filterAndPaginateAccounts(allAccounts, searchTerm, currentPage, pageSize);
  }, [searchTerm, currentPage, pageSize, allAccounts]);

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
    const errors: { username?: string; password?: string; pinCode?: string; parentId?: string } = {};
    
    if (!formUsername || formUsername.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }
    
    if (!formPassword || formPassword.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    
    if (!formPinCode || !/^\d{6}$/.test(formPinCode)) {
      errors.pinCode = "PIN code must be exactly 6 digits (0-9)";
    }
  
    // Only validate parent account selection for sub accounts
    if (formType === "sub_account" && !formParentId) {
      errors.parentId = "Parent account is required for sub accounts";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createAccount = async () => {
    if (!validateForm()) return;
    
    try {
      // For main accounts, don't send parent_id
      const accountData = {
        username: formUsername,
        password: formPassword,
        pin_code: formPinCode,
        type: formType,
        parent_id: formType === "sub_account" ? formParentId : null
      };

      const response = await fetch("/api/transfer-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(accountData),
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
      setFormPinCode("");
      setFormType("sub_account");
      setFormParentId("");
      setCreateDialogOpen(false);
      fetchAllAccounts();
    } catch (error) {
      console.error("Error creating transfer account:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create transfer account");
    }
  };

  const updateAccount = async () => {
    if (!selectedAccount || !validateForm()) return;
  
    try {
      // For main accounts, don't send parent_id
      const accountData = {
        username: formUsername,
        password: formPassword,
        pin_code: formPinCode,
        type: formType,
        parent_id: formType === "sub_account" ? formParentId : null
      };

      // Use the dynamic route structure with the ID in the path
      const response = await fetch(`/api/transfer-accounts/${selectedAccount.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(accountData),
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
      setFormPinCode("");
      setFormType("sub_account");
      setFormParentId("");
      setEditDialogOpen(false);
      fetchAllAccounts();
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
      } else {  
        toast.success("Transfer account deleted successfully");
      }
      fetchAllAccounts();
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
    setFormPinCode("");
    setFormType("sub_account");
    setFormParentId("");
    setFormErrors({});
    setCreateDialogOpen(true);
  };

  const handleEdit = (account: TransferAccount) => {
    setSelectedAccount(account);
    setFormUsername(account.username);
    setFormPassword(account.password);
    setFormPinCode(account.pin_code || "");
    setFormType(account.type || "sub_account");
    setFormParentId(account.parent_id || "");
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
  
  const togglePinCodeVisibility = (accountId: string) => {
    setVisiblePinCodes(prev => ({
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

  // Find parent account username for display
  const getParentUsername = (parentId: string | null | undefined) => {
    if (!parentId) return 'None';
    const parent = parentAccounts.find(account => account.id === parentId);
    return parent ? parent.username : 'Unknown';
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: t("transfer_account_management", lang) }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{t("transfer_account_management", lang)}</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleCreate}
              variant={
                auth?.can("transfer-accounts:create") || hasPermission(permissionsMap, "new", "create")
                  ? "default"
                  : "outline"
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              {auth?.can("transfer-accounts:create") || hasPermission(permissionsMap, "new", "create")
                ? t("create_account", lang)
                : t("request_to_create_account", lang)}
            </Button>
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => {
                setPageSize(Number(val))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t("rows_per_page", lang)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">{t("five_rows", lang)}</SelectItem>
                <SelectItem value="10">{t("ten_rows", lang)}</SelectItem>
                <SelectItem value="20">{t("twenty_rows", lang)}</SelectItem>
                <SelectItem value="50">{t("fifty_rows", lang)}</SelectItem>
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
                placeholder={t("search_accounts", lang)}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("username", lang)}</TableHead>
                  <TableHead>{t("password", lang)}</TableHead>
                  <TableHead>{t("pin_code", lang)}</TableHead>
                  <TableHead>{t("type", lang)}</TableHead>
                  <TableHead>{t("parent_account", lang)}</TableHead>
                  <TableHead>{t("created_at", lang)}</TableHead>
                  <TableHead>{t("updated_at", lang)}</TableHead>
                  <TableHead>{t("player_count", lang)}</TableHead>
                  <TableHead className="text-right">{t("actions", lang)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center">
                      {t("loading_accounts", lang)}
                    </TableCell>
                  </TableRow>
                ) : displayedAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center">
                      {t("no_transfer_accounts_found", lang)}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.username}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="mr-2">{visiblePasswords[account.id] ? account.password : "••••••••"}</span>
                          <Button variant="ghost" size="sm" onClick={() => togglePasswordVisibility(account.id)}>
                            {visiblePasswords[account.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="mr-2">{visiblePinCodes[account.id] ? account.pin_code : "••••"}</span>
                          <Button variant="ghost" size="sm" onClick={() => togglePinCodeVisibility(account.id)}>
                            {visiblePinCodes[account.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{account.type ? t(account.type, lang) : t("sub_account", lang)}</TableCell>
                      <TableCell>{getParentUsername(account.parent_id)}</TableCell>
                      <TableCell>
                        {account.created_at ? formatDate(account.created_at) : t("not_available", lang)}
                      </TableCell>
                      <TableCell>
                        {account.updated_at ? formatDate(account.updated_at) : t("not_available", lang)}
                      </TableCell>
                      <TableCell>{account.player_count || t("not_available", lang)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">{t("open_menu", lang)}</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Edit option - show if user has permission or has accepted request */}
                            {auth?.can("transfer-accounts:edit") ||
                            hasPermission(permissionsMap, account.id, "edit") ? (
                              <DropdownMenuItem onClick={() => handleEdit(account)}>
                                <Edit className="mr-2 h-4 w-4" />
                                {hasPermission(permissionsMap, account.id, "edit") &&
                                !auth?.can("transfer-accounts:edit")
                                  ? t("execute_edit_permission", lang)
                                  : t("edit", lang)}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => openRequestDialog("edit", account)}>
                                <Edit className="mr-2 h-4 w-4" />
                                {t("request_to_edit", lang)}
                              </DropdownMenuItem>
                            )}

                            {/* Delete option - show if user has permission or has accepted request */}
                            {auth?.can("transfer-accounts:delete") ||
                            hasPermission(permissionsMap, account.id, "delete") ? (
                              <DropdownMenuItem onClick={() => handleDelete(account)}>
                                <Trash className="mr-2 h-4 w-4" />
                                {hasPermission(permissionsMap, account.id, "delete") &&
                                !auth?.can("transfer-accounts:delete")
                                  ? t("execute_delete_permission", lang)
                                  : t("delete", lang)}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => openRequestDialog("delete", account)}>
                                <Trash className="mr-2 h-4 w-4" />
                                {t("request_to_delete", lang)}
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

          {/* Client-side pagination display */}
          <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
            <div className="text-sm text-muted-foreground">
              {t("showing", lang)}{" "}
              <span className="font-medium">{displayedAccounts.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span>{" "}
              {t("to", lang)} <span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span>{" "}
              {t("of", lang)} <span className="font-medium">{totalItems}</span> {t("accounts", lang)}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => goToPage(1)}
                  disabled={isLoading || currentPage === 1}
                  size="sm"
                >
                  {t("first", lang)}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={isLoading || currentPage === 1}
                  size="sm"
                >
                  {t("previous", lang)}
                </Button>
                <span className="px-2">
                  {t("page", lang)} {currentPage} {t("of", lang)} {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={isLoading || currentPage === totalPages}
                  size="sm"
                >
                  {t("next", lang)}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(totalPages)}
                  disabled={isLoading || currentPage === totalPages}
                  size="sm"
                >
                  {t("last", lang)}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Account Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("create_transfer_account", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="account_type">{t("account_type", lang)}</Label>
              <Select
                value={formType}
                onValueChange={(value) => {
                  setFormType(value)
                  // Reset parent ID when switching to main account
                  if (value === "main_account") {
                    setFormParentId("")
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("select_account_type", lang)} />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_username">{t("username", lang)}</Label>
              <Input
                id="account_username"
                placeholder={t("enter_username", lang)}
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
              />
              {formErrors.username && <p className="text-sm text-red-500">{formErrors.username}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password", lang)}</Label>
              <div className="flex space-x-2">
                <Input
                  id="password"
                  type={visiblePasswords["create"] ? "text" : "password"}
                  placeholder={t("enter_password", lang)}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => togglePasswordVisibility("create")}>
                  {visiblePasswords["create"] ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {formErrors.password && <p className="text-sm text-red-500">{formErrors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin_code">{t("pin_code", lang)}</Label>
              <div className="flex space-x-2">
                <Input
                  id="pin_code"
                  type={visiblePinCodes["create"] ? "text" : "password"}
                  placeholder={t("enter_pin_code", lang)}
                  value={formPinCode}
                  onChange={(e) => {
                    // Only allow digits and limit to 6 characters
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                    setFormPinCode(value)
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => togglePinCodeVisibility("create")}>
                  {visiblePinCodes["create"] ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {formErrors.pinCode && <p className="text-sm text-red-500">{formErrors.pinCode}</p>}
            </div>

            {formType === "sub_account" && (
              <div className="space-y-2">
                <Label htmlFor="parent_account">{t("parent_account", lang)}</Label>
                <Select value={formParentId} onValueChange={setFormParentId} disabled={formType !== "sub_account"}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("select_parent_account", lang)} />
                  </SelectTrigger>
                  <SelectContent>
                    {parentAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.parentId && <p className="text-sm text-red-500">{formErrors.parentId}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
            <Button onClick={createAccount}>{t("create", lang)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("edit_transfer_account", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit_account_type">{t("account_type", lang)}</Label>
              <Select
                value={formType}
                onValueChange={(value) => {
                  setFormType(value)
                  // Reset parent ID when switching to main account
                  if (value === "main_account") {
                    setFormParentId("")
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("select_account_type", lang)} />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_account_username">{t("username", lang)}</Label>
              <Input
                id="edit_account_username"
                placeholder={t("enter_username", lang)}
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
              />
              {formErrors.username && <p className="text-sm text-red-500">{formErrors.username}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_password">{t("password", lang)}</Label>
              <div className="flex space-x-2">
                <Input
                  id="edit_password"
                  type={visiblePasswords["edit"] ? "text" : "password"}
                  placeholder={t("enter_password", lang)}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => togglePasswordVisibility("edit")}>
                  {visiblePasswords["edit"] ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {formErrors.password && <p className="text-sm text-red-500">{formErrors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_pin_code">{t("pin_code", lang)}</Label>
              <div className="flex space-x-2">
                <Input
                  id="edit_pin_code"
                  type={visiblePinCodes["edit"] ? "text" : "password"}
                  placeholder={t("enter_pin_code", lang)}
                  value={formPinCode}
                  onChange={(e) => {
                    // Only allow digits and limit to 6 characters
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                    setFormPinCode(value)
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => togglePinCodeVisibility("edit")}>
                  {visiblePinCodes["edit"] ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {formErrors.pinCode && <p className="text-sm text-red-500">{formErrors.pinCode}</p>}
            </div>

            {formType === "sub_account" && (
              <div className="space-y-2">
                <Label htmlFor="edit_parent_account">{t("parent_account", lang)}</Label>
                <Select value={formParentId} onValueChange={setFormParentId} disabled={formType !== "sub_account"}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("select_parent_account", lang)} />
                  </SelectTrigger>
                  <SelectContent>
                    {parentAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.parentId && <p className="text-sm text-red-500">{formErrors.parentId}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
            <Button onClick={updateAccount}>{t("update", lang)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("confirm_delete", lang)}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              {t("confirm_delete_account_prefix", lang)} <strong>{accountToDelete?.username}</strong>
              {t("confirm_delete_account_suffix", lang)}
            </p>
            {accountToDelete?.type === "main_account" && (
              <p className="text-red-500 mt-2">{t("warning_delete_main_account", lang)}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
            <Button variant="destructive" onClick={deleteAccount}>
              {t("delete", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {t("request_permission_prefix", lang)} {requestAction.charAt(0).toUpperCase() + requestAction.slice(1)}
              {selectedAccount ? ` "${selectedAccount.username}"` : t("request_permission_new_account", lang)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="request_message">{t("request_message", lang)}</Label>
              <Textarea
                id="request_message"
                placeholder={t("explain_permission_need", lang)}
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={4}
              />
              {requestMessage.length < 10 && (
                <p className="text-sm text-red-500">{t("message_min_length_error", lang)}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRequestDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
            <Button onClick={submitPermissionRequest} disabled={requestMessage.length < 10}>
              {t("submit_request", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}