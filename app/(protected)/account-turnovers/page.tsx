"use client";

import { useState, useEffect, useMemo } from "react";
import { Edit, Trash, MoreHorizontal, Plus, Search, DollarSign, RefreshCw, Info } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/usercontext";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import toast from "react-hot-toast";
import { useLanguage } from "@app/contexts/LanguageContext";
import { t } from "@app/lib/i18n";


interface AccountTurnover {
  id: string;
  username: string;
  game: string;
  currency: string;
  turnover: string;
  process_id: string; 
  createdAt: string;
}

interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  createdAt: string;
}

interface Bonus {
  id: string;
  name: string;
  description: string;
}

export default function AccountTurnoverPage() {
  const { auth, isLoading } = useUser();
  const [accountTurnovers, setAccountTurnovers] = useState<AccountTurnover[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [turnoverToDelete, setTurnoverToDelete] = useState<AccountTurnover | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTurnover, setSelectedTurnover] = useState<AccountTurnover | null>(null);
  const [exchangeRatesDialogOpen, setExchangeRatesDialogOpen] = useState(false);
  const [createMatchDialogOpen, setCreateMatchDialogOpen] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState("");
  const [bonusDetailsDialogOpen, setBonusDetailsDialogOpen] = useState(false);
  const [selectedBonusDetails, setSelectedBonusDetails] = useState<Bonus | null>(null);
  const router = useRouter();
  const { lang, setLang } = useLanguage()

  // Form state for edit
  const [formUsername, setFormUsername] = useState("");
  const [formGame, setFormGame] = useState("");
  const [formCurrency, setFormCurrency] = useState("");
  const [formTurnover, setFormTurnover] = useState("");
  const [formErrors, setFormErrors] = useState<{ username?: string; game?: string }>({});

  // Filter turnovers on the client side
  const filteredTurnovers = useMemo(() => {
    if (!searchTerm) return accountTurnovers;
    
    return accountTurnovers.filter(turnover => 
      turnover.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      turnover.game.toLowerCase().includes(searchTerm.toLowerCase()) ||
      turnover.currency.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [accountTurnovers, searchTerm]);

  // Calculate pagination
  const paginatedTurnovers = useMemo(() => {
    if (showAll) {
      return filteredTurnovers;
    }
    
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTurnovers.slice(startIndex, startIndex + pageSize);
  }, [filteredTurnovers, currentPage, pageSize, showAll]);

  const totalPages = useMemo(() => 
    showAll ? 1 : Math.max(1, Math.ceil(filteredTurnovers.length / pageSize)), 
    [filteredTurnovers, pageSize, showAll]
  );

  // Handle page size change including "show all" option
  const handlePageSizeChange = (value: string) => {
    if (value === "all") {
      setShowAll(true);
    } else {
      setShowAll(false);
      setPageSize(Number(value));
    }
    setCurrentPage(1);
  };

  // Ensure current page is valid when data or page size changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const fetchAccountTurnovers = async () => {
    if (auth) {
      if (!auth.canAccess("account-turnovers")) {
        router.push("/dashboard");
        return;
      }
    }
    try {
      const response = await fetch(`/api/account-turnovers?all=true`);
  
      if (!response.ok) {
        throw new Error("Failed to fetch account turnovers");
      }
  
      const data = await response.json();
      setAccountTurnovers(data.data.accountTurnovers);
      setExchangeRates(data.data.exchangeRates);
      
      // Log process IDs for debugging
      if (data.data.accountTurnovers && data.data.accountTurnovers.length > 0) {
        console.log("Process IDs:", data.data.accountTurnovers.map((t: any) => t.process_id));
      }
    } catch (error) {
      console.error("Error fetching account turnovers:", error);
      toast.error("Failed to fetch account turnovers");
    }
  };

  const fetchBonuses = async () => {
    try {
      const response = await fetch(`/api/bonuses?all=true`);

      if (!response.ok) {
        throw new Error("Failed to fetch bonuses");
      }

      const data = await response.json();
      setBonuses(data?.data || []);
    } catch (error) {
      console.error("Error fetching bonuses:", error);
      toast.error("Failed to fetch bonuses");
    }
  };

  useEffect(() => {
    if (!isLoading && auth) {
      fetchAccountTurnovers();
      fetchBonuses();
    }
  }, [isLoading, auth, router]);

  // Reset to first page when search term or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const validateForm = () => {
    const errors: { username?: string; game?: string } = {};
    
    if (!formUsername || formUsername.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }
    
    if (!formGame) {
      errors.game = "Game is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateAccountTurnover = async () => {
    if (!selectedTurnover || !validateForm()) return;

    try {
      const updateData: Record<string, any> = {
        username: formUsername,
        game: formGame,
        currency: formCurrency,
        turnover: formTurnover
      };

      const response = await fetch(`/api/account-turnovers/${selectedTurnover.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update account turnover");
      }

      toast.success("Account turnover updated successfully");
      
      setFormUsername("");
      setFormGame("");
      setFormCurrency("");
      setFormTurnover("");
      setEditDialogOpen(false);
      fetchAccountTurnovers();
    } catch (error) {
      console.error("Error updating account turnover:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update account turnover");
    }
  };

  const deleteAccountTurnover = async () => {
    if (!turnoverToDelete) return;

    try {
      const response = await fetch(`/api/account-turnovers/${turnoverToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete account turnover");
      }

      toast.success("Account turnover deleted successfully");
      fetchAccountTurnovers();
    } catch (error) {
      console.error("Error deleting account turnover:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete account turnover");
    } finally {
      setDeleteDialogOpen(false);
      setTurnoverToDelete(null);
    }
  };

  const createMatch = async () => {
    if (!selectedBonus) {
      toast.error("Please select a bonus method");
      return;
    }

    try {
      let processId = null;
      
      if (accountTurnovers && accountTurnovers.length > 0) {
        const turnoverWithProcessId = accountTurnovers.find(t => t.process_id);
        if (turnoverWithProcessId) {
          processId = turnoverWithProcessId.process_id;
        }
      }
      
      if (!processId) {
        throw new Error("Process ID not found")
      }
    
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bonus_id: selectedBonus,
          process_id: processId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create match");
      }

      if (data.warning) {
        toast.error(data.warning);
        setSelectedBonus("");
        setCreateMatchDialogOpen(false);
        return;
      }

      toast.success(data.message || "Match created successfully");
      setSelectedBonus("");
      setCreateMatchDialogOpen(false);
    } catch (error) {
      console.error("Error creating match:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create match");
    }
  };

  const handleViewExchangeRates = () => {
    setExchangeRatesDialogOpen(true);
  };

  const handleCreateMatch = () => {
    setSelectedBonus("");
    setCreateMatchDialogOpen(true);
  };

  const handleViewBonusDetails = (bonus: Bonus) => {
    setSelectedBonusDetails(bonus);
    setBonusDetailsDialogOpen(true);
  };

  const handleEdit = (turnover: AccountTurnover) => {
    setSelectedTurnover(turnover);
    setFormUsername(turnover.username);
    setFormGame(turnover.game);
    setFormCurrency(turnover.currency);
    setFormTurnover(turnover.turnover);
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleDelete = (turnover: AccountTurnover) => {
    setTurnoverToDelete(turnover);
    setDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Client-side pagination navigation - no API requests
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  // Truncate text with ellipsis for display in table
  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Calculate pagination display values
  const startItem = filteredTurnovers.length === 0 ? 0 : showAll ? 1 : (currentPage - 1) * pageSize + 1;
  const endItem = showAll ? filteredTurnovers.length : Math.min(currentPage * pageSize, filteredTurnovers.length);
  const hasPreviousPage = !showAll && currentPage > 1;
  const hasNextPage = !showAll && currentPage < totalPages;

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: t("account_turnover_management", lang)}]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{t("account_turnover_management", lang)}</CardTitle>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <Button 
              onClick={handleViewExchangeRates} 
              className="w-full sm:w-auto"
              variant="outline"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              {t("view_exchange_rates", lang)}
            </Button>
            <Button 
              onClick={handleCreateMatch} 
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("create_match", lang)}
            </Button>
            <Button 
              onClick={fetchAccountTurnovers} 
              className="w-full sm:w-auto"
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("refresh", lang)}
            </Button>
            <Select
              value={showAll ? "all" : pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Rows per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5  {t("row", lang)}</SelectItem>
                <SelectItem value="10">10  {t("row", lang)}</SelectItem>
                <SelectItem value="20">20  {t("row", lang)}</SelectItem>
                <SelectItem value="50">50  {t("row", lang)}</SelectItem>
                <SelectItem value="all">Show All</SelectItem>
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
                placeholder={t("search_turnovers", lang)}
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
                  <TableHead>{t("game", lang)}</TableHead>
                  <TableHead>{t("currency", lang)}</TableHead>
                  <TableHead>{t("turnover", lang)}</TableHead>
                  <TableHead>{t("created_at", lang)}</TableHead>
                  <TableHead className="text-right">{t("actions", lang)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                    {t("loading_turnovers", lang)}
                    </TableCell>
                  </TableRow>
                ) : paginatedTurnovers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                    {t("no_turnovers", lang)}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTurnovers.map((turnover) => (
                    <TableRow key={turnover.id}>
                      <TableCell className="font-medium">{turnover.username}</TableCell>
                      <TableCell>{turnover.game}</TableCell>
                      <TableCell>{turnover.currency}</TableCell>
                      <TableCell>{turnover.turnover? Number(turnover.turnover).toFixed(2) : "N/A"}</TableCell>
                      <TableCell>{turnover.createdAt ? formatDate(turnover.createdAt) : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(turnover)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t("edit", lang)}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(turnover)}>
                              <Trash className="mr-2 h-4 w-4" />
                              {t("delete", lang)}
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

          {filteredTurnovers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                {showAll ? (
                  <>{t("showing_all", lang)} <span className="font-medium">{filteredTurnovers.length}</span> {t("account_turnovers", lang)}</>
                ) : (
                  <>
                     {t("showing", lang)}  <span className="font-medium">{startItem}</span> {t("to", lang)}{" "}{" "}
                    <span className="font-medium">{endItem}</span>{" "}
                    {t("of", lang)} <span className="font-medium">{filteredTurnovers.length}</span> {t("account_turnovers", lang)}
                  </>
                )}
              </div>
              
              {!showAll && totalPages > 1 && (
                <div className="flex items-center space-x-2 w-full sm:w-auto justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(1)} 
                    disabled={!hasPreviousPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    {t("first", lang)}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(currentPage - 1)} 
                    disabled={!hasPreviousPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    {t("previous", lang)}
                  </Button>
                  <span className="px-2 text-sm">
                  {t("page", lang)}{currentPage} {t("of", lang)} {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(currentPage + 1)} 
                    disabled={!hasNextPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    {t("next", lang)}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(totalPages)} 
                    disabled={!hasNextPage}
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

      {/* Dialog components remain the same */}
      {/* Exchange Rates Dialog */}
      <Dialog open={exchangeRatesDialogOpen} onOpenChange={setExchangeRatesDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t("exchange_rates", lang)}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("from_currency", lang)}</TableHead>
                    <TableHead>{t("to_currency", lang)}</TableHead>
                    <TableHead>{t("rate", lang)}</TableHead>
                    <TableHead>{t("created_at", lang)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exchangeRates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                      {t("no_exchange_rates", lang)}
                      </TableCell>
                    </TableRow>
                  ) : (
                    exchangeRates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell>{rate.fromCurrency}</TableCell>
                        <TableCell>{rate.toCurrency}</TableCell>
                        <TableCell>{rate.rate}</TableCell>
                        <TableCell>{formatDate(rate.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setExchangeRatesDialogOpen(false)}>{t("close", lang)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Match Dialog */}
      <Dialog open={createMatchDialogOpen} onOpenChange={setCreateMatchDialogOpen}>
        <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t("create_match", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bonus">{t("select_bonus_method", lang)}</Label>
              <Select 
                value={selectedBonus} 
                onValueChange={setSelectedBonus}
              >
                <SelectTrigger id="bonus">
                  <SelectValue placeholder={t("select_bonus_method", lang)} />
                </SelectTrigger>
                <SelectContent>
                  {bonuses.map((bonus) => (
                    <SelectItem key={bonus.id} value={bonus.id}>
                      {bonus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* List of all available bonuses */}
            <div className="space-y-2 mt-4">
              <Label>{t("available_bonus_methods", lang)}</Label>
              <ScrollArea className="h-[250px]">
                <div className="rounded-md border w-full">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-2/5">{t("name", lang)}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t("description", lang)}</TableHead>
                        <TableHead className="w-20 text-right">{t("action", lang)}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bonuses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center">
                          {t("no_bonus_methods", lang)}
                          </TableCell>
                        </TableRow>
                      ) : (
                        bonuses.map((bonus) => (
                          <TableRow key={bonus.id} className={selectedBonus === bonus.id ? "bg-muted/50" : ""}>
                            <TableCell className="font-medium">
                              <div className="truncate max-w-[120px] sm:max-w-full">
                                {bonus.name}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {truncateText(bonus.description, 40)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => handleViewBonusDetails(bonus)}
                              >
                                 {t("details", lang)}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter className="mt-4 sm:mt-6">
            <Button type="button" variant="outline" onClick={() => setCreateMatchDialogOpen(false)}>
            {t("cancel", lang)}
            </Button>
            <Button onClick={createMatch} disabled={!selectedBonus}>{t("confirm", lang)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bonus Details Dialog */}
      <Dialog open={bonusDetailsDialogOpen} onOpenChange={setBonusDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-hidden p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl break-words">{selectedBonusDetails?.name || t("bonus_details", lang)}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4 mt-4">
            <div className="py-2 space-y-2">
              <div className="text-sm whitespace-pre-wrap p-4 border rounded-md bg-muted/30">
                {selectedBonusDetails?.description || t("no_description", lang)}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4 pt-2 border-t">
            <Button 
              onClick={() => setBonusDetailsDialogOpen(false)} 
              className="w-full sm:w-auto"
            >
              {t("close", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Turnover Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("edit_account_turnover", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit_username">{t("username", lang)}</Label>
              <Input 
                id="edit_username" 
                placeholder={t("enter_username", lang)}
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
              />
              {formErrors.username && (
                <p className="text-sm text-red-500">{formErrors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_game">{t("game", lang)}</Label>
              <Input 
                id="edit_game" 
                placeholder={t("enter_game", lang)}
                value={formGame}
                onChange={(e) => setFormGame(e.target.value)}
              />
              {formErrors.game && (
                <p className="text-sm text-red-500">{formErrors.game}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_currency">{t("currency", lang)}</Label>
              <Input 
                id="edit_currency" 
                placeholder={t("enter_currency", lang)}
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_turnover">{t("turnover", lang)}</Label>
              <Input 
                id="edit_turnover" 
                placeholder={t("enter_turnover", lang)}
                value={formTurnover}
                onChange={(e) => setFormTurnover(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
            {t("cancel", lang)}
            </Button>
            <Button onClick={updateAccountTurnover}> {t("update", lang)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={deleteAccountTurnover}
        title={t("confirm_delete", lang)}
        children={
          <>
            <p>{t("delete_warning", lang)}</p>
            <p className="mt-2">{t("delete_irreversible", lang)}</p>
          </>
        }
        confirmText={t("delete", lang)}
      />
    </div>
  );
}