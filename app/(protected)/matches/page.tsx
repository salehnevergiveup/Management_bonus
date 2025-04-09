"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, RotateCcw, PlayCircle, Square, RefreshCw, CheckSquare, Filter } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AppColor, Roles, ProcessStatus } from "@/constants/enums";
import { hasPermission, createRequest, fetchRequests } from "@/lib/requstHandling";
import { RequestData } from "@/types/request-data.type";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import toast from "react-hot-toast";

interface TransferAccount {
  id: string;
  name: string;
}

interface Bonus {
  id: string;
  name: string;
}

interface Process {
  id: string;
  status: string;
}

interface Match {
  id: string;
  username: string;
  transfer_account_id: string | null;
  process_id: string;
  bonus_id: string;
  status: string; // pending, failed, success
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string | null;
  transfer_account: TransferAccount | null;
  process: Process;
  bonus: Bonus | null;
}

export default function MatchManagementPage() {
  const { auth, isLoading } = useUser();
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bonusFilter, setBonusFilter] = useState("all");
  const [availableBonuses, setAvailableBonuses] = useState<Bonus[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState("all");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<null | { match: Match; action: string }>(null);
  const router = useRouter();
  
  // Selected matches
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);

  // Permission related states
  const [permissionsMap, setPermissionsMap] = useState<Map<string, RequestData>>(new Map());
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestAction, setRequestAction] = useState("");
  const [requestProcessId, setRequestProcessId] = useState("");
  const [completePermission, setCompletePermission] = useState<{modelId: string, action: string} | null>(null);

  const fetchMatches = async () => {
    if (auth) {
      if (!auth.canAccess("matches")) {
        router.push("/dashboard");
        return;
      }
    }
    try {
      const response = await fetch("/api/matches?all=true");

      if (!response.ok) {
        throw new Error("Failed to fetch matches");
      }
      const data = await response.json();
      console.log(data.data);
      setMatches(data.data);
      
      // Extract unique bonuses from matches
      const bonuses = new Map<string, Bonus>();
      data.data.forEach((match: Match) => {
        if (match.bonus && match.bonus.id && !bonuses.has(match.bonus.id)) {
          bonuses.set(match.bonus.id, match.bonus);
        }
      });
      setAvailableBonuses(Array.from(bonuses.values()));
    } catch (error) {
      console.error("Error fetching matches:", error);
      toast.error("Failed to fetch matches");
    }
  };

  // Load accepted permission requests
  const loadPermissions = async () => {
    if (!auth) return;
    
    try {
      const map = await fetchRequests('Process', 'accepted');
      setPermissionsMap(map);
    } catch (error) {
      console.error("Error loading permissions:", error);
    }
  };

  // Complete a permission after use
  const markPermissionComplete = async (modelId: string, action: string) => {
    try {
      const key = `${modelId}:${action}`;
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

  useEffect(() => {
    if (!isLoading && auth) {
      fetchMatches();
      loadPermissions();
    }
  }, [isLoading, auth, router]);

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

  // Reset selections when tab changes
  useEffect(() => {
    setSelectedMatches([]);
    setSelectAllChecked(false);
  }, [activeTab, bonusFilter]);

  // Filter matches based on search term, status, bonus and tab
  useEffect(() => {
    let result = [...matches];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(match => 
        match.username.toLowerCase().includes(term) || 
        match.id.toLowerCase().includes(term) ||
        match.transfer_account?.name?.toLowerCase().includes(term) ||
        match.bonus?.name?.toLowerCase().includes(term) ||
        match.currency.toLowerCase().includes(term)
      );
    }

    // Filter by match status
    if (statusFilter !== "all") {
      result = result.filter(match => match.status === statusFilter);
    }

    // Filter by bonus
    if (bonusFilter !== "all") {
      result = result.filter(match => match.bonus_id === bonusFilter);
    }

    // Filter by tab - using transfer_account_id instead of player_id
    if (activeTab === "matched") {
      result = result.filter(match => match.transfer_account_id !== null);
    } else if (activeTab === "unmatched") {
      result = result.filter(match => match.transfer_account_id === null);
    }
    // "all" tab doesn't need filtering as it shows everything

    setFilteredMatches(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [matches, searchTerm, statusFilter, bonusFilter, activeTab]);

  // Paginate the matches
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
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
      case ProcessStatus.FAILED:
        return AppColor.ERROR;
      case ProcessStatus.PENDING:
        return AppColor.WARNING;
      default:
        return AppColor.INFO;
    }
  };

  const getMatchStatusColor = (status: string) => {
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

  const canShowProcessAction = (processStatus: string, action: string) => {
    switch (processStatus) {
      case ProcessStatus.PENDING:
        return (action === 'resume' || action === 'rematch' || action === 'terminate');
      case ProcessStatus.COMPLETED:
        return (action === 'rematch' || action === 'terminate');
      case ProcessStatus.PROCESSING:
        return false; // No actions while processing
      default:
        return false;
    }
  };
  
  const handleProcessAction = (process: { id: string, status: string }, action: string) => {
    // Check if user has permission for restricted actions (terminate)
    const needsPermission = (action === 'terminate') && 
                            auth?.role !== Roles.Admin;
    
    if (needsPermission && !hasPermission(permissionsMap, process.id, action)) {
      // Open request permission dialog
      setRequestAction(action);
      setRequestProcessId(process.id);
      setRequestMessage("");
      setRequestDialogOpen(true);
      return;
    }

    // If resume action with selected matches
    if (action === 'resume') {
      if (selectedMatches.length > 0) {
        setResumeDialogOpen(true);
      } else {
        toast.error("Please select at least one match to resume");
      }
      return;
    }

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

  // Handle checkbox selection
  const toggleMatchSelection = (matchId: string) => {
    setSelectedMatches(prevSelected => {
      if (prevSelected.includes(matchId)) {
        return prevSelected.filter(id => id !== matchId);
      } else {
        return [...prevSelected, matchId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectAllChecked) {
      setSelectedMatches([]);
    } else {
      const processMatches = paginatedMatches.map(match => match.id);
      setSelectedMatches(processMatches);
    }
    setSelectAllChecked(!selectAllChecked);
  };

  // Submit permission request
  const submitPermissionRequest = async () => {
    if (!auth || requestMessage.length < 10) return;
    
    try {
      const result = await createRequest(
        "Process",
        requestProcessId,
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
          // Include selected matches if any
          if (selectedMatches.length > 0) {
            body = { matchIds: selectedMatches };
            console.log("matches from the body")
            console.log(body);  
          } else {
            toast.error("No matches selected for resume action");
            return;
          }
          break;
        case 'rematch-process':
          endpoint = `/api/matches`;
          break;
        case 'rematch-single':
          endpoint = `/api/matches/${match.id}`;
          break;
        case 'terminate':
          endpoint = `/api/processes/${match.process_id}/terminate`;
          method = 'DELETE';
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

      // If this was a permission-based action, mark it as complete
      const needsPermission = (action === 'terminate');
      if (needsPermission && auth?.role !== Roles.Admin) {
        setCompletePermission({
          modelId: match.process_id,
          action: action.split('-')[0] // Extract base action name
        });
      }

      toast.success(`Successfully performed ${action.replace('-', ' ')} action`);
      fetchMatches(); // Refresh the data
      setSelectedMatches([]); // Clear selections
      setSelectAllChecked(false);
    } catch (error) {
      console.error(`Error during ${action}:`, error);
      toast.error(`Failed to perform ${action.replace('-', ' ')} action`);
    } finally {
      setConfirmDialogOpen(false);
      setResumeDialogOpen(false);
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
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={bonusFilter}
              onValueChange={setBonusFilter}
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

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedMatches.length} match{selectedMatches.length !== 1 ? 'es' : ''} selected
              </span>
              {selectedMatches.length > 0 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setSelectedMatches([]);
                    setSelectAllChecked(false);
                  }}
                >
                  Clear selection
                </Button>
              )}
            </div>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Players</TabsTrigger>
              <TabsTrigger value="matched">Matched Players</TabsTrigger>
              <TabsTrigger value="unmatched">Unmatched Players</TabsTrigger>
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
                Warning: This will terminate the entire process. All turnover data will be deleted and matches will be moved to the historical section.
              </p>
            )}
          </>
        }
        confirmText={selectedAction?.action 
          ? selectedAction.action.split('-')[0].charAt(0).toUpperCase() + selectedAction.action.split('-')[0].slice(1) 
          : 'Confirm'}
      />

      {/* Resume Dialog with Selected Matches */}
      <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Resume Process with Selected Matches</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedMatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No matches selected
                    </TableCell>
                  </TableRow>
                ) : (
                  matches
                    .filter(match => selectedMatches.includes(match.id))
                    .map(match => (
                      <TableRow key={match.id}>
                        <TableCell>{match.username}</TableCell>
                        <TableCell>{match.bonus?.name || "N/A"}</TableCell>
                        <TableCell>{formatCurrency(match.amount, match.currency)}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>Can
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResumeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Get a reference process match for the action
                const firstSelectedMatch = matches.find(match => selectedMatches.includes(match.id));
                if (firstSelectedMatch) {
                  setSelectedAction({ match: firstSelectedMatch, action: 'resume' });
                  executeAction();
                }
              }}
              disabled={selectedMatches.length === 0}
            >
              Resume with Selected Matches
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Request Permission to {requestAction.charAt(0).toUpperCase() + requestAction.slice(1)} Process
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Process ID</Label>
              <p className="font-medium">{requestProcessId}</p>
            </div>
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
                    {/* Only show buttons if process is not in PROCESSING state */}
                    {process.status !== ProcessStatus.PROCESSING && (
                      <>
                        {/* Resume button - only for PENDING */}
                        {canShowProcessAction(process.status, 'resume') && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleProcessAction(process, 'resume')}
                                disabled={selectedMatches.length === 0}
                              >
                                <PlayCircle className="h-4 w-4 mr-1" />
                                Resume
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Complete the pending process with selected matches</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        {/* Rematch button - for PENDING, SEM_COMPLETED, COMPLETED */}
                        {canShowProcessAction(process.status, 'rematch') && (
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
                              <p>Update the matched players for this process</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        {canShowProcessAction(process.status, 'terminate') && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-red-500 hover:text-red-700" 
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
                      </>
                    )}
                  </TooltipProvider>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {process.status !== ProcessStatus.PROCESSING && (
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectAllChecked}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                    )}
                    <TableHead>Username</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Transfer Account</TableHead>
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
                      <TableCell colSpan={process.status !== ProcessStatus.PROCESSING ? 10 : 9} className="h-24 text-center">
                        No matches found
                      </TableCell>
                    </TableRow>
                  ) : (
                    process.matches.map((match: Match) => (
                      <TableRow key={match.id}>
                        {process.status !== ProcessStatus.PROCESSING && (
                          <TableCell className="w-[50px]">
                            <Checkbox
                              checked={selectedMatches.includes(match.id)}
                              onCheckedChange={() => toggleMatchSelection(match.id)}
                              aria-label={`Select match ${match.id}`}
                              disabled={match.transfer_account_id === null}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{match.username}</TableCell>
                        <TableCell>{match.bonus?.name || "N/A"}</TableCell>
                        <TableCell>
                          {match.transfer_account_id ? (
                            <span className="font-medium">{match.transfer_account?.name || "Transfer Account"}</span>
                          ) : (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            color={match.transfer_account_id ? AppColor.SUCCESS : AppColor.WARNING}
                            text={match.transfer_account_id ? "Matched" : "Unmatched"}
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
                        {process.status !== ProcessStatus.PROCESSING && (
                        <TableCell className="text-right">
                          <TooltipProvider>
                            {match.transfer_account_id === null && (
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
                                  <p>Rematch this individual player</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
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