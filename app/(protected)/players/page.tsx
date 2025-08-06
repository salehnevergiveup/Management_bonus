"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Edit, Trash, MoreHorizontal, Plus, Search, Upload, Download, AlertTriangle } from "lucide-react";
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
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

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

  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [filePreview, setFilePreview] = useState<Array<{ username: string; account: string }>>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isCheckingFormat, setIsCheckingFormat] = useState(false);
  const [failedImportInfo, setFailedImportInfo] = useState<{
    count: number;
    importTime: string | null;
  } | null>(null);
  const [showExportConfirmDialog, setShowExportConfirmDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const { lang, setLang } = useLanguage()

  // Import functions
  const handleImportClick = () => {
    if (!auth?.can("players:create")) {
      toast.error(t("no_permission_to_import", lang));
      return;
    }
    setImportDialogOpen(true);
  };

  const previewFile = async (file: File) => {
    setIsCheckingFormat(true);
    
    // Show format checking notification
    const checkingToast = toast.loading("Checking file format...", { 
      id: "format-checking",
      duration: Infinity 
    });
    
    try {
      const text = await file.text();
      
      // Small delay to make format checking visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const preview = parseCSV(text);
      
      if (preview.length > 0) {
        toast.success("Format check completed!", { id: "format-checking" });
        setFilePreview(preview.slice(0, 10)); // Show first 10 records
        setShowPreview(true);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to preview file", { 
        id: "format-checking" 
      });
    } finally {
      setIsCheckingFormat(false);
      // Ensure the toast is dismissed after a short delay
      setTimeout(() => {
        toast.dismiss("format-checking");
      }, 2000); // Dismiss after 2 seconds
    }
  };

  const confirmImport = (file: File) => {
    setShowPreview(false);
    setImportDialogOpen(false);
    startBackgroundImport(file);
  };

  const startBackgroundImport = async (file: File) => {
    try {
      const text = await file.text();
      const playersToImport = parseCSV(text);
      
      if (playersToImport.length === 0) {
        throw new Error(t("no_valid_records_found", lang));
      }

      // Check file size limit
      if (playersToImport.length > 10000) {
        throw new Error("File too large. Maximum 10,000 records allowed per import process. Please split your file into smaller chunks.");
      }

      // Show starting notification
      toast.success("Starting background import...", { id: "import-start" });

      // Call the fire and forget endpoint
      const response = await fetch("/api/players/bulk-import-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players: playersToImport }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start import");
      }

      const result = await response.json();
      
      // Show success message
      toast.success(result.message, { id: "import-start" });
      
      // Check for failed results after a delay
      setTimeout(() => {
        checkForFailedResults();
      }, 5000); // Wait 5 seconds for processing to complete
      
      // Refresh the players list after a short delay
      setTimeout(() => {
        fetchPlayers();
      }, 2000);

    } catch (error) {
      console.error("Error starting import:", error);
      toast.error(error instanceof Error ? error.message : t("import_failed", lang), { id: "import-start" });
    }
  };

  const checkForFailedResults = async () => {
    try {
      const response = await fetch("/api/players/import-results");
      if (response.ok) {
        const data = await response.json();
        if (data.failedRecords && data.failedRecords.length > 0) {
          setFailedImportInfo({
            count: data.failureCount,
            importTime: data.importTime
          });
        }
      }
    } catch (error) {
      console.error("Error checking for failed results:", error);
    }
  };

  const handleExportClick = () => {
    setShowExportConfirmDialog(true);
  };

  const exportFailedRecords = async () => {
    try {
      const response = await fetch("/api/players/export-failed");
      
      if (response.status === 404) {
        toast.error("There are currently no failed import records to export");
        return;
      }
      
      if (!response.ok) {
        throw new Error("Failed to export failed records");
      }

      const csvContent = await response.text();
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `failed_import_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Clear the failed import info after export
      setFailedImportInfo(null);
      setShowExportConfirmDialog(false);
      toast.success("Failed records exported and cleared successfully");
    } catch (error) {
      console.error("Error exporting failed records:", error);
      toast.error("Failed to export failed records");
    }
  };

  const parseCSV = (csvText: string): Array<{ username: string; account: string }> => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 1) {
      throw new Error(t("invalid_csv_format", lang));
    }

    const results: Array<{ username: string; account: string }> = [];
    const formatErrors: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      
      // Check if we have exactly 2 columns
      if (values.length !== 2) {
        formatErrors.push(`Line ${i + 1}: Expected 2 columns, found ${values.length}`);
        continue;
      }
      
      const username = values[0];
      const account = values[1];
      
      // Validate that both username and account are present
      if (!username || username === '') {
        formatErrors.push(`Line ${i + 1}: Missing username`);
        continue;
      }
      
      if (!account || account === '') {
        formatErrors.push(`Line ${i + 1}: Missing account`);
        continue;
      }
      
      // Check for duplicate usernames in the file
      const existingInFile = results.find(r => r.username.toLowerCase() === username.toLowerCase());
      if (existingInFile) {
        formatErrors.push(`Line ${i + 1}: Duplicate username "${username}"`);
        continue;
      }
      
      results.push({ username, account });
    }

    // If there are format errors, throw them all at once
    if (formatErrors.length > 0) {
      throw new Error(`Format validation failed:\n${formatErrors.join('\n')}`);
    }

    if (results.length === 0) {
      throw new Error(t("no_valid_records_found", lang));
    }

    return results;
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
    return new Date(dateString).toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
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
      <Breadcrumb items={[{ label: t("player_management", lang) }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{t("player_management", lang)}</CardTitle>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            {auth?.can("players:create") && (
              <>
                <Button 
                  onClick={handleCreate} 
                  className="w-full sm:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("create_player", lang)}
                </Button>
                <Button 
                  onClick={handleImportClick} 
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t("import_players", lang)}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                  onClick={handleExportClick}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Failed CSV
                </Button>
                {failedImportInfo && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                      Import: {failedImportInfo.importTime ? new Date(failedImportInfo.importTime).toLocaleString('en-US', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZoneName: 'short'
                      }) : 'Unknown'} • {failedImportInfo.count} failures
                    </div>
                  </div>
                )}
              </>
            )}
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => {
                setPageSize(Number(val));
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t("rows_per_page", lang)} />
              </SelectTrigger>
              <SelectContent>
              <SelectItem value="10">10 {t("rows", lang)}</SelectItem>
                <SelectItem value="20">20 {t("rows", lang)}</SelectItem>
                <SelectItem value="50">50 {t("rows", lang)}</SelectItem>
                <SelectItem value="100">100 {t("rows", lang)}</SelectItem>
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
                placeholder={t("search_players", lang)}
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
                  <TableHead>{t("username", lang)}</TableHead>
                  <TableHead>{t("transfer_account", lang)}</TableHead>
                  <TableHead>{t("created_at", lang)}</TableHead>
                  <TableHead>{t("updated_at", lang)}</TableHead>
                  {(auth?.can("players:edit") || auth?.can("players:delete")) && (
                    <TableHead className="text-right">{t("actions", lang)}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {t("loading_players", lang)}
                    </TableCell>
                  </TableRow>
                ) : paginatedPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {t("no_players_found", lang)}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPlayers.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">{player.account_username}</TableCell>
                      <TableCell>{player.transferAccount?.username || t("unknown", lang)}</TableCell>
                      <TableCell>{formatDate(player.created_at)}</TableCell>
                      <TableCell>{formatDate(player.updated_at)}</TableCell>
                      {(auth?.can("players:edit") || auth?.can("players:delete")) && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">{t("open_menu", lang)}</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {auth?.can("players:edit") && (
                                <DropdownMenuItem onClick={() => handleEdit(player)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  {t("edit", lang)}
                                </DropdownMenuItem>
                              )}
                              
                              {auth?.can("players:delete") && (
                                <DropdownMenuItem onClick={() => handleDelete(player)}>
                                  <Trash className="mr-2 h-4 w-4" />
                                  {t("delete", lang)}
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
              {`${t("showing", lang)} ${startItem} ${t("to", lang)} ${endItem} ${t("of", lang)} ${filteredPlayers.length} ${t("players", lang)}`}
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
                    {t("first", lang)}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(currentPage - 1)} 
                    disabled={isLoading || !hasPreviousPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    {t("previous", lang)}
                  </Button>
                  <span className="px-2 text-sm">
                  {`${t("page", lang)} ${currentPage} ${t("of", lang)} ${totalPages}`}
                  </span>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(currentPage + 1)} 
                    disabled={isLoading || !hasNextPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    {t("next", lang)}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(totalPages)} 
                    disabled={isLoading || !hasNextPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    {t("last", lang)}
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
            <DialogTitle>{t("create_player", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="account_username">{t("username", lang)}</Label>
              <Input 
                id="account_username" 
                placeholder={t("enter_username", lang)} 
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
              />
              {formErrors.username && (
                <p className="text-sm text-red-500">{formErrors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer_account_id">{t("transfer_account", lang)}</Label>
              <Select 
                value={formTransferAccountId} 
                onValueChange={setFormTransferAccountId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("select_transfer_account", lang)} />
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
              {t("cancel", lang)}
            </Button>
            <Button onClick={createPlayer}>{t("create", lang)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Player Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("edit_player", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit_account_username">{t("username", lang)}</Label>
              <Input 
                id="edit_account_username" 
                placeholder={t("enter_username", lang)} 
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
              />
              {formErrors.username && (
                <p className="text-sm text-red-500">{formErrors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_transfer_account_id">{t("transfer_account", lang)}</Label>
              <Select 
                value={formTransferAccountId} 
                onValueChange={setFormTransferAccountId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("select_transfer_account", lang)} />
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
              {t("cancel", lang)}
            </Button>
            <Button onClick={updatePlayer}>{t("update", lang)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={deletePlayer}
        title={t("confirm_delete", lang)}
        children={
          <>
            <p>{t("delete_player_confirmation", lang)}</p>
            <p className="mt-2">{t("action_cannot_be_undone", lang)}</p>
          </>
        }
        confirmText={t("delete", lang)}
      />

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {t("import_players", lang)}
              {isCheckingFormat && (
                <div className="flex items-center space-x-1 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span>Checking format...</span>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("csv_format_instructions", lang)}</Label>
              <div className="bg-gray-50 p-3 rounded-md text-sm">
                <p className="font-medium mb-2 text-red-600">⚠️ Important: No headers required!</p>
                <p className="mb-2">Format: <strong>username,account</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>First column: Player username</li>
                  <li>Second column: Transfer account username</li>
                  <li>No headers - start directly with data</li>
                  <li>One record per line</li>
                </ul>
                <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs font-medium text-blue-800 mb-1">Sample CSV format:</p>
                  <code className="text-xs text-blue-700">
                    CHANGE2010,FBTRANSFER01<br/>
                    LEE1234,FBTRANSFER01<br/>
                    BURAGAS88,FBTRANSFER01
                  </code>
                </div>
                <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                  <p className="text-xs font-medium text-yellow-800 mb-1">Validation checks:</p>
                  <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1">
                    <li>Exactly 2 columns per line</li>
                    <li>No empty usernames or accounts</li>
                    <li>No duplicate usernames in file</li>
                    <li>Transfer accounts must exist in system</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="csv_file">{t("select_csv_file", lang)}</Label>
              <Input
                id="csv_file"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                disabled={isCheckingFormat}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // First show preview
                    previewFile(file);
                  }
                }}
              />
              {isCheckingFormat && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Checking file format...</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>File Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-green-50 p-3 rounded-md">
              <p className="text-green-800 font-medium">✅ File format is valid!</p>
              <p className="text-sm text-green-700">Found {filePreview.length} records (showing first 10)</p>
            </div>
            
            <div className="space-y-2">
              <Label>Preview (first 10 records):</Label>
              <div className="max-h-60 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Account</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filePreview.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{record.username}</TableCell>
                        <TableCell>{record.account}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              const file = fileInputRef.current?.files?.[0];
              if (file) {
                confirmImport(file);
              }
            }}>
              Start Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Confirmation Dialog */}
      <Dialog open={showExportConfirmDialog} onOpenChange={setShowExportConfirmDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span>Export Failed Import Records</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-yellow-800 font-medium">⚠️ Important Notice</p>
                  <p className="text-sm text-yellow-700">
                    This export can only be performed <strong>once</strong>. After exporting, the failed records will be permanently deleted from the system.
                  </p>
                </div>
              </div>
            </div>
            
            {failedImportInfo && (
              <div className="space-y-3">
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                  <p className="text-blue-800 font-medium">📊 Export Summary</p>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>Failed Records:</strong> {failedImportInfo.count}</p>
                    <p><strong>Import Date:</strong> {failedImportInfo.importTime ? new Date(failedImportInfo.importTime).toLocaleString('en-US', { 
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      timeZoneName: 'short'
                    }) : 'Unknown'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowExportConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={exportFailedRecords}
              className="bg-red-600 hover:bg-red-700"
            >
              Continue & Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}