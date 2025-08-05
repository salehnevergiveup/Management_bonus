"use client";

import { useState, useEffect, useMemo, useRef } from "react";  // Added useRef
import { Search, RotateCcw, PlayCircle, Square, RefreshCw, CheckSquare, Filter, Edit , CheckCircle, PauseCircle, Download, Plus, Play } from "lucide-react";
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

// Import new components
import SearchFilters from "@/components/matches/search-filters";
import SelectionControls from "@/components/matches/selection-controls";
import PaginationControls from "@/components/matches/pagination-controls";
import MatchesTabs from "@/components/matches/matches-tabs";

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
  comment: string | null;  // Add this line
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
  const [availableBonuses, setAvailableBonuses] = useState<Bonus[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalMatches, setTotalMatches] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bonusFilter, setBonusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<null | { match: Match; action: string }>(null);
  const router = useRouter();
  
// State for updating match amount and status
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [matchToEdit, setMatchToEdit] = useState<Match | null>(null);
const [newStatus, setNewStatus] = useState("");

  // Added state for real-time updates
  const eventSourceRef = useRef<EventSource | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string>("");
  
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

  // Add state for Resume All
  const [resumeAllLoading, setResumeAllLoading] = useState(false);
  const [resumeAllDialogOpen, setResumeAllDialogOpen] = useState(false);
  const [resumeAllMatches, setResumeAllMatches] = useState<Match[]>([]);
  const [resumeAllProcessId, setResumeAllProcessId] = useState<string>("");
  const [resumeAllConfirmationOpen, setResumeAllConfirmationOpen] = useState(false);
  const [resumeAllFilterNotFound, setResumeAllFilterNotFound] = useState(false);
  
  // State for resume process ID
  const [resumeProcessId, setResumeProcessId] = useState<string>("");
  
  // Maximum records limit
  const MAX_RECORDS_LIMIT = 3000;

  // Update fetchMatches to include activeTab filtering
  const fetchMatches = async (page = currentPage, size = pageSize, search = searchTerm, status = statusFilter) => {
    if (auth) {
      if (!auth.canAccess("matches")) {
        router.push("/dashboard");
        return;
      }
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("pageSize", String(size));
      if (search) params.append("search", search);
      if (status && status !== "all") params.append("status", status);
      // Add activeTab filtering
      if (activeTab === "matched") {
        params.append("hasTransferAccount", "true");
      } else if (activeTab === "unmatched") {
        params.append("hasTransferAccount", "false");
      }
      const response = await fetch(`/api/matches?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch matches");
      }
      const data = await response.json();
      setMatches(data.data);
      setTotalMatches(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(data.pagination.page);
      setPageSize(data.pagination.limit);
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
              toast.error(t("failed_to_fetch_matches", lang));
    } finally {
      setLoading(false);
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
useEffect(() => {
  // Close any existing connection
  if (eventSourceRef.current) {
    eventSourceRef.current.close();
  }

  // Initialize SSE connection
  eventSourceRef.current = new EventSource('/api/events');
  
  // Connection opened
  eventSourceRef.current.onopen = () => {
    console.log('SSE connection established');
  };
  
  // Connection error
  eventSourceRef.current.onerror = (error) => {
    console.error('SSE connection error:', error);
  };
  
  // Listen for match status updates
  eventSourceRef.current.addEventListener(Events.MATCHES_STATUS, (event) => {
    try {
      console.log('Received SSE update:', event.data);
      const data = JSON.parse(event.data);      
      // Handle match updates - note we're using data.id not data.matchId
      if (data.id) {
        console.log('Updating match:', data);
        updateSingleMatch(data);
      }
    } catch (error) {
      console.error("Error handling status update:", error);
    }
  });
  
  // Listen for general connection events
  eventSourceRef.current.addEventListener('open', () => {
    console.log('SSE connection opened');
  });
  
  eventSourceRef.current.addEventListener('error', (event) => {
    console.error('SSE connection error:', event);
  });
  
  // Clean up function
  return () => {
    if (eventSourceRef.current) {
      console.log('Closing SSE connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };
}, []); // Empty dependency array so it only runs once

// Update a single match when receiving real-time update
const updateSingleMatch = (data: any) => {
  if (!data || !data.id) {
    console.log('Invalid update data:', data);
    return;
  }
  
  console.log('Processing match update:', data);
  
  setMatches(prevMatches => {
    // Find the match index
    const matchIndex = prevMatches.findIndex(match => match.id === data.id);
    
    // If match not found, return unchanged state
    if (matchIndex === -1) {
      console.log('Match not found in current list:', data.id);
      return prevMatches;
    }
    
    console.log('Updating match at index:', matchIndex);
    
    // Create a copy of the matches array
    const newMatches = [...prevMatches];
    
    // Update the specific match with all possible fields
    newMatches[matchIndex] = {
      ...newMatches[matchIndex],
      status: data.status !== undefined ? data.status : newMatches[matchIndex].status,
      transfer_account: data.transferAccount !== undefined ? data.transferAccount : 
                      data.transfer_account !== undefined ? data.transfer_account : 
                      newMatches[matchIndex].transfer_account,
      transfer_account_id: data.transferAccount?.id !== undefined ? data.transferAccount.id :
                          data.transfer_account?.id !== undefined ? data.transfer_account.id :
                          data.transfer_account_id !== undefined ? data.transfer_account_id :
                          newMatches[matchIndex].transfer_account_id,
      comment: data.comment !== undefined ? data.comment : newMatches[matchIndex].comment,
      updated_at: data.updated_at || data.updatedAt || new Date().toISOString()
    };
    
    console.log('Updated match:', newMatches[matchIndex]);
    return newMatches;
  });
};

  useEffect(() => {
    if (!isLoading && auth) {
      fetchMatches();
      loadPermissions();
    }
  }, [isLoading, auth, router]);

  // Refetch on filter/search/page change
  useEffect(() => {
    fetchMatches(currentPage, pageSize, searchTerm, statusFilter);
  }, [currentPage, pageSize, statusFilter, activeTab]);

  // Remove the searchTerm from the useEffect dependencies to prevent auto-search

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

  // Handle tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Reset selections when tab changes
  useEffect(() => {
    setSelectedMatches([]);
    setSelectAllChecked(false);
  }, [activeTab, bonusFilter]);

  // Reset select all state when page changes
  useEffect(() => {
    setSelectAllChecked(false);
  }, [currentPage]);

  // Remove all client-side filtering and pagination logic (filteredMatches, paginatedMatches, etc.)
  // Update groupedByProcess to use matches directly
  const groupedByProcess = useMemo(() => {
    const processMap = new Map();
    matches.forEach(match => {
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
  }, [matches]);

  // Update pagination controls to use backend pagination
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
    setNewStatus(""); 
    setEditDialogOpen(true);
  } else {
    setMatchToEdit(match);
    setNewStatus(""); 
    setRequestAction("edit");
    setRequestMessage("");
    setEditDialogOpen(true);
  }
};

// Update match amount and status
const updateMatch = async () => {
  if (!matchToEdit) return;
  
  // Check if status is being updated
  if (!newStatus) {
            toast.error(t("please_select_status", lang));
    return;
  }
  
  // Initialize the update data object with only status
  const updateData: { status: string } = {
    status: newStatus
  };

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
            toast.error(error instanceof Error ? error.message : t("failed_to_update_match", lang));
  }
};
  // Submit permission request for match changes
  const submitMatchChangeRequest = async () => {
    if (!matchToEdit || !newStatus || !auth || requestMessage.length < 10) {
              toast.error(t("please_select_status_and_reason", lang));
      return;
    }
    
    try {
      // Build a descriptive message about what's being changed
      let changeDescription = "Request to change match: ";
      
      // Add status change details
      changeDescription += `Status from ${matchToEdit.status} to ${newStatus}`;
      
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
        toast.error(result.error || t("failed_to_submit_request", lang));
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
    const pendingMatch = processMatches.filter(match=> match.status.toLowerCase() == 'pending'); 

    return  pendingMatch.length === 0; 
  };

  const canShowProcessAction = (processStatus: string, action: string) => {
    switch (processStatus) {
      case  ProcessStatus.FAILED:
      case ProcessStatus.PENDING:
        return (action === 'resume' || action === 'rematch' || 
                action === 'refilter' || action === 'mark-success' || action === 'mark-onhold');
      case ProcessStatus.SUCCESS:
        return (action === 'rematch' || action === 'refilter');
      case ProcessStatus.PROCESSING:
        return (action === 'terminate'); 
      default:
        return false;
    }
  };

  // Test API connectivity
  const testApiConnection = async () => {
    console.log(`🧪 Testing API connection...`);
    try {
      const testResponse = await fetch('/api/matches?page=1&limit=1', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`🧪 Test API response:`, { status: testResponse.status, ok: testResponse.ok });
      return testResponse.ok;
    } catch (error) {
      console.error(`🧪 Test API error:`, error);
      return false;
    }
  };

  // Restore the original executeAction function above the return statement
  const executeAction = async () => {
    if (!selectedAction) return;
  
    const { match, action } = selectedAction;
    console.log(`🚀 Starting executeAction for: ${action}`, { matchId: match.id, processId: match.process_id });
    
    // Test API connection first
    const apiWorks = await testApiConnection();
    console.log(`🧪 API connection test result:`, apiWorks);
    
    try {
      let endpoint = '';
      let method = '';
      let body = {};
  
      switch (action) {
        case 'resume':
          endpoint = `/api/processes/${match.process_id}/resume`;
          console.log(`🔍 RESUME DEBUG: Starting resume action`);
          console.log(`🔍 RESUME DEBUG: Endpoint = ${endpoint}`);
          console.log(`🔍 RESUME DEBUG: Process ID = ${match.process_id}`);
          
          if (selectedMatches.length > 0) {
            console.log(`🔍 RESUME DEBUG: Selected matches count = ${selectedMatches.length}`);
            
            const selectedMatchData: any[] = matches
              .filter(m => 
                selectedMatches.includes(m.id) && 
                m.transfer_account_id !== null && 
                 (m.status.toLowerCase() == "pending" || m.status.toLowerCase() == "failed")
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
              
            console.log(`🔍 RESUME DEBUG: Valid matches for resume = ${selectedMatchData.length}`);
            
            if (selectedMatchData.length == 0) {
              console.log(`🔍 RESUME DEBUG: No valid matches, returning early`);
              toast.error(t("no_valid_matches_selected", lang));
              return;
            }
            
            console.log(`🔍 RESUME DEBUG: Preparing payload...`);
            body = { matches: selectedMatchData };
            method = 'POST';
            
            console.log(`🔍 RESUME DEBUG: Payload prepared, method = ${method}`);
            console.log(`🔍 RESUME DEBUG: About to make fetch request...`);
          } else {
            console.log(`🔍 RESUME DEBUG: No selected matches, returning early`);
            toast.error(t("no_matches_selected_for_resume", lang));
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
        console.error("❌ Invalid action configuration:", { action, endpoint, method });
        return;
      }
      
      console.log(`🌐 Making ${method} request to: ${endpoint}`);
      console.log(`📋 Request body preview:`, JSON.stringify(body).substring(0, 200) + '...');
      
      console.log(`🔍 RESUME DEBUG: Starting fetch request...`);
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      console.log(`🔍 RESUME DEBUG: Fetch request completed`);
      
      console.log(`📥 Response received:`, { status: response.status, ok: response.ok });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ Response error:`, errorData);
        throw new Error(errorData.message || errorData.error || `Failed to ${action} match`);
      }
      
      console.log(`✅ Request successful for action: ${action}`);
      const needsPermission = (action === 'terminate');
      if (needsPermission && auth?.role !== Roles.Admin) {
        setCompletePermission({
          modelId: match.process_id,
          action: action.split('-')[0]
        });
      }
      toast.success(`Successfully performed ${action.replace('-', ' ')} action`);
      fetchMatches();
      setSelectedMatches([]);
      setSelectAllChecked(false);
    } catch (error) {
      console.error(`🔍 RESUME DEBUG: Error caught in executeAction`);
      console.error(`🔍 RESUME DEBUG: Error type = ${typeof error}`);
      console.error(`🔍 RESUME DEBUG: Error message = ${error instanceof Error ? error.message : String(error)}`);
      console.error(`🔍 RESUME DEBUG: Error stack = ${error instanceof Error ? error.stack : 'No stack trace'}`);
      console.error(`💥 Error during ${selectedAction.action}:`, error);
      console.error(`💥 Error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        action: selectedAction.action
      });
      toast.error(`${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setConfirmDialogOpen(false);
      setRefilterDialogOpen(false);
      setResumeDialogOpen(false);
      setSelectedAction(null);
      setSelectedBonusId("");
    }
  };

  // Handler for Resume All
  const handleResumeAll = async (processId: string) => {
    setResumeAllConfirmationOpen(true);
    setResumeAllProcessId(processId);
  };



  // Handler to confirm Resume All with filtering option
    const confirmResumeAllWithFilter = async (filterNotFound: boolean) => {
    console.log(`🔍 DEBUG: confirmResumeAllWithFilter called with filterNotFound = ${filterNotFound}`);
    setResumeAllConfirmationOpen(false);
    setResumeAllFilterNotFound(filterNotFound);
    setResumeAllLoading(true);
    console.log(`🔍 DEBUG: Fetching ALL matches for resume all...`);
    
    try {
      // ALWAYS fetch ALL matches for the process, not just current page
      console.log(`🔍 DEBUG: Fetching all matches for process ${resumeAllProcessId}...`);
      const response = await fetch(`/api/matches?all=true&status=pending,failed`);
      console.log(`🔍 DEBUG: Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🔍 DEBUG: API Error - Status: ${response.status}, Body: ${errorText}`);
        throw new Error(`Failed to fetch matches: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`🔍 DEBUG: Received ${data.data?.length || 0} matches from API`);
      
      // Filter for the current process only and valid matches
      let processMatches = data.data.filter((m: Match) => 
        m.process_id === resumeAllProcessId && 
        m.transfer_account_id !== null &&
        (m.status.toLowerCase() === "pending" || m.status.toLowerCase() === "failed")
      );
      
      console.log(`🔍 DEBUG: Found ${processMatches.length} valid matches for process ${resumeAllProcessId}`);
      
      // If user chose to filter out not found players, remove them
      if (filterNotFound) {
        processMatches = processMatches.filter((m: Match) => 
          !(m.status.toLowerCase() === "failed" && m.comment === "unable to find the player")
        );
      }
      
      // Check if we exceed the maximum records limit and take only the first 3000
      if (processMatches.length > MAX_RECORDS_LIMIT) {
        const originalCount = processMatches.length;
        processMatches = processMatches.slice(0, MAX_RECORDS_LIMIT);
        toast.success(`Found ${originalCount} matches. Processing first ${MAX_RECORDS_LIMIT} matches.`);
        console.log(`🔍 DEBUG: Limited to first ${MAX_RECORDS_LIMIT} matches out of ${originalCount}`);
      }
      
      // Show warning if approaching the limit
      if (processMatches.length > MAX_RECORDS_LIMIT * 0.8) {
        toast.success(`Processing ${processMatches.length} records (${Math.round(processMatches.length / MAX_RECORDS_LIMIT * 100)}% of limit)`);
      }
      
      setResumeAllMatches(processMatches);
      setResumeAllDialogOpen(true);
      console.log(`🔍 DEBUG: Full-screen overlay HIDDEN - resume dialog shown with ${processMatches.length} matches`);
    } catch (error) {
      console.error(`🔍 DEBUG: Error in confirmResumeAllWithFilter:`, error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to fetch all pending/failed matches: ${errorMessage}`);
      console.log(`🔍 DEBUG: Full-screen overlay HIDDEN - error occurred`);
    } finally {
      setResumeAllLoading(false);
    }
  };

  // Handler to confirm Resume All
  const confirmResumeAll = async () => {
    console.log(`🚀 Starting confirmResumeAll`);
    console.log(`📊 Resume All data:`, { 
      processId: resumeAllProcessId, 
      matchesCount: resumeAllMatches.length 
    });
    
    if (!resumeAllProcessId || resumeAllMatches.length === 0) {
      console.log(`❌ No matches to resume`);
              toast.error(t("no_matches_to_resume", lang));
      setResumeAllDialogOpen(false);
      return;
    }
    
    setResumeAllLoading(true);
    console.log(`🔍 DEBUG: Full-screen overlay SHOWN - processing resume request...`);
    
    try {
      console.log(`📦 Preparing payload for ${resumeAllMatches.length} matches`);
      
      const payload = {
        matches: resumeAllMatches.map(m => ({
          id: m.id,
          username: m.username,
          transfer_account_id: m.transfer_account_id,
          transfer_account: m.transfer_account,
          amount: m.amount,
          currency: m.currency,
          bonus_id: m.bonus_id
        }))
      };
      
      // Check payload size
      const payloadSize = JSON.stringify(payload).length;
      const sizeInMB = payloadSize / (1024 * 1024);
      console.log(`📦 Resume All payload size: ${sizeInMB.toFixed(2)} MB`);
      
      if (sizeInMB > 5) { // 5MB limit
        console.log(`❌ Payload too large: ${sizeInMB.toFixed(2)} MB`);
        toast.error(`${t("payload_too_large", lang)} (${sizeInMB.toFixed(2)} MB)`);
        setResumeAllLoading(false);
        console.log(`🔍 DEBUG: Full-screen overlay HIDDEN - payload too large`);
        return;
      }
      
      console.log(`🌐 Making Resume All request to: /api/processes/${resumeAllProcessId}/resume`);
      
      const response = await fetch(`/api/processes/${resumeAllProcessId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log(`📥 Resume All response received:`, { status: response.status, ok: response.ok });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`❌ Resume All response error:`, errorData);
        throw new Error(errorData.message || errorData.error || "Failed to resume all matches");
      }
      
      console.log(`✅ Resume All request successful`);
              toast.success(t("resume_all_request_sent_successfully", lang));
      setResumeAllDialogOpen(false);
      fetchMatches();
    } catch (error) {
      console.error(`💥 Resume All error:`, error);
      console.error(`💥 Resume All error details:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
              toast.error(error instanceof Error ? error.message : t("failed_to_resume_all_matches", lang));
    } finally {
      setResumeAllLoading(false);
      console.log(`🔍 DEBUG: Full-screen overlay HIDDEN - resume process completed`);
    }
  };

  // Utility: formatCurrency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  // Utility: submitPermissionRequest
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

  // Utility: getProcessStatusColor
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

  // Utility: getMatchStatusColor
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

  // Utility: handleProcessAction
  const handleProcessAction = (process: { id: string, status: string }, action: string) => {
    if (action === "resume") {
      // Show resume dialog with selected matches list directly
      setResumeProcessId(process.id);
      setResumeDialogOpen(true);
    } else {
    setSelectedAction({ match: matches.find(m => m.process_id === process.id)!, action });
    setConfirmDialogOpen(true);
    }
  };

  // Utility: handleSingleMatchAction
  const handleSingleMatchAction = (match: Match, action: string) => {
    setSelectedAction({ match, action });
    setConfirmDialogOpen(true);
  };

  // Utility: toggleSelectAll - only select current page data, accumulate with existing selections
  const toggleSelectAll = () => {
    if (selectAllChecked) {
      // Remove only current page selections when unchecking
      const currentPageMatchIds = matches.map(match => match.id);
      setSelectedMatches(prevSelected => 
        prevSelected.filter(id => !currentPageMatchIds.includes(id))
      );
    } else {
      // Add valid matches from current page to existing selections
      const validMatches = matches
        .filter(match =>
          match.status.toLowerCase() !== "success" &&
          match.transfer_account_id !== null
        )
        .map(match => match.id);
      setSelectedMatches(prevSelected => {
        const newSelections = [...prevSelected];
        validMatches.forEach(id => {
          if (!newSelections.includes(id)) {
            newSelections.push(id);
          }
        });
        return newSelections;
      });
    }
    setSelectAllChecked(!selectAllChecked);
  };

  // Utility: toggleMatchSelection
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

  // Function to unselect not found players from selected matches - applies to all selected data
  const unselectNotFoundPlayers = async () => {
    if (selectedMatches.length === 0) {
      toast.error(t("no_matches_selected", lang));
      return;
    }

    setLoading(true);
    try {
      // Fetch all selected matches to check their status
      const params = new URLSearchParams();
      params.append("all", "true"); // Fetch all records to check selected ones
      
      const response = await fetch(`/api/matches?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch matches for filtering");
      const data = await response.json();
      
      // Find all selected matches that are "not found" players
      const allMatches = data.data;
      const notFoundPlayerIds = allMatches
        .filter((match: Match) => 
          selectedMatches.includes(match.id) &&
        match.status.toLowerCase() === "failed" && 
        match.comment === "unable to find the player"
      )
        .map((match: Match) => match.id);
    
      // Remove not found players from selection
    setSelectedMatches(prevSelected => 
      prevSelected.filter(id => !notFoundPlayerIds.includes(id))
    );
      
      if (notFoundPlayerIds.length > 0) {
        toast.success(t("removed_not_found_players_from_selection", lang).replace("{count}", notFoundPlayerIds.length.toString()));
      } else {
        toast.error(t("no_not_found_players_in_selection", lang));
      }
    } catch (error) {
      console.error("Error unselecting not found players:", error);
      toast.error(t("failed_to_unselect_not_found", lang));
    } finally {
      setLoading(false);
    }
  };

  // Function to clear not found filter (unselect not found players) - applies to all selected data
  const clearNotFoundFilter = async () => {
    if (selectedMatches.length === 0) {
      toast.error("No matches selected");
      return;
    }

    setLoading(true);
    try {
      // Fetch all selected matches to check their status
      const params = new URLSearchParams();
      params.append("all", "true"); // Fetch all records to check selected ones
      
      const response = await fetch(`/api/matches?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch matches for filtering");
      const data = await response.json();
      
      // Find all selected matches that are "not found" players
      const allMatches = data.data;
      const notFoundPlayerIds = allMatches
        .filter((match: Match) => 
          selectedMatches.includes(match.id) &&
        match.status.toLowerCase() === "failed" && 
        match.comment === "unable to find the player"
      )
        .map((match: Match) => match.id);
    
      // Remove not found players from selection
    setSelectedMatches(prevSelected => 
      prevSelected.filter(id => !notFoundPlayerIds.includes(id))
    );
      
      if (notFoundPlayerIds.length > 0) {
        toast.success(t("removed_not_found_players_from_selection", lang).replace("{count}", notFoundPlayerIds.length.toString()));
      } else {
        toast.success(t("no_not_found_players_in_current_selection", lang));
      }
    } catch (error) {
      console.error("Error clearing not found filter:", error);
      toast.error(t("failed_to_clear_not_found_filter", lang));
    } finally {
      setLoading(false);
    }
  };

  // Check if any selected matches are not found players
  const hasSelectedNotFoundPlayers = useMemo(() => {
    return selectedMatches.some(matchId => {
      const match = matches.find(m => m.id === matchId);
      return match && 
        match.status.toLowerCase() === "failed" && 
        match.comment === "unable to find the player";
    });
  }, [selectedMatches, matches]);

  // Check if all selectable items on current page are selected
  const isCurrentPageAllSelected = useMemo(() => {
    const selectableMatches = matches.filter(match =>
      match.status.toLowerCase() !== "success" &&
      match.transfer_account_id !== null
    );
    
    if (selectableMatches.length === 0) return false;
    
    return selectableMatches.every(match => 
      selectedMatches.includes(match.id)
    );
  }, [matches, selectedMatches]);

  // Check if there are active filters
  const hasActiveFilters = useMemo(() => {
    return searchTerm.trim() !== "" || 
           statusFilter !== "all" || 
           bonusFilter !== "all" || 
           activeTab !== "all";
  }, [searchTerm, statusFilter, bonusFilter, activeTab]);

  // Function to select all filtered matches
  const selectAllFiltered = async () => {
    if (!hasActiveFilters) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("all", "true"); // Fetch all records
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (bonusFilter !== "all") params.append("bonus_id", bonusFilter);
      
      // Add activeTab filtering
      if (activeTab === "matched") {
        params.append("hasTransferAccount", "true");
      } else if (activeTab === "unmatched") {
        params.append("hasTransferAccount", "false");
      } else if (activeTab === "not_found") {
        params.append("notFoundPlayers", "true");
      }
      
      const response = await fetch(`/api/matches?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch all filtered matches");
      const data = await response.json();
      
      // Select all filtered matches
      const allFilteredMatchIds = data.data.map((match: Match) => match.id);
      setSelectedMatches(allFilteredMatchIds);
      setSelectAllChecked(true);
      
      toast.success(`Selected ${allFilteredMatchIds.length} matches`);
    } catch (error) {
      console.error("Error selecting all filtered matches:", error);
              toast.error(t("failed_to_select_all_filtered", lang));
    } finally {
      setLoading(false);
    }
  };

  // Get total filtered matches count (for display purposes)
  const totalFilteredMatches = useMemo(() => {
    if (!hasActiveFilters) return 0;
    return totalMatches; // This is the total from the current filtered view
  }, [hasActiveFilters, totalMatches]);

  // Utility: handleCommentClick
  const handleCommentClick = (comment: string | null) => {
    setSelectedComment(comment || t("no_comment", lang));
    setCommentDialogOpen(true);
  };

  // Utility: truncateComment
  const truncateComment = (comment: string | null, maxWords: number = 5) => {
    if (!comment) return t("no_comment", lang);
    const words = comment.split(' ');
    if (words.length <= maxWords) return comment;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  // Handle search button click
  const handleSearch = () => {
    fetchMatches(1, pageSize, searchTerm, statusFilter); // Reset to page 1 when searching
  };

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // CSV Export function - now exports all matches, not just failed ones
  const exportAllMatchesToCSV = async (type: "all" | "selected", processId?: string) => {
    if (!processId) {
      toast.error(t("please_select_process", lang));
      return;
    }
    
    // Show initial loading message with non-blocking behavior
    const loadingToast = toast.loading(t("preparing_export", lang), { 
      id: "export",
      duration: Infinity // Keep loading until we dismiss it
    });
    
    try {
      console.log("Starting export with params:", { type, processId });
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append("type", type);
      params.append("processId", processId);
      
      if (type === "selected") {
        // Get all selected matches for this process (not just failed ones)
        const selectedMatchesForProcess = matches.filter(match => 
          selectedMatches.includes(match.id) && 
          match.process_id === processId
        );
        
        console.log("Selected matches for export:", selectedMatchesForProcess.length);
        
        if (selectedMatchesForProcess.length === 0) {
          toast.error(t("no_matches_to_export", lang), { id: "export" });
          return;
        }
        
        params.append("selectedIds", selectedMatchesForProcess.map(m => m.id).join(","));
      }

      // Use the new API endpoint for all matches with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
      
      const response = await fetch(`/api/matches/export-all?${params.toString()}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error(t("no_matches_to_export", lang), { id: "export" });
          return;
        }
        throw new Error("Failed to export matches");
      }

      // Get the CSV content from response
      const csvContent = await response.text();
      
      // Create and download CSV file using non-blocking approach
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Use setTimeout to ensure UI remains responsive
      setTimeout(() => {
        const link = document.createElement("a");
        link.setAttribute("href", url);
        
        // Get filename from response headers or create default
        const contentDisposition = response.headers.get("content-disposition");
        let filename = `all_matches_${type}_${new Date().toISOString().split('T')[0]}.csv`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        URL.revokeObjectURL(url);
      }, 100);

      // Get count from the CSV content (subtract header row)
      const lineCount = csvContent.split('\n').length - 1;
      
      // Show success message with count
      toast.success(t("all_matches_exported_successfully", lang).replace("{count}", lineCount.toString()), { id: "export" });
      
      console.log(`Export completed: ${lineCount} rows exported`);
    } catch (error) {
      console.error("Error exporting matches:", error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error(t("export_timeout_error", lang), { id: "export" });
      } else {
        toast.error(t("failed_to_export_matches", lang), { id: "export" });
      }
    } finally {
      // Ensure loading toast is dismissed
      toast.dismiss("export");
    }
  };

  return (
    <div className="container mx-auto py-6">
      
      <Breadcrumb items={[{ label: "TransferFlow Pro - Match Management" }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>TransferFlow Pro - Match Management</CardTitle>
        </CardHeader>

        <CardContent>
          <SearchFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleSearch={handleSearch}
            handleSearchKeyPress={handleSearchKeyPress}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            bonusFilter={bonusFilter}
            setBonusFilter={setBonusFilter}
            availableBonuses={availableBonuses}
          />

          <SelectionControls
            selectedMatches={selectedMatches}
            hasSelectedNotFoundPlayers={hasSelectedNotFoundPlayers}
            onClearSelection={() => {
              setSelectedMatches([])
              setSelectAllChecked(false)
            }}
            onUnselectNotFound={unselectNotFoundPlayers}
            onClearNotFoundFilter={clearNotFoundFilter}
            onSelectAllFiltered={selectAllFiltered}
            hasActiveFilters={hasActiveFilters}
            totalFilteredMatches={totalFilteredMatches}
            onRefresh={() => {
              console.log('Manual refresh triggered');
              fetchMatches();
            }}
          />

          <MatchesTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            renderTable={renderTable}
          />

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalMatches={totalMatches}
            pageSize={pageSize}
            onGoToPage={goToPage}
          />
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
                <p>{t("all unmatched users matched", lang)}</p>
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                  <p className="text-sm text-yellow-800">{t("rematch process description", lang)}</p>
                </div>
              </div>
            ) : selectedAction?.action === "terminate" ? (
              <div className="space-y-3">
                <p>{t("confirm terminate process", lang)}</p>
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <p className="text-sm text-red-800">{t("terminate process warning", lang)}</p>
                </div>
              </div>
            ) : selectedAction?.action === "mark-success" ? (
              <div className="space-y-3">
                <p>{t("confirm mark success", lang)}</p>
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-sm text-green-800">{t("mark success description", lang)}</p>
                </div>
              </div>
            ) : selectedAction?.action === "mark-onhold" ? (
              <div className="space-y-3">
                <p>{t("confirm put on hold", lang)}</p>
                <div className="bg-amber-50 p-3 rounded border border-amber-200">
                  <p className="text-sm text-amber-800">{t("mark onhold description", lang)}</p>
                </div>
              </div>
            ) : selectedAction?.action === "resume" ? (
              <div className="space-y-3">
                <p>{t("confirm resume selected matches", lang)}</p>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm text-blue-800">
                    {t("resume selected matches description", lang)} ({selectedMatches.length} {t("matches", lang)})
                  </p>
                </div>
              </div>
            ) : selectedAction?.action === "refilter-single" ? (
              <div className="space-y-3">
                <p>{t("confirm refilter match", lang)}</p>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm text-blue-800">
                    {t("refilter match description 1", lang) + " "}
                    <strong>{selectedAction?.match.bonus?.name || t("unknown", lang)}</strong>
                    {t("refilter match description 2", lang)}
                  </p>
                </div>
              </div>
            ) : (
              <p>
                {t("confirm action 1", lang) +
                  " " +
                  (selectedAction?.action?.replace("-", " ") || "") +
                  " " +
                  t("confirm action 2", lang) +
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
            <DialogTitle>{t("resume process with selected", lang)}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {/* Show total count */}
            <div className="mb-2 text-sm text-muted-foreground">
              {t("total selected", lang)}: {selectedMatches.length}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("username", lang)}</TableHead>
                  <TableHead>{t("account", lang)}</TableHead>
                  <TableHead>{t("bonus", lang)}</TableHead>
                  <TableHead>{t("amount", lang)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedMatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {t("no matches selected", lang)}
                    </TableCell>
                  </TableRow>
                ) : (
                  matches
                    .filter((match) => selectedMatches.includes(match.id))
                    .map((match, idx) => (
                      <TableRow key={match.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{match.username}</TableCell>
                        <TableCell>{match.transfer_account?.username || t("not assigned", lang)}</TableCell>
                        <TableCell>{match.bonus?.name || t("not available", lang)}</TableCell>
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
                  setResumeDialogOpen(false)
                  executeAction()
                }
              }}
              disabled={selectedMatches.length === 0}
            >
              {t("resume with selected", lang)}
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
              {t("request permission to 1", lang) +
                " " +
                requestAction.charAt(0).toUpperCase() +
                requestAction.slice(1) +
                " " +
                t("request permission to 2", lang)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("process id", lang)}</Label>
              <p className="font-medium">{requestProcessId}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="request_message">{t("reason for request", lang)}</Label>
              <Textarea
                id="request_message"
                placeholder={t("explain permission need", lang)}
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={4}
              />
              {requestMessage.length < 10 && requestMessage.length > 0 && (
                <p className="text-sm text-red-500">{t("provide detailed explanation", lang)}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRequestDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
            <Button onClick={submitPermissionRequest} disabled={!requestMessage || requestMessage.length < 10}>
              {t("submit request", lang)}
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
                ? t("edit match details", lang)
                : t("request to edit match", lang)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("username", lang)}</Label>
              <p className="font-medium">{matchToEdit?.username}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_status">{t("status", lang)}</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("select status", lang)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t("pending", lang)}</SelectItem>
                  <SelectItem value="success">{t("success", lang)}</SelectItem>
                  <SelectItem value="failed">{t("failed", lang)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* If user doesn't have permission and is requesting */}
            {!auth?.can("matches:edit") &&
              auth?.role !== Roles.Admin &&
              !hasPermission(permissionsMap, matchToEdit?.id || "", "edit") && (
                <div className="space-y-2">
                  <Label htmlFor="request_message">{t("reason for request", lang)}</Label>
                  <Textarea
                    id="request_message"
                    placeholder={t("explain change need", lang)}
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    rows={4}
                  />
                  {requestMessage.length < 10 && requestMessage.length > 0 && (
                    <p className="text-sm text-red-500">{t("provide detailed explanation", lang)}</p>
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
                disabled={!newStatus}
              >
                {t("update match", lang)}
              </Button>
            ) : (
              <Button
                onClick={submitMatchChangeRequest}
                disabled={!newStatus || requestMessage.length < 10}
              >
                {t("submit request", lang)}
              </Button>
            )}
        </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("comment details", lang)}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gray-50 p-4 rounded-md border">
              <p className="text-sm whitespace-pre-wrap break-words">
                {selectedComment}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setCommentDialogOpen(false)}
            >
              {t("close", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refilter Dialog for Process */}
      <Dialog open={refilterDialogOpen} onOpenChange={setRefilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("refilter process with bonus", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bonus_select">{t("select bonus", lang)}</Label>
              <Select value={selectedBonusId} onValueChange={setSelectedBonusId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("select a bonus", lang)} />
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
                  <strong>{t("warning", lang)}:</strong> {t("refilter warning 1", lang) + " "}
                  <strong>{availableBonuses.find((b) => b.id === selectedBonusId)?.name || t("selected", lang)}</strong>
                  {t("refilter warning 2", lang)}
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
              {t("refilter process", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume All confirmation dialog */}
      <Dialog open={resumeAllConfirmationOpen} onOpenChange={setResumeAllConfirmationOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t("resume all confirmation", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p>{t("resume all question", lang)}</p>
            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
              <p className="text-sm text-yellow-800">
                {t("resume all filter description", lang)}
              </p>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setResumeAllConfirmationOpen(false)}
              className="w-full sm:w-auto"
            >
              {t("cancel", lang)}
            </Button>
            <Button 
              onClick={() => {
                console.log(`🔍 DEBUG: Resume All with Not Found button clicked`);
                confirmResumeAllWithFilter(true); // true = filter out not found players
              }}
              disabled={resumeAllLoading}
              className="relative w-full sm:w-auto"
            >
              {resumeAllLoading ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <span className="opacity-0">{t("resume all with not found", lang)}</span>
                </>
              ) : (
                t("resume all with not found", lang)
              )}
            </Button>
            <Button 
              onClick={() => {
                console.log(`🔍 DEBUG: Resume All without Not Found button clicked`);
                confirmResumeAllWithFilter(false); // false = include not found players
              }}
              disabled={resumeAllLoading}
              variant="default"
              className="relative w-full sm:w-auto"
            >
              {resumeAllLoading ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <span className="opacity-0">{t("resume all without not found", lang)}</span>
                </>
              ) : (
                t("resume all without not found", lang)
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Resume All dialog */}
      <Dialog open={resumeAllDialogOpen} onOpenChange={setResumeAllDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("resume all confirmation", lang)}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {/* Show total count */}
            <div className="mb-2 text-sm text-muted-foreground">
              {t("total selected", lang)}: {resumeAllMatches.length}
              {resumeAllMatches.length > MAX_RECORDS_LIMIT * 0.8 && (
                <span className="ml-2 text-orange-600 font-medium">
                  ({Math.round(resumeAllMatches.length / MAX_RECORDS_LIMIT * 100)}% of {MAX_RECORDS_LIMIT} limit)
                </span>
              )}
            </div>
            {resumeAllMatches.length > MAX_RECORDS_LIMIT && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ Cannot process more than {MAX_RECORDS_LIMIT} records
                </p>
              </div>
            )}
            

            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("username", lang)}</TableHead>
                  <TableHead>{t("account", lang)}</TableHead>
                  <TableHead>{t("bonus", lang)}</TableHead>
                  <TableHead>{t("amount", lang)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumeAllMatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {t("no matches found", lang)}
                    </TableCell>
                  </TableRow>
                ) : (
                  resumeAllMatches.map((match, idx) => (
                    <TableRow key={match.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{match.username}</TableCell>
                      <TableCell>{match.transfer_account?.username || t("not assigned", lang)}</TableCell>
                      <TableCell>{match.bonus?.name || t("not available", lang)}</TableCell>
                      <TableCell>{formatCurrency(match.amount, match.currency)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResumeAllDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
            <Button 
              onClick={confirmResumeAll} 
              disabled={resumeAllMatches.length === 0 || resumeAllLoading}
              className="relative"
            >
              {resumeAllLoading ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <span className="opacity-0">{t("confirm", lang)}</span>
                </>
              ) : (
                t("confirm", lang)
              )}
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
                    {t("process id", lang)}: {process.id}
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
                              <p>{t("complete pending process", lang)}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/*create match request button*/}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setCreateMatchDialogOpen(true)}>
                              <PlayCircle className="h-4 w-4 mr-1" />
                              {t("create match", lang)}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {auth?.role == Roles.Admin
                                ? t("admin create match tooltip", lang)
                                : t("user create match tooltip", lang)}
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
                                {t("rematch all", lang)}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("update matched players", lang)}</p>
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
                                {t("refilter all", lang)}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("refilter all players", lang)}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Resume All button */}
                        {canShowProcessAction(process.status, "rematch") && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResumeAll(process.id)}
                                disabled={resumeAllLoading}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                {resumeAllLoading ? t("loading", lang) : t("resume all", lang)}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("resume all pending failed", lang)}</p>
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
                                {t("mark success", lang)}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("mark success tooltip", lang)}</p>
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
                                {t("on hold", lang)}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("on hold tooltip", lang)}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                      </>
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
                          <p>{t("terminate tooltip", lang)}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Export All Matches button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-500 hover:text-blue-700"
                          onClick={() => {
                            // Get the current process ID from the first match
                            const currentProcessId = matches.length > 0 ? matches[0].process_id : null;
                            
                            if (!currentProcessId) {
                              toast.error(t("no_process_found", lang));
                              return;
                            }
                            
                            // Export all matches for the current process
                            exportAllMatchesToCSV("all", currentProcessId);
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {t("export all", lang)}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("export_all_matches_tooltip", lang)}</p>
                      </TooltipContent>
                    </Tooltip>
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
                          checked={isCurrentPageAllSelected}
                          onCheckedChange={toggleSelectAll}
                          aria-label={t("select all", lang)}
                        />
                      </TableHead>
                    )}
                    <TableHead>{t("username", lang)}</TableHead>
                    <TableHead>{t("bonus", lang)}</TableHead>
                    <TableHead>{t("game", lang)}</TableHead>
                    <TableHead>{t("transfer account", lang)}</TableHead>
                    <TableHead>{t("match status", lang)}</TableHead>
                    <TableHead>{t("amount", lang)}</TableHead>
                    <TableHead>{t("comment", lang)}</TableHead>
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
                        colSpan={process.status !== ProcessStatus.PROCESSING ? 11 : 10}
                        className="h-24 text-center"
                      >
                        {t("no matches found", lang)}
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
                              aria-label={t("select match id", lang) + " " + match.id}
                              disabled={match.transfer_account_id === null || match.status.toLowerCase() === "success"}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{match.username}</TableCell>
                        <TableCell>{match.bonus?.name || t("not available", lang)}</TableCell>
                        <TableCell>{match?.game}</TableCell>
                        <TableCell>
                          {match.transfer_account_id ? (
                            <span className="font-medium">
                              {match.transfer_account?.username || t("transfer account", lang)}
                            </span>
                          ) : (
                            <span className="text-gray-400">{t("not assigned", lang)}</span>
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
                          <button
                            onClick={() => handleCommentClick(match.comment)}
                            className="text-left hover:text-blue-600 hover:underline cursor-pointer max-w-32 truncate"
                            title={match.comment || t("no comment", lang)}
                          >
                            {truncateComment(match.comment)}
                          </button>
                        </TableCell>
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
                                    <p>{t("rematch individual player", lang)}</p>
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
                                        ? t("edit match details", lang)
                                        : hasPermission(permissionsMap, match.id, "edit")
                                          ? t("execute permitted edit", lang)
                                          : t("request to edit match", lang)}
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
                                    <p>{t("refilter player", lang)}</p>
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
            <p>{t("no matches found", lang)}</p>
          </div>
        )}
      </div>
    );
  }
}