"use client";

import { useState, useEffect, useMemo, useRef } from "react";  // Added useRef
import { Search, RotateCcw, PlayCircle, Square, RefreshCw, CheckSquare, Filter, Edit , CheckCircle, PauseCircle } from "lucide-react";
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
import { AppColor, Roles, ProcessStatus, Events } from "@/constants/enums";  // Added Events
import { hasPermission, createRequest, fetchRequests } from "@/lib/requstHandling";
import { RequestData } from "@/types/request-data.type";
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import toast from "react-hot-toast";
import CreateMatchDialog from "@components/create-match-dialog";

interface TransferAccount {
  id: string;
  username: string;
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
  game: string;
  turnover_id: string;
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
  
// State for updating match amount and status
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [matchToEdit, setMatchToEdit] = useState<Match | null>(null);
const [newAmount, setNewAmount] = useState("");
const [newStatus, setNewStatus] = useState("");
const [amountError, setAmountError] = useState("");

  // Added state for real-time updates
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Selected matches
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);

  const [refilterDialogOpen, setRefilterDialogOpen] = useState(false);
  const [selectedBonusId, setSelectedBonusId] = useState<string>("");
  const [createMatchDialogOpen, setCreateMatchDialogOpen] = useState(false)

  // Permission related states
  const [permissionsMap, setPermissionsMap] = useState<Map<string, RequestData>>(new Map());
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestAction, setRequestAction] = useState("");
  const [requestProcessId, setRequestProcessId] = useState("");
  const [completePermission, setCompletePermission] = useState<{modelId: string, action: string} | null>(null);
  const { lang, setLang } = useLanguage()

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
      // Load both Process and Match permissions
      const processPermissions = await fetchRequests('Process', 'accepted');
      const matchPermissions = await fetchRequests('Match', 'accepted');
      
      // Combine the maps
      const combinedMap = new Map([...processPermissions, ...matchPermissions]);
      setPermissionsMap(combinedMap);
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

// Setup SSE for real-time updates
// Setup SSE for real-time updates
useEffect(() => {
  // Close any existing connection
  if (eventSourceRef.current) {
    eventSourceRef.current.close();
  }

  

  // Initialize SSE connection
  eventSourceRef.current = new EventSource('/api/events');
  
  // Listen for match status updates
  eventSourceRef.current.addEventListener(Events.MATCHES_STATUS, (event) => {
    try {
      console.log("Event received from SSE");
      const data = JSON.parse(event.data);
      console.log("Status update data:", data);
      
      // Handle match updates - note we're using data.id not data.matchId
      if (data.id) {
        updateSingleMatch(data);
      }
      

    } catch (error) {
      console.error("Error handling status update:", error);
    }
  });
  
  // Clean up function
  return () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };
}, []); // Empty dependency array so it only runs once

// Update a single match when receiving real-time update
const updateSingleMatch = (data: any) => {
  if (!data || !data.id) {
    console.log("Invalid update data received:", data);
    return;
  }
  
  console.log(`Attempting to update match ID: ${data.id}`);
  
  setMatches(prevMatches => {
    // Find the match index
    const matchIndex = prevMatches.findIndex(match => match.id === data.id);
    
    // If match not found, return unchanged state
    if (matchIndex === -1) {
      console.log(`No match found with ID: ${data.id}`);
      return prevMatches;
    }
    
    // Log the update details
    console.log(`Updating match ${data.id} status from ${prevMatches[matchIndex].status} to ${data.status || prevMatches[matchIndex].status}`);
    
    // Create a copy of the matches array
    const newMatches = [...prevMatches];
    
    // Update the specific match
    newMatches[matchIndex] = {
      ...newMatches[matchIndex],
      status: data.status !== undefined ? data.status : newMatches[matchIndex].status,
      transfer_account: data.transferAccount !== undefined ? data.transferAccount : newMatches[matchIndex].transfer_account,
      transfer_account_id: data.transferAccount?.id !== undefined ? data.transferAccount.id : newMatches[matchIndex].transfer_account_id,
      updated_at: data.updated_at || new Date().toISOString()
    };
    
    return newMatches;
  });
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
        match.transfer_account?.username?.toLowerCase().includes(term) ||
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
    if (pageSize === -1) { // Show all matches
      return filteredMatches;
    }
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
      case ProcessStatus.SUCCESS:
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
  
  // Update the handleProcessAction function to include the new actions
  const handleProcessAction = (process: { id: string, status: string }, action: string) => {
    if (action === 'mark-success') {
      if (!isAllMatchesSuccess(process.id)) {
        toast.error("All matches must have 'success' status to mark the process as success");
        return;
      }
      
      const matchForProcess = matches.find(m => m.process_id === process.id);
      if (matchForProcess) {
        setSelectedAction({ 
          match: matchForProcess, 
          action: 'mark-success' 
        });
        setConfirmDialogOpen(true);
      }
      return;
    }
    
    // Add this section for the mark-onhold action
    if (action === 'mark-onhold') {
      const matchForProcess = matches.find(m => m.process_id === process.id);
      if (matchForProcess) {
        setSelectedAction({ 
          match: matchForProcess, 
          action: 'mark-onhold' 
        });
        setConfirmDialogOpen(true);
      }
      return;
    }

    // Add this section for refiltering (already in your code, included for completeness)
    if (action === 'refilter-process') {
      // Get all non-success matches for this process
      const nonSuccessMatches = matches.filter(m => 
        m.process_id === process.id && m.status.toLowerCase() !== "success"
      );
      
      if (nonSuccessMatches.length === 0) {
        toast.error("No eligible matches found for refiltering");
        return;
      }
      
      // Use the first match of the process as a reference
      const matchForProcess = nonSuccessMatches[0];
      if (matchForProcess) {
        setSelectedAction({ 
          match: matchForProcess, 
          action: 'refilter-process' 
        });
        setSelectedBonusId(""); // Reset selected bonus
        setRefilterDialogOpen(true);
      }
      return;
    }
    
    // Check if user has permission for restricted actions (terminate) If user not admin
    const needsPermission = (action === 'terminate') && 
                            auth?.role !== Roles.Admin;

                            
    if (needsPermission && !hasPermission(permissionsMap, process.id, action)) {
      // Open request permission dialog
      console.log("admin");
      setRequestAction(action);
      setRequestProcessId(process.id);
      setRequestMessage("");
      setRequestDialogOpen(true);
      return;
    } else if (action === 'terminate') {
      const matchForProcess = matches.find(m => m.process_id === process.id);
      if (matchForProcess) {
        setSelectedAction({ 
          match: matchForProcess, 
          action: 'terminate' 
        });
        setConfirmDialogOpen(true);
      }
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
    
    // If rematch process action
    if (action === 'rematch-process') {
      // Get all unmatched players for this process
      const unmatchedMatches = matches.filter(m => 
        m.process_id === process.id && m.transfer_account_id === null
      );
      
      if (unmatchedMatches.length === 0) {
        toast.error("No unmatched players found for this process");
        return;
      }
      
      // Use the first match of the process as a reference
      const matchForProcess = matches.find(m => m.process_id === process.id);
      if (matchForProcess) {
        setSelectedAction({ 
          match: matchForProcess, 
          action: 'rematch-process' 
        });
        setConfirmDialogOpen(true);
      }
      return;
    }
  };
  const handleSingleMatchAction = (match: Match, action: string) => {
    setSelectedAction({ match, action });
    setConfirmDialogOpen(true);
  };

  // Handle checkbox selection
  const toggleMatchSelection = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    
    if (match && (match.status.toLowerCase() === "success" || match.transfer_account_id === null)) {
      return;
    }
    
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
      const validMatches = paginatedMatches
        .filter(match => 
          match.status.toLowerCase() !== "success" && 
          match.transfer_account_id !== null
        )
        .map(match => match.id);
      
      setSelectedMatches(validMatches);
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
      let method = '';
      let body = {};
  
      switch (action) {
        case 'resume':
          endpoint = `/api/processes/${match.process_id}/resume`;
          if (selectedMatches.length > 0) {
            // Get full match data for selected matches
            const selectedMatchData: any[] = matches
              .filter(m => 
                selectedMatches.includes(m.id) && 
                m.transfer_account_id !== null && 
                m.status.toLowerCase() !== "success"
              )
              .map(m => ({
                id: m.id,
                username: m.username,
                transfer_account_id: m.transfer_account_id,
                transfer_account: m.transfer_account,
                amount: m.amount,
                currency: m.currency,
                bonus_id: m.bonus_id
              }));
              
            if (selectedMatchData.length === 0) {
              toast.error("No valid matches selected for resume action");
              return;
            }
            body = { matches: selectedMatchData };
            method = 'POST';
          } else {
            toast.error("No matches selected for resume action");
            return;
          }
          break;

        case 'mark-success':
          endpoint = `/api/processes/${match.process_id}/success`;
          method = 'PUT';
          break;

        case 'mark-onhold':
          endpoint = `/api/processes/${match.process_id}/on-hold`;
          method = 'PUT';
          break;

        case 'refilter-single':
          endpoint = `/api/matches/refilter/${match.id}`;
          method = 'PUT';
          body = { bonus_id: match.bonus_id}; 
          break;

        case 'refilter-process':
          endpoint = `/api/matches/refilter`;
          method = 'PUT';
          body = { bonus_id: selectedBonusId}; 
          break;

        case 'rematch-process':
          endpoint = `/api/matches/rematch`;
          method = 'PUT';
          break;
          
        case 'rematch-single':
          endpoint = `/api/matches/rematch/${match.id}`;
          method = 'PUT';
          break;
          
        case 'terminate':
          endpoint = `/api/processes/${match.process_id}/terminate`;
          method = 'POST';
          break;
      }
      
      if (!endpoint || !method) {
        console.error("Invalid action configuration:", { action, endpoint, method });
        return;
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
    setRefilterDialogOpen(false);
    setResumeDialogOpen(false);
    setSelectedAction(null);
    setSelectedBonusId("");
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle edit action for match amount and status
const handleEdit = (match: Match) => {
  const hasDirectPermission = auth?.role === Roles.Admin || auth?.can("matches:edit");
  
  const hasAcceptedRequest = hasPermission(permissionsMap, match.id, "edit");
  
  if (hasDirectPermission || hasAcceptedRequest) {
    setMatchToEdit(match);
    setNewAmount("");
    setNewStatus(""); 
    setAmountError("");
    setEditDialogOpen(true);
  } else {
    setMatchToEdit(match);
    setNewAmount(""); 
    setNewStatus(""); 
    setAmountError("");
    setRequestAction("edit");
    setRequestMessage("");
    setEditDialogOpen(true);
  }
};

// Update match amount and status
const updateMatch = async () => {
  if (!matchToEdit) return;
  
  // Check if any field is being updated
  if (!newAmount && !newStatus) {
    toast.error("Please update either the amount or status");
    return;
  }
  
  // Initialize the update data object
  const updateData: { amount?: number; status?: string } = {};
  
  // Add amount to update data if provided and not empty
  if (newAmount.trim() !== '') {
    // Validate the amount
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      setAmountError("Please enter a valid positive amount");
      return;
    }status
    updateData.amount = amount;
  }
  
  // Add status to update data if provided
  if (newStatus) {
    updateData.status = newStatus;
  }

  console.log("stats is " +  newStatus.repeat(100))
  
  try {
    const response = await fetch(`/api/matches/${matchToEdit.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update match");
    }
    
    // If this was a permission-based edit, mark it as complete
    if (!auth?.can("matches:edit") && hasPermission(permissionsMap, matchToEdit.id, "edit")) {
      setCompletePermission({
        modelId: matchToEdit.id,
        action: "edit"
      });
    }
    
    toast.success("Match updated successfully");
    setEditDialogOpen(false);
    fetchMatches(); // Refresh the data
  } catch (error) {
    console.error("Error updating match:", error);
    toast.error(error instanceof Error ? error.message : "Failed to update match");
  }
};

  // Submit permission request for match changes
  const submitMatchChangeRequest = async () => {
    if (!matchToEdit || (!newAmount.trim() && !newStatus) || !auth || requestMessage.length < 10) {
      toast.error("Please update either amount or status and provide a reason");
      return;
    }
    
    try {
      // Build a descriptive message about what's being changed
      let changeDescription = "Request to change match: ";
      
      // Add amount change details if amount is being changed and not empty
      if (newAmount.trim() !== '') {
        const parsedAmount = parseFloat(newAmount);
        // Validate amount
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          setAmountError("Please enter a valid positive amount");
          return;
        }
        
        changeDescription += `Amount from ${matchToEdit.amount} to ${newAmount} ${matchToEdit.currency}`;
        
        // Add comma if both fields are changing
        if (newStatus) {
          changeDescription += ", ";
        }
      }
      
      // Add status change details if status is being changed
      if (newStatus) {
        changeDescription += `Status from ${matchToEdit.status} to ${newStatus}`;
      }
      
      // Add the reason
      changeDescription += `. Reason: ${requestMessage}`;
      
      const result = await createRequest(
        "Match",
        matchToEdit.id,
        "edit",
        changeDescription,
        auth.id
      );
      
      if (result.success) {
        toast.success("Permission request submitted successfully");
        setEditDialogOpen(false);
      } else {
        toast.error(result.error || "Failed to submit request");
      }
    } catch (error) {
      console.error("Error submitting permission request:", error);
      toast.error("Failed to submit permission request");
    }
  };

  const isAllMatchesSuccess = (processId: string): boolean => {
    const processMatches = matches.filter(match => match.process_id === processId);
    
    if (processMatches.length === 0) {
      return false;
    }
    
    return processMatches.every(match => match.status.toLowerCase() === 'success');
  };

  const canShowProcessAction = (processStatus: string, action: string) => {
    switch (processStatus) {
      case ProcessStatus.PENDING:
        return (action === 'resume' || action === 'rematch' || action === 'terminate' || 
                action === 'refilter' || action === 'mark-success' || action === 'mark-onhold');
      case ProcessStatus.SUCCESS:
        return (action === 'rematch' || action === 'terminate' || action === 'refilter');
      case ProcessStatus.PROCESSING:
        return (action === 'terminate' || action === 'mark-onhold'); 
      default:
        return false;
    }
  };
  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: t("match_management", lang) }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{t("match_management", lang)}</CardTitle>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("filter_by_status", lang)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_statuses", lang)}</SelectItem>
                <SelectItem value="success">{t("success", lang)}</SelectItem>
                <SelectItem value="failed">{t("failed", lang)}</SelectItem>
                <SelectItem value="onhold ">{t("onhold", lang)}</SelectItem>
                <SelectItem value="pending">{t("pending", lang)}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={bonusFilter} onValueChange={setBonusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("filter_by_bonus", lang)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_bonuses", lang)}</SelectItem>
                {availableBonuses.map((bonus) => (
                  <SelectItem key={bonus.id} value={bonus.id}>
                    {bonus.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                <SelectItem value="10">10 {t("rows", lang)}</SelectItem>
                <SelectItem value="20">20 {t("rows", lang)}</SelectItem>
                <SelectItem value="50">50 {t("rows", lang)}</SelectItem>
                <SelectItem value="100">100 {t("rows", lang)}</SelectItem>
                <SelectItem value="-1">{t("all_rows", lang)}</SelectItem>
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
                placeholder={t("search_matches", lang)}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedMatches.length} {t("match", lang)}
                {selectedMatches.length !== 1 ? t("es", lang) : ""} {t("selected", lang)}
              </span>
              {selectedMatches.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedMatches([])
                    setSelectAllChecked(false)
                  }}
                >
                  {t("clear_selection", lang)}
                </Button>
              )}
            </div>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">{t("all_players", lang)}</TabsTrigger>
              <TabsTrigger value="matched">{t("matched_players", lang)}</TabsTrigger>
              <TabsTrigger value="unmatched">{t("unmatched_players", lang)}</TabsTrigger>
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
              {t("showing", lang)}{" "}
              <span className="font-medium">{filteredMatches.length > 0 ? 1 + (currentPage - 1) * pageSize : 0}</span>{" "}
              {t("to", lang)}{" "}
              <span className="font-medium">
                {pageSize === -1 ? filteredMatches.length : Math.min(currentPage * pageSize, filteredMatches.length)}
              </span>{" "}
              {t("of", lang)} <span className="font-medium">{filteredMatches.length}</span> {t("matches", lang)}
            </div>

            {totalPages > 1 && pageSize !== -1 && (
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
                  onClick={() => {
                    if (currentPage < totalPages) {
                      goToPage(currentPage + 1)
                    }
                  }}
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
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={executeAction}
        title={t("confirm", lang) + " " + (selectedAction?.action?.replace("-", " ") || "")}
        children={
          <>
            {selectedAction?.action === "rematch-process" ? (
              <div className="space-y-3">
                <p>{t("all_unmatched_users_matched", lang)}</p>
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                  <p className="text-sm text-yellow-800">{t("rematch_process_description", lang)}</p>
                </div>
              </div>
            ) : selectedAction?.action === "terminate" ? (
              <div className="space-y-3">
                <p>{t("confirm_terminate_process", lang)}</p>
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <p className="text-sm text-red-800">{t("terminate_process_warning", lang)}</p>
                </div>
              </div>
            ) : selectedAction?.action === "mark-success" ? (
              <div className="space-y-3">
                <p>{t("confirm_mark_success", lang)}</p>
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-sm text-green-800">{t("mark_success_description", lang)}</p>
                </div>
              </div>
            ) : selectedAction?.action === "mark-onhold" ? (
              <div className="space-y-3">
                <p>{t("confirm_put_on_hold", lang)}</p>
                <div className="bg-amber-50 p-3 rounded border border-amber-200">
                  <p className="text-sm text-amber-800">{t("mark_onhold_description", lang)}</p>
                </div>
              </div>
            ) : selectedAction?.action === "refilter-single" ? (
              <div className="space-y-3">
                <p>{t("confirm_refilter_match", lang)}</p>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm text-blue-800">
                    {t("refilter_match_description_1", lang) + " "}
                    <strong>{selectedAction?.match.bonus?.name || t("unknown", lang)}</strong>
                    {t("refilter_match_description_2", lang)}
                  </p>
                </div>
              </div>
            ) : (
              <p>
                {t("confirm_action_1", lang) +
                  " " +
                  (selectedAction?.action?.replace("-", " ") || "") +
                  " " +
                  t("confirm_action_2", lang) +
                  " " +
                  (selectedAction?.action?.includes("process") ? t("process", lang) : t("match", lang)) +
                  "?"}
              </p>
            )}
          </>
        }
        confirmText={selectedAction?.action ? t(selectedAction.action.split("-")[0], lang) : t("confirm", lang)}
      />

      {/* Resume Dialog with Selected Matches */}
      <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("resume_process_with_selected", lang)}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("username", lang)}</TableHead>
                  <TableHead>{t("bonus", lang)}</TableHead>
                  <TableHead>{t("amount", lang)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedMatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      {t("no_matches_selected", lang)}
                    </TableCell>
                  </TableRow>
                ) : (
                  matches
                    .filter((match) => selectedMatches.includes(match.id))
                    .map((match) => (
                      <TableRow key={match.id}>
                        <TableCell>{match.username}</TableCell>
                        <TableCell>{match.bonus?.name || t("not_available", lang)}</TableCell>
                        <TableCell>{formatCurrency(match.amount, match.currency)}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResumeDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
            <Button
              onClick={() => {
                // Get a reference process match for the action
                const firstSelectedMatch = matches.find((match) => selectedMatches.includes(match.id))
                if (firstSelectedMatch) {
                  setSelectedAction({ match: firstSelectedMatch, action: "resume" })
                  executeAction()
                }
              }}
              disabled={selectedMatches.length === 0}
            >
              {t("resume_with_selected", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/*create match dialog*/}
      <CreateMatchDialog
        isOpen={createMatchDialogOpen}
        onClose={() => setCreateMatchDialogOpen(false)}
        isRequest={auth?.role != Roles.Admin}
        processId={matches[0]?.process_id || ""}
        onSuccess={fetchMatches}
      />

      {/* Permission Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {t("request_permission_to_1", lang) +
                " " +
                requestAction.charAt(0).toUpperCase() +
                requestAction.slice(1) +
                " " +
                t("request_permission_to_2", lang)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("process_id", lang)}</Label>
              <p className="font-medium">{requestProcessId}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="request_message">{t("reason_for_request", lang)}</Label>
              <Textarea
                id="request_message"
                placeholder={t("explain_permission_need", lang)}
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={4}
              />
              {requestMessage.length < 10 && requestMessage.length > 0 && (
                <p className="text-sm text-red-500">{t("provide_detailed_explanation", lang)}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRequestDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
            <Button onClick={submitPermissionRequest} disabled={!requestMessage || requestMessage.length < 10}>
              {t("submit_request", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Match Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {auth?.can("matches:edit") || hasPermission(permissionsMap, matchToEdit?.id || "", "edit")
                ? t("edit_match_details", lang)
                : t("request_to_edit_match", lang)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("username", lang)}</Label>
              <p className="font-medium">{matchToEdit?.username}</p>
            </div>
            <div className="space-y-2">
              <Label>{t("current_amount", lang)}</Label>
              <p className="font-medium">
                {matchToEdit ? formatCurrency(matchToEdit.amount, matchToEdit.currency) : ""}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_amount">{t("new_amount_optional", lang)}</Label>
              <Input
                id="new_amount"
                type="number"
                step="0.01"
                placeholder={t("leave_empty_keep_current", lang)}
                value={newAmount}
                onChange={(e) => {
                  setNewAmount(e.target.value)
                  setAmountError("")
                }}
              />
              {amountError && <p className="text-sm text-red-500">{amountError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_status">{t("status", lang)}</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("select_status", lang)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t("pending", lang)}</SelectItem>
                  <SelectItem value="success">{t("success", lang)}</SelectItem>
                  <SelectItem value="onhold ">{t("onhold", lang)}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* If user doesn't have permission and is requesting */}
            {!auth?.can("matches:edit") &&
              auth?.role !== Roles.Admin &&
              !hasPermission(permissionsMap, matchToEdit?.id || "", "edit") && (
                <div className="space-y-2">
                  <Label htmlFor="request_message">{t("reason_for_request", lang)}</Label>
                  <Textarea
                    id="request_message"
                    placeholder={t("explain_change_need", lang)}
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    rows={4}
                  />
                  {requestMessage.length < 10 && requestMessage.length > 0 && (
                    <p className="text-sm text-red-500">{t("provide_detailed_explanation", lang)}</p>
                  )}
                </div>
              )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
            {auth?.role === Roles.Admin ||
            auth?.can("matches:edit") ||
            hasPermission(permissionsMap, matchToEdit?.id || "", "edit") ? (
              <Button
                onClick={updateMatch}
                disabled={(!newStatus && !newAmount) || (!!newAmount && amountError !== "")}
              >
                {t("update_match", lang)}
              </Button>
            ) : (
              <Button
                onClick={submitMatchChangeRequest}
                disabled={
                  (!newStatus && !newAmount) || requestMessage.length < 10 || (!!newAmount && amountError !== "")
                }
              >
                {t("submit_request", lang)}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refilter Dialog for Process */}
      <Dialog open={refilterDialogOpen} onOpenChange={setRefilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("refilter_process_with_bonus", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bonus_select">{t("select_bonus", lang)}</Label>
              <Select value={selectedBonusId} onValueChange={setSelectedBonusId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("select_a_bonus", lang)} />
                </SelectTrigger>
                <SelectContent>
                  {availableBonuses.map((bonus) => (
                    <SelectItem key={bonus.id} value={bonus.id}>
                      {bonus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBonusId && (
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>{t("warning", lang)}:</strong> {t("refilter_warning_1", lang) + " "}
                  <strong>{availableBonuses.find((b) => b.id === selectedBonusId)?.name || t("selected", lang)}</strong>
                  {t("refilter_warning_2", lang)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRefilterDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
            <Button
              onClick={() => {
                if (selectedAction && selectedBonusId) {
                  executeAction()
                }
              }}
              disabled={!selectedBonusId}
            >
              {t("refilter_process", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  // Helper function to render the table with process grouping
  function renderTable() {
    return (
      <div className="space-y-8">
        {groupedByProcess.map((process) => (
          <div key={process.id} className="rounded-md border overflow-hidden">
            <div className="bg-gray-50 p-4 border-b">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium">
                    {t("process_id", lang)}: {process.id}
                  </h3>
                  <div className="flex items-center mt-1 space-x-2">
                    <Badge color={getProcessStatusColor(process.status)} text={process.status} />
                    <span className="text-xs text-gray-500">
                      {process.matches.length} {t("match", lang)}
                      {process.matches.length !== 1 ? t("es", lang) : ""}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <TooltipProvider>
                    {/* Only show buttons if process is not in PROCESSING state */}
                    {process.status !== ProcessStatus.PROCESSING && (
                      <>
                        {/* Resume button - only for PENDING */}
                        {canShowProcessAction(process.status, "resume") && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProcessAction(process, "resume")}
                                disabled={
                                  !selectedMatches.some((id) => {
                                    const match = matches.find((m) => m.id === id)
                                    return (
                                      match &&
                                      match.status.toLowerCase() !== "success" &&
                                      match.transfer_account_id !== null
                                    )
                                  })
                                }
                              >
                                <PlayCircle className="h-4 w-4 mr-1" />
                                {t("resume", lang)}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("complete_pending_process", lang)}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/*create match request button*/}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setCreateMatchDialogOpen(true)}>
                              <PlayCircle className="h-4 w-4 mr-1" />
                              {t("create_match", lang)}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {auth?.role == Roles.Admin
                                ? t("admin_create_match_tooltip", lang)
                                : t("user_create_match_tooltip", lang)}
                            </p>
                          </TooltipContent>
                        </Tooltip>

                        {/* Rematch button - for PENDING, SEM_COMPLETED, COMPLETED */}
                        {canShowProcessAction(process.status, "rematch") && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProcessAction(process, "rematch-process")}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                {t("rematch_all", lang)}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("update_matched_players", lang)}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Add Refilter All button */}
                        {canShowProcessAction(process.status, "rematch") && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProcessAction(process, "refilter-process")}
                              >
                                <Filter className="h-4 w-4 mr-1" />
                                {t("refilter_all", lang)}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("refilter_all_players", lang)}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Mark as Success button */}
                        {canShowProcessAction(process.status, "mark-success") && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-500 hover:text-green-700"
                                onClick={() => handleProcessAction(process, "mark-success")}
                                disabled={!isAllMatchesSuccess(process.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {t("mark_success", lang)}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("mark_success_tooltip", lang)}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Mark as On Hold button */}
                        {canShowProcessAction(process.status, "mark-onhold") && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-amber-500 hover:text-amber-700"
                                onClick={() => handleProcessAction(process, "mark-onhold")}
                              >
                                <PauseCircle className="h-4 w-4 mr-1" />
                                {t("on_hold", lang)}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("on_hold_tooltip", lang)}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Updated Terminate button with improved tooltip */}
                        {canShowProcessAction(process.status, "terminate") && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleProcessAction(process, "terminate")}
                              >
                                <Square className="h-4 w-4 mr-1" />
                                {t("terminate", lang)}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("terminate_tooltip", lang)}</p>
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
                          aria-label={t("select_all", lang)}
                        />
                      </TableHead>
                    )}
                    <TableHead>{t("username", lang)}</TableHead>
                    <TableHead>{t("bonus", lang)}</TableHead>
                    <TableHead>{t("game", lang)}</TableHead>
                    <TableHead>{t("transfer_account", lang)}</TableHead>
                    <TableHead>{t("match_status", lang)}</TableHead>
                    <TableHead>{t("amount", lang)}</TableHead>
                    <TableHead>{t("status", lang)}</TableHead>
                    {process.status !== ProcessStatus.PROCESSING && (
                      <TableHead className="text-right">{t("actions", lang)}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {process.matches.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={process.status !== ProcessStatus.PROCESSING ? 10 : 9}
                        className="h-24 text-center"
                      >
                        {t("no_matches_found", lang)}
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
                              aria-label={t("select_match_id", lang) + " " + match.id}
                              disabled={match.transfer_account_id === null || match.status.toLowerCase() === "success"}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{match.username}</TableCell>
                        <TableCell>{match.bonus?.name || t("not_available", lang)}</TableCell>
                        <TableCell>{match?.game}</TableCell>
                        <TableCell>
                          {match.transfer_account_id ? (
                            <span className="font-medium">
                              {match.transfer_account?.username || t("transfer_account", lang)}
                            </span>
                          ) : (
                            <span className="text-gray-400">{t("not_assigned", lang)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            color={match.transfer_account_id ? AppColor.SUCCESS : AppColor.WARNING}
                            text={match.transfer_account_id ? t("matched", lang) : t("unmatched", lang)}
                          />
                        </TableCell>
                        <TableCell>{formatCurrency(match.amount, match.currency)}</TableCell>
                        <TableCell>
                          <Badge color={getMatchStatusColor(match.status)} text={match.status} />
                        </TableCell>
                        {process.status !== ProcessStatus.PROCESSING && (
                          <TableCell className="text-right">
                            <TooltipProvider>
                              {match.transfer_account_id === null && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSingleMatchAction(match, "rematch-single")}
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t("rematch_individual_player", lang)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {match.status.toLowerCase() !== "success" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEdit(match)}
                                      className="mr-1"
                                    >
                                      <Edit className="h-4 w-4" />
                                      {/* Add text to button if user has permission but isn't admin */}
                                      {(!auth?.can("matches:edit") || auth?.role !== "admin") &&
                                        hasPermission(permissionsMap, match.id, "edit") && (
                                          <span className="ml-1 text-xs">{t("execute", lang)}</span>
                                        )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {auth?.role === "admin" || auth?.can("matches:edit")
                                        ? t("edit_match_details", lang)
                                        : hasPermission(permissionsMap, match.id, "edit")
                                          ? t("execute_permitted_edit", lang)
                                          : t("request_to_edit_match", lang)}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {/* Add Refilter button (for all non-success matches) */}
                              {match.status.toLowerCase() !== "success" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSingleMatchAction(match, "refilter-single")}
                                    >
                                      <Filter className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t("refilter_player", lang)}</p>
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
            <p>{t("no_matches_found", lang)}</p>
          </div>
        )}
      </div>
    );
  }
}