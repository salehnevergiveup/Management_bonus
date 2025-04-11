"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Eye, Filter } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/usercontext";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppColor } from "@/constants/enums";
import toast from "react-hot-toast";

interface TransferAccount {
  id: string;
  username: string;
}

interface Bonus {
  id: string;
  name: string;
}

interface UserProcess {
  id: string;
  status: string;
}

interface TransferHistory {
  id: string;
  username: string;
  process_id: string;
  status: string;
  amount: number; // Float
  currency: string; // String
  transfer_account_id: string | null;
  bonus_id: string;
  date_from: string;
  date_to: string;
  terminated_at: string;
  transfer_account: TransferAccount | null;
  process: UserProcess;
  bonus: Bonus | null;
}

export default function TransferHistoryPage() {
  const { auth, isLoading } = useUser();
  const [allHistory, setAllHistory] = useState<TransferHistory[]>([]);
  const [displayedHistory, setDisplayedHistory] = useState<TransferHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bonusFilter, setBonusFilter] = useState("all");
  const [fromDateFilter, setFromDateFilter] = useState<string>("");
  const [toDateFilter, setToDateFilter] = useState<string>("");
  const [availableBonuses, setAvailableBonuses] = useState<Bonus[]>([]);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<TransferHistory | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const router = useRouter();

  const fetchTransferHistory = async () => {
    if (auth) {
      if (!auth.canAccess("transfer-history")) {
        router.push("/dashboard");
        return;
      }
    }
    
    setIsLoadingData(true);
    
    try {
      // Request all data without filtering
      const response = await fetch("/api/transfer-history?limit=1000");

      if (!response.ok) {
        throw new Error("Failed to fetch transfer history");
      }
      
      const data = await response.json();
      setAllHistory(data.data);
      
      // Extract unique bonuses for filtering
      const bonuses = new Map<string, Bonus>();
      data.data.forEach((history: TransferHistory) => {
        if (history.bonus && history.bonus.id && !bonuses.has(history.bonus.id)) {
          bonuses.set(history.bonus.id, history.bonus);
        }
      });
      setAvailableBonuses(Array.from(bonuses.values()));
      
      // Initial filtering
      filterAndPaginateHistory(data.data, searchTerm, statusFilter, bonusFilter, fromDateFilter, toDateFilter, currentPage, pageSize);
    } catch (error) {
      console.error("Error fetching transfer history:", error);
      toast.error("Failed to fetch transfer history");
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (!isLoading && auth) {
      fetchTransferHistory();
    }
  }, [isLoading, auth, router]);

  // Filter and paginate history on the client-side
  const filterAndPaginateHistory = (
    history: TransferHistory[], 
    search: string, 
    status: string, 
    bonus: string,
    dateFrom: string,
    dateTo: string,
    page: number,
    size: number
  ) => {
    // Filter by all criteria
    let filtered = [...history];
    
    // Search term filter
    if (search.trim() !== "") {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(h => 
        h.username.toLowerCase().includes(searchLower) ||
        h.transfer_account?.username?.toLowerCase().includes(searchLower) ||
        h.process_id.toLowerCase().includes(searchLower) ||
        h.amount.toString().includes(searchLower) ||
        h.currency.toLowerCase().includes(searchLower) ||
        (h.bonus?.name && h.bonus.name.toLowerCase().includes(searchLower))
      );
    }
    
    // Status filter
    if (status !== "all") {
      filtered = filtered.filter(h => h.status.toLowerCase() === status.toLowerCase());
    }
    
    // Bonus filter
    if (bonus !== "all") {
      filtered = filtered.filter(h => h.bonus_id === bonus);
    }
    
    // Date filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(h => {
        const historyFrom = new Date(h.date_from);
        return historyFrom >= fromDate;
      });
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // Set to end of day
      filtered = filtered.filter(h => {
        const historyTo = new Date(h.date_to);
        return historyTo <= toDate;
      });
    }
    
    // Set total filtered items count
    setTotalItems(filtered.length);
    
    // Paginate results
    const startIndex = (page - 1) * size;
    setDisplayedHistory(filtered.slice(startIndex, startIndex + size));
  };

  // Re-filter whenever any filter changes
  useEffect(() => {
    filterAndPaginateHistory(
      allHistory, 
      searchTerm, 
      statusFilter, 
      bonusFilter, 
      fromDateFilter, 
      toDateFilter,
      currentPage, 
      pageSize
    );
  }, [
    searchTerm, 
    statusFilter, 
    bonusFilter, 
    fromDateFilter, 
    toDateFilter, 
    currentPage, 
    pageSize,
    allHistory
  ]);

  const viewDetails = (history: TransferHistory) => {
    setSelectedHistory(history);
    setDetailsDialogOpen(true);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setBonusFilter("all");
    setFromDateFilter("");
    setToDateFilter("");
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currency || 'USD'
      }).format(amount);
    } catch (error) {
      // If there's an error, fall back to a simpler format
      console.error(`Error formatting currency: ${error}`);
      return `${amount.toFixed(2)} ${currency || 'USD'}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return AppColor.SUCCESS;
      case "fail":
      case "failed":
        return AppColor.ERROR;
      case "pending":
        return AppColor.WARNING;
      default:
        return AppColor.INFO;
    }
  };

  // Calculate total pages for pagination
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: "Transfer History" }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Transfer History</CardTitle>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={bonusFilter}
              onValueChange={(value) => {
                setBonusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by bonus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bonuses</SelectItem>
                {availableBonuses.map(bonus => (
                  <SelectItem key={bonus.id} value={bonus.id}>
                    {bonus.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
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
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="20">20 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={fetchTransferHistory}
              disabled={isLoadingData}
            >
              {isLoadingData ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search history..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div>
                  <label htmlFor="from-date" className="text-sm font-medium">From Date:</label>
                  <Input
                    id="from-date"
                    type="date"
                    value={fromDateFilter}
                    onChange={(e) => {
                      setFromDateFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="to-date" className="text-sm font-medium">To Date:</label>
                  <Input
                    id="to-date"
                    type="date"
                    value={toDateFilter}
                    onChange={(e) => {
                      setToDateFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full"
                  />
                </div>
              </div>
              
              <Button variant="outline" onClick={resetFilters} className="mt-auto">
                <Filter className="mr-2 h-4 w-4" />
                Reset Filters
              </Button>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>From Date</TableHead>
                  <TableHead>To Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingData ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading history...
                    </TableCell>
                  </TableRow>
                ) : displayedHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No transfer history found
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedHistory.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell className="font-medium">{history.username}</TableCell>
                      <TableCell>{formatCurrency(history.amount, history.currency)}</TableCell>
                      <TableCell>{formatDate(history.date_from)}</TableCell>
                      <TableCell>{formatDate(history.date_to)}</TableCell>
                      <TableCell>
                        <Badge
                          color={getStatusColor(history.status)}
                          text={history.status}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => viewDetails(history)}>
                          <Eye className="h-4 w-4" />
                          <span className="ml-2">View</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{displayedHistory.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
              <span className="font-medium">
                {Math.min(currentPage * pageSize, totalItems)}
              </span>{" "}
              of <span className="font-medium">{totalItems}</span> records
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentPage(1)} 
                  disabled={!hasPreviousPage || isLoadingData}
                  size="sm"
                  className="h-8 px-2"
                >
                  First
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentPage(currentPage - 1)} 
                  disabled={!hasPreviousPage || isLoadingData}
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
                  onClick={() => setCurrentPage(currentPage + 1)} 
                  disabled={!hasNextPage || isLoadingData}
                  size="sm"
                  className="h-8 px-2"
                >
                  Next
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentPage(totalPages)} 
                  disabled={!hasNextPage || isLoadingData}
                  size="sm"
                  className="h-8 px-2"
                >
                  Last
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transfer History Details</DialogTitle>
          </DialogHeader>
          
          {selectedHistory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Username</p>
                  <p className="text-base font-medium">{selectedHistory.username}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Amount</p>
                  <p className="text-base font-medium">{formatCurrency(selectedHistory.amount, selectedHistory.currency)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <Badge
                    color={getStatusColor(selectedHistory.status)}
                    text={selectedHistory.status}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Bonus</p>
                  <p className="text-base font-medium">{selectedHistory.bonus?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">From Date</p>
                  <p className="text-base font-medium">{formatDate(selectedHistory.date_from)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">To Date</p>
                  <p className="text-base font-medium">{formatDate(selectedHistory.date_to)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Terminated At</p>
                  <p className="text-base font-medium">{formatDate(selectedHistory.terminated_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Transfer Account</p>
                  <p className="text-base font-medium">{selectedHistory.transfer_account?.username || "N/A"}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Process ID</p>
                <p className="text-base font-medium overflow-auto">{selectedHistory.process_id}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Currency</p>
                <p className="text-base font-medium">{selectedHistory.currency}</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}