"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, RotateCcw, PlayCircle, Square, RefreshCw } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/usercontext";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/dialog";
import { Badge } from "@/components/badge";
import { AppColor } from "@/constants/colors";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import toast from "react-hot-toast";

// Enum for process status
enum ProcessStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  SEM_COMPLETED = "sem-completed",
  FAILED = "failed"
}

interface Player {
  id: string;
  account_username: string;
}

interface Process {
  id: string;
  status: string;
}

interface Match {
  id: string;
  username: string;
  player_id: string | null;
  process_id: string;
  status: string; // success or fail
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  player: Player | null;
  process: Process;
}

export default function MatchManagementPage() {
  const { auth, isLoading } = useUser();
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState("all");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<null | { match: Match; action: string }>(null);
  const router = useRouter();

  const fetchMatches = async () => {
    if (auth) {
      if (!auth.canAccess("matches")) {
        router.push("/dashboard");
        return;
      }
    }
    try {
      // Fetch all matches at once for client-side pagination
      const response = await fetch("/api/matches?all=true");

      if (!response.ok) {
        throw new Error("Failed to fetch matches");
      }

      const data = await response.json();
      setMatches(data.data);
    } catch (error) {
      console.error("Error fetching matches:", error);
      toast.error("Failed to fetch matches");
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [isLoading, auth, router]);

  // Filter matches based on search term, status, and tab
  useEffect(() => {
    let result = [...matches];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(match => 
        match.username.toLowerCase().includes(term) || 
        match.id.toLowerCase().includes(term) ||
        match.player?.account_username?.toLowerCase().includes(term) ||
        match.currency.toLowerCase().includes(term)
      );
    }

    // Filter by match status
    if (statusFilter !== "all") {
      result = result.filter(match => match.status === statusFilter);
    }

    // Filter by tab
    if (activeTab === "matched") {
      result = result.filter(match => match.player_id !== null);
    } else if (activeTab === "unmatched") {
      result = result.filter(match => match.player_id === null);
    }
    // "all" tab doesn't need filtering as it shows everything

    setFilteredMatches(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [matches, searchTerm, statusFilter, activeTab]);

  // Paginate the matches - we'll apply pagination to the number of matches
  const paginatedMatches = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredMatches.slice(startIndex, startIndex + pageSize);
  }, [filteredMatches, currentPage, pageSize]);

  // Group matches by process for display purposes
  const groupedByProcess = useMemo(() => {
    const processMap = new Map();
    
    paginatedMatches.forEach(match => {
      if (!processMap.has(match.process_id)) {
        processMap.set(match.process_id, {
          id: match.process_id,
          status: match.process.status,
          matches: []
        });
      }
      
      const processGroup = processMap.get(match.process_id);
      processGroup.matches.push(match);
    });
    
    return Array.from(processMap.values());
  }, [paginatedMatches]);

  // Calculate pagination details
  const totalPages = Math.ceil(filteredMatches.length / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency 
    }).format(amount);
  };

  const getProcessStatusColor = (status: string) => {
    switch (status) {
      case ProcessStatus.PROCESSING:
        return AppColor.INFO;
      case ProcessStatus.COMPLETED:
        return AppColor.SUCCESS;
      case ProcessStatus.SEM_COMPLETED:
        return AppColor.WARNING;
      case ProcessStatus.FAILED:
        return AppColor.ERROR;
      case ProcessStatus.PENDING:
        return AppColor.WARNING;
      default:
    }
  };

  const getMatchStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return AppColor.SUCCESS;
      case "fail":
        return AppColor.ERROR;
      case "pending":
        return AppColor.WARNING;
      default:
    }
  };

  const handleProcessAction = (process: { id: string, status: string }, action: string) => {
    // Use the first match of the process as a reference
    const matchForProcess = matches.find(m => m.process_id === process.id);
    if (matchForProcess) {
      setSelectedAction({ match: matchForProcess, action });
      setConfirmDialogOpen(true);
    }
  };

  const handleSingleMatchAction = (match: Match, action: string) => {
    setSelectedAction({ match, action });
    setConfirmDialogOpen(true);
  };

  const canPerformProcessAction = (processStatus: string, action: string) => {
    switch (action) {
      case 'resume':
        return processStatus === ProcessStatus.PENDING;
      case 'restart':
        return processStatus === ProcessStatus.SEM_COMPLETED;
      case 'rematch':
        return processStatus !== ProcessStatus.PROCESSING;
      case 'terminate':
        return processStatus !== ProcessStatus.PROCESSING;
      break
    }
  };

  const executeAction = async () => {
    if (!selectedAction) return;

    const { match, action } = selectedAction;
    try {
      let endpoint = '';
      let method = 'POST';
      let body = {};

      switch (action) {
        case 'resume':
          endpoint = `/api/processes/${match.process_id}/resume`;
          break;
        case 'rematch-process':
          endpoint = `/api/processes/${match.process_id}/rematch`;
          break;
        case 'rematch-single':
          endpoint = `/api/matches/${match.id}/rematch`;
          break;
        case 'terminate':
          endpoint = `/api/processes/${match.process_id}/terminate`;
          method = 'PUT';
          break;
        case 'restart':
          endpoint = `/api/processes/${match.process_id}/restart`;
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} match`);
      }

      toast.success(`Successfully performed ${action.replace('-', ' ')} action`);
      fetchMatches(); // Refresh the data
    } catch (error) {
      console.error(`Error during ${action}:`, error);
      toast.error(`Failed to perform ${action.replace('-', ' ')} action`);
    } finally {
      setConfirmDialogOpen(false);
      setSelectedAction(null);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: "Match Management" }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Match Management</CardTitle>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="fail">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
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
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search matches..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Users</TabsTrigger>
              <TabsTrigger value="matched">Matched Users</TabsTrigger>
              <TabsTrigger value="unmatched">Unmatched Users</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              {renderTable()}
            </TabsContent>

            <TabsContent value="matched" className="mt-0">
              {renderTable()}
            </TabsContent>

            <TabsContent value="unmatched" className="mt-0">
              {renderTable()}
            </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{filteredMatches.length > 0 ? 1 + (currentPage - 1) * pageSize : 0}</span> to{" "}
              <span className="font-medium">
                {Math.min(currentPage * pageSize, filteredMatches.length)}
              </span>{" "}
              of <span className="font-medium">{filteredMatches.length}</span> matches
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => goToPage(1)} 
                  disabled={!hasPreviousPage}
                  size="sm"
                  className="h-8 px-2"
                >
                  First
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => goToPage(currentPage - 1)} 
                  disabled={!hasPreviousPage}
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
                  onClick={() => goToPage(currentPage + 1)} 
                  disabled={!hasNextPage}
                  size="sm"
                  className="h-8 px-2"
                >
                  Next
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => goToPage(totalPages)} 
                  disabled={!hasNextPage}
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

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={executeAction}
        title={`Confirm ${selectedAction?.action?.replace('-', ' ') || ''}`}
        children={
          <>
            <p>Are you sure you want to {selectedAction?.action?.replace('-', ' ')} this {selectedAction?.action?.includes('process') ? 'process' : 'match'}?</p>
            {selectedAction?.action === 'terminate' && (
              <p className="mt-2 text-red-500">
                Warning: This will terminate the entire process.
              </p>
            )}
          </>
        }
        confirmText={selectedAction?.action 
          ? selectedAction.action.split('-')[0].charAt(0).toUpperCase() + selectedAction.action.split('-')[0].slice(1) 
          : 'Confirm'}
      />
    </div>
  );

  // Helper function to render the table with process grouping
  function renderTable() {
    return (
      <div className="space-y-8">
        {groupedByProcess.map(process => (
          <div key={process.id} className="rounded-md border overflow-hidden">
            <div className="bg-gray-50 p-4 border-b">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium">Process ID: {process.id}</h3>
                  <div className="flex items-center mt-1 space-x-2">
                    <Badge
                      color={getProcessStatusColor(process.status)}
                      text={process.status}
                    />
                    <span className="text-xs text-gray-500">
                      {process.matches.length} match{process.matches.length !== 1 ? 'es' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <TooltipProvider>
                    {canPerformProcessAction(process.status, 'resume') && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleProcessAction(process, 'resume')}
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Complete the pending process</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {canPerformProcessAction(process.status, 'restart') && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleProcessAction(process, 'restart')}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restart
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Rerun the process for failed matches</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {canPerformProcessAction(process.status, 'rematch') && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleProcessAction(process, 'rematch-process')}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Rematch All
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Update the matched users for this process</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {canPerformProcessAction(process.status, 'terminate') && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleProcessAction(process, 'terminate')}
                          >
                            <Square className="h-4 w-4 mr-1" />
                            Terminate
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>End the process entirely</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TooltipProvider>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Match Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Updated At</TableHead>
                    {process.status !== ProcessStatus.PROCESSING && (<TableHead className="text-right">Actions</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {process.matches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No matches found
                      </TableCell>
                    </TableRow>
                  ) : (
                    process.matches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell className="font-medium">{match.username}</TableCell>
                        <TableCell>
                          <Badge
                            color={match.player_id ? AppColor.SUCCESS : AppColor.WARNING}
                            text={match.player_id ? "Matched" : "Unmatched"}
                          />
                        </TableCell>
                        <TableCell>{formatCurrency(match.amount, match.currency)}</TableCell>
                        <TableCell>
                          <Badge
                            color={getMatchStatusColor(match.status)}
                            text={match.status}
                          />
                        </TableCell>
                        <TableCell>{formatDate(match.created_at)}</TableCell>
                        <TableCell>{formatDate(match.updated_at)}</TableCell>
                        {match.player_id === null && process.status !== ProcessStatus.PROCESSING && (
                        <TableCell className="text-right">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleSingleMatchAction(match, 'rematch-single')}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Rematch this individual user</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                        </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
        
        {groupedByProcess.length === 0 && (
          <div className="text-center py-8">
            <p>No matches found.</p>
          </div>
        )}
      </div>
    );
  }
}