"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, DollarSign, RefreshCw, Download, FileText } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/usercontext";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

interface ExportBatch {
  batchNumber: number;
  startIndex: number;
  endIndex: number;
  exported: boolean;
  exportedAt?: string;
}

const EXPORT_LIMIT = 1000; // Batch size: 1,000 records per batch
const QUICK_EXPORT_LIMIT = 20000; // Quick export: 20,000 records max

export default function AccountTurnoverPage() {
  const { auth, isLoading } = useUser();
  const [accountTurnovers, setAccountTurnovers] = useState<AccountTurnover[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [exchangeRatesDialogOpen, setExchangeRatesDialogOpen] = useState(false);
  const [createMatchDialogOpen, setCreateMatchDialogOpen] = useState(false);
  const [csvExportDialogOpen, setCsvExportDialogOpen] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState("");
  const [bonusDetailsDialogOpen, setBonusDetailsDialogOpen] = useState(false);
  const [selectedBonusDetails, setSelectedBonusDetails] = useState<Bonus | null>(null);
  const [exportBatches, setExportBatches] = useState<ExportBatch[]>([]);
  const [selectedBatchForExport, setSelectedBatchForExport] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();
  const { lang, setLang } = useLanguage();

  // Form state for edit
  const [formUsername, setFormUsername] = useState("");
  const [formGame, setFormGame] = useState("");
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

  // Calculate export batches based on filtered data
  const calculateExportBatches = useMemo(() => {
    const totalRecords = filteredTurnovers.length;
    const batches: ExportBatch[] = [];
    
    for (let i = 0; i < totalRecords; i += EXPORT_LIMIT) {
      const batchNumber = Math.floor(i / EXPORT_LIMIT) + 1;
      const startIndex = i;
      const endIndex = Math.min(i + EXPORT_LIMIT - 1, totalRecords - 1);
      
      batches.push({
        batchNumber,
        startIndex,
        endIndex,
        exported: false
      });
    }
    
    return batches;
  }, [filteredTurnovers]);

  // Update export batches when calculated batches change
  useEffect(() => {
    setExportBatches(prev => {
      const newBatches = calculateExportBatches.map(newBatch => {
        const existingBatch = prev.find(b => b.batchNumber === newBatch.batchNumber);
        return existingBatch || newBatch;
      });
      return newBatches;
    });
  }, [calculateExportBatches]);

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

  // CSV Export Functions
  const convertToCSV = (data: AccountTurnover[]): string => {
    const headers = ['ID', 'Username', 'Game', 'Currency', 'Turnover', 'Process ID', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...data.map(turnover => [
        turnover.id,
        `"${turnover.username}"`,
        `"${turnover.game}"`,
        turnover.currency,
        turnover.turnover,
        turnover.process_id,
        new Date(turnover.createdAt).toISOString()
      ].join(','))
    ].join('\n');
    
    return csvContent;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportBatch = async (batchNumber: number) => {
    const batch = exportBatches.find(b => b.batchNumber === batchNumber);
    if (!batch) {
      toast.error("Batch not found");
      return;
    }

    setIsExporting(true);
    try {
      const batchData = filteredTurnovers.slice(batch.startIndex, batch.endIndex + 1);
      const csvContent = convertToCSV(batchData);
      const filename = `account_turnovers_batch_${batchNumber}_${new Date().toISOString().split('T')[0]}.csv`;
      
      downloadCSV(csvContent, filename);
      
      // Mark batch as exported
      setExportBatches(prev => prev.map(b => 
        b.batchNumber === batchNumber 
          ? { ...b, exported: true, exportedAt: new Date().toISOString() }
          : b
      ));
      
      toast.success(`Batch ${batchNumber} exported successfully (${batchData.length} records)`);
    } catch (error) {
      console.error("Error exporting batch:", error);
      toast.error("Failed to export batch");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = async () => {
    if (filteredTurnovers.length > QUICK_EXPORT_LIMIT) {
      // Export first 20k records, then suggest batch for remaining
      const firstBatch = filteredTurnovers.slice(0, QUICK_EXPORT_LIMIT);
      const remaining = filteredTurnovers.length - QUICK_EXPORT_LIMIT;
      
      const csvContent = convertToCSV(firstBatch);
      const filename = `account-turnovers-${new Date().toISOString().split('T')[0]}-first-20k.csv`;
      downloadCSV(csvContent, filename);
      
      if (remaining > 0) {
        toast.success(`Exported first ${QUICK_EXPORT_LIMIT.toLocaleString()} records. ${remaining} records remaining - use batch export.`);
      }
      return;
    }

    setIsExporting(true);
    try {
      const csvContent = convertToCSV(filteredTurnovers);
      const filename = `account_turnovers_all_${new Date().toISOString().split('T')[0]}.csv`;
      
      downloadCSV(csvContent, filename);
      toast.success(`All ${filteredTurnovers.length} records exported successfully`);
    } catch (error) {
      console.error("Error exporting all data:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
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

  const handleOpenCsvExport = () => {
    setCsvExportDialogOpen(true);
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
              onClick={handleOpenCsvExport} 
              className="w-full sm:w-auto"
              variant="outline"
              disabled={filteredTurnovers.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {t("export_csv", lang)}
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
                <SelectItem value="5">5 {t("row", lang)}</SelectItem>
                <SelectItem value="10">10 {t("row", lang)}</SelectItem>
                <SelectItem value="20">20 {t("row", lang)}</SelectItem>
                <SelectItem value="50">50 {t("row", lang)}</SelectItem>
                <SelectItem value="100">100 {t("row", lang)}</SelectItem>
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
            
            {filteredTurnovers.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {t("total_records", lang)}: <span className="font-medium">{filteredTurnovers.length}</span>
              </div>
            )}
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
                    {t("showing", lang)} <span className="font-medium">{startItem}</span> {t("to", lang)}{" "}
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
                    {t("page", lang)} {currentPage} {t("of", lang)} {totalPages}
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

      {/* CSV Export Dialog */}
      <Dialog open={csvExportDialogOpen} onOpenChange={setCsvExportDialogOpen}>
        <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("export_csv", lang)}
            </DialogTitle>
            <DialogDescription>
              {t("export_description", lang)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {filteredTurnovers.length > QUICK_EXPORT_LIMIT && (
              <Alert>
                <AlertDescription>
                  {t("large_dataset_warning", lang)} {filteredTurnovers.length} {t("records_found", lang)}. 
                  {t("batch_export_recommended", lang)} {EXPORT_LIMIT.toLocaleString()} {t("records_per_batch", lang)}.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quick Export */}
              <div className="space-y-3">
                <h3 className="font-medium">{t("quick_export", lang)}</h3>
                <div className="space-y-2">
                  <Button 
                    onClick={handleExportAll}
                    disabled={isExporting}
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {filteredTurnovers.length > QUICK_EXPORT_LIMIT 
                      ? `${t("export_first", lang)} ${QUICK_EXPORT_LIMIT.toLocaleString()} ${t("records", lang)}`
                      : `${t("export_all_records", lang)} (${filteredTurnovers.length})`
                    }
                  </Button>
                  {filteredTurnovers.length > QUICK_EXPORT_LIMIT && (
                    <p className="text-xs text-muted-foreground">
                      {t("exporting_first", lang)} {QUICK_EXPORT_LIMIT.toLocaleString()} {t("records", lang)}. {t("use_batch_for_remaining", lang)} {filteredTurnovers.length - QUICK_EXPORT_LIMIT} {t("records", lang)}.
                    </p>
                  )}
                </div>
              </div>

              {/* Batch Export */}
              <div className="space-y-3">
                <h3 className="font-medium">{t("batch_export", lang)}</h3>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {exportBatches.map((batch) => (
                      <div 
                        key={batch.batchNumber} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {t("batch", lang)} {batch.batchNumber}
                            </span>
                            {batch.exported && (
                              <Badge color="success" text={t("exported", lang)} />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {t("records", lang)} {batch.startIndex + 1} - {batch.endIndex + 1} 
                            ({batch.endIndex - batch.startIndex + 1} {t("items", lang)})
                          </p>
                          {batch.exported && batch.exportedAt && (
                            <p className="text-xs text-muted-foreground">
                              {t("exported_on", lang)} {formatDate(batch.exportedAt)}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleExportBatch(batch.batchNumber)}
                          disabled={isExporting}
                          variant={batch.exported ? "outline" : "default"}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          {batch.exported ? t("re_export", lang) : t("export", lang)}
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCsvExportDialogOpen(false)}
            >
              {t("close", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Existing dialogs remain the same */}
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

    </div>
  );
}