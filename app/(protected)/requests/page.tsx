"use client";

import { useState, useEffect, useMemo } from "react";
import { Eye, Trash, Search, CheckCircle, XCircle, Clock } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/usercontext";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/dialog";
import { Badge } from "@/components/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AppColor, RequestStatus } from "@/constants/enums";
import toast from "react-hot-toast";
import { PaginationData } from "@/types/pagination-data.type";
import { GetResponse } from "@/types/get-response.type";

interface User {
  id: string;
  username: string;
}

interface Request {
  id: string;
  sender_id: string;
  marked_admin_id: string | null;
  status: string;
  message: string;
  model_name: string;
  model_id: string;
  action: string;
  created_at: string;
  updated_at: string;
  sender: User;
  admin: User | null;
}

interface MatchData {
  username: string;
  amount: number;
  currency: string;
  transfer_account_id: string;
  process_id: string;
}

interface CreateMatchRequestData {
  matches: MatchData[];
  reason: string;
}

export default function RequestManagementPage() {
  const { auth, isLoading } = useUser();
  const [allRequests, setAllRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<Request | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [requestToUpdate, setRequestToUpdate] = useState<Request | null>(null);
  const router = useRouter();
  const isAdmin = auth?.role === "admin";

  // Selected requests and bulk action states
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [bulkActionDialog, setBulkActionDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<{ type: string; value: string | null } | null>(null);

  // Fetch all request data
  const fetchRequests = async () => {
    if (auth) {
      if (!auth.canAccess("requests")) {
        router.push("/dashboard");
        return;
      }
    }
    try {
      const response = await fetch(`/api/requests?all=true`);

      if (!response.ok) {
        throw new Error("Failed to fetch requests");
      }

      const data: GetResponse = await response.json();
      setAllRequests(data.data);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to fetch requests");
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchRequests();
  }, [isLoading, auth, router]);

  // Reset selections when filters change
  useEffect(() => {
    setSelectedRequests([]);
    setSelectAllChecked(false);
  }, [statusFilter, searchTerm]);

  // Filter requests based on search term and status filter
  useEffect(() => {
    let result = [...allRequests];

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(request => 
        request.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(request => 
        (request.sender?.username && request.sender.username.toLowerCase().includes(term)) ||
        (request.model_name && request.model_name.toLowerCase().includes(term)) ||
        (request.message && request.message.toLowerCase().includes(term)) ||
        (request.action && request.action.toLowerCase().includes(term))
      );
    }

    setFilteredRequests(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [allRequests, searchTerm, statusFilter]);

  // Paginate the filtered requests
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRequests.slice(startIndex, startIndex + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // Calculate pagination details
  const calculatedPagination = useMemo(() => {
    const totalItems = filteredRequests.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    
    return {
      total: totalItems,
      page: currentPage,
      limit: pageSize,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    };
  }, [filteredRequests, currentPage, pageSize]);

  // Update pagination state when calculated values change
  useEffect(() => {
    setPagination(calculatedPagination);
  }, [calculatedPagination]);

  // Check if request is a create match request with data
  const isCreateMatchRequest = (request: Request): boolean => {
    // Check if it's a Match creation request
    if (request.model_name === "Match" && request.action === "create") {
      try {
        const message = request.message;
        console.log("Checking if create match request, message:", message);
        
        // Check for various patterns that indicate match data
        if (message.includes('matches') && 
            (message.includes('username') || message.includes('amount') || message.includes('transfer_account_id'))) {
          return true;
        }
        
        // Try to parse and check
        try {
          let testMsg = message;
          if (testMsg.startsWith('"') && testMsg.endsWith('"')) {
            testMsg = testMsg.slice(1, -1).replace(/\\"/g, '"');
          }
          const parsed = JSON.parse(testMsg);
          return !!parsed.matches;
        } catch {
          // If parsing fails, still check for patterns
          return message.includes('matches') && message.includes('[');
        }
      } catch {
        return false;
      }
    }
    return false;
  };

  // Parse create match request data
  const parseCreateMatchRequest = (message: string): CreateMatchRequestData | null => {
    console.log("Raw message:", message);
    
    try {
      // First, try direct parse
      const data = JSON.parse(message);
      if (data.matches && Array.isArray(data.matches)) {
        return data;
      }
    } catch (e) {
      // Parsing failed, continue with other methods
      console.log("Direct parse failed, trying other methods");
    }

    // If the message appears to be a stringified JSON
    if (message.startsWith('"') && message.endsWith('"')) {
      try {
        // Remove outer quotes and unescape internal quotes
        let cleaned = message.slice(1, -1);
        
        // Replace escaped characters
        cleaned = cleaned
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t');
        
        console.log("Cleaned message:", cleaned);
        
        const data = JSON.parse(cleaned);
        if (data.matches && Array.isArray(data.matches)) {
          return data;
        }
      } catch (e) {
        console.log("Stringified JSON parse failed:", e);
      }
    }

    // Try to find JSON within the message
    try {
      const jsonStart = message.indexOf('{');
      const jsonEnd = message.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = message.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(jsonStr);
        if (data.matches && Array.isArray(data.matches)) {
          return data;
        }
      }
    } catch (e) {
      console.log("JSON extraction failed:", e);
    }

    // Final attempt: Create a test object to see if the message has the right structure
    try {
      // Check if the message has the expected structure even if we can't parse it
      if (message.includes('matches') && message.includes('[')) {
        // Try to extract matches array manually
        const matchesStart = message.indexOf('"matches"');
        if (matchesStart !== -1) {
          const arrayStart = message.indexOf('[', matchesStart);
          const arrayEnd = message.lastIndexOf(']');
          
          if (arrayStart !== -1 && arrayEnd !== -1) {
            const matchesArray = message.substring(arrayStart, arrayEnd + 1);
            
            // Try to find reason
            let reason = "No reason provided";
            const reasonMatch = message.match(/"reason"\s*:\s*"([^"]+)"/);
            if (reasonMatch) {
              reason = reasonMatch[1];
            }
            
            // Manually construct the object
            try {
              const matches = JSON.parse(matchesArray);
              return {
                matches: matches,
                reason: reason
              };
            } catch (e) {
              console.log("Manual construction failed:", e);
            }
          }
        }
      }
    } catch (e) {
      console.log("Final parsing attempt failed:", e);
    }

    return null;
  };

  // Handle create match request acceptance
  const handleCreateMatchAcceptance = async (request: Request) => {
    console.log("Handling create match acceptance for request:", request);
    
    const matchData = parseCreateMatchRequest(request.message);
    console.log("Parsed match data:", matchData);
    
    if (!matchData || !matchData.matches || matchData.matches.length === 0) {
      toast.error("Invalid match data in request");
      return;
    }

    try {
      // First, update the request status
      const statusResponse = await fetch(`/api/requests/${request.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: RequestStatus.ACCEPTED
        }),
      });

      if (!statusResponse.ok) {
        throw new Error("Failed to update request status");
      }

      // Then, create the matches
      console.log("Sending matches to create:", matchData.matches);
      
      const createResponse = await fetch(`/api/matches/create-matches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ matches: matchData.matches }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        console.error("Match creation error:", errorData);
        throw new Error(errorData.error || "Failed to create matches");
      }

      toast.success(`Request accepted and ${matchData.matches.length} matches created successfully`);
      fetchRequests(); // Refresh data
    } catch (error) {
      console.error("Error handling create match acceptance:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process request");
    }
  };

  const updateRequestStatus = async () => {
    if (!requestToUpdate || !newStatus) return;
    
    // If it's a create match request being accepted, handle it specially
    if (isCreateMatchRequest(requestToUpdate) && newStatus === RequestStatus.ACCEPTED) {
      await handleCreateMatchAcceptance(requestToUpdate);
      setStatusUpdateDialogOpen(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/requests/${requestToUpdate.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update request status");
      }

      toast.success(`Request status updated to ${newStatus}`);
      setStatusUpdateDialogOpen(false);
      fetchRequests(); // Refresh data after update
    } catch (error) {
      console.error("Error updating request status:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update request status");
    }
  };

  // Bulk update status
  const bulkUpdateStatus = async () => {
    if (!bulkAction || selectedRequests.length === 0) return;

    try {
      // If bulk accepting, check for create match requests
      if (bulkAction.value === RequestStatus.ACCEPTED) {
        const createMatchRequests = allRequests.filter(req => 
          selectedRequests.includes(req.id) && isCreateMatchRequest(req)
        );

        if (createMatchRequests.length > 0) {
          toast.error("Bulk accepting create match requests is not supported. Please accept them individually.");
          return;
        }
      }

      const response = await fetch(`/api/requests`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestIds: selectedRequests,
          status: bulkAction.value
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update requests");
      }

      toast.success(`Successfully updated ${selectedRequests.length} requests`);
      setBulkActionDialog(false);
      setSelectedRequests([]);
      setSelectAllChecked(false);
      fetchRequests(); // Refresh data after update
    } catch (error) {
      console.error("Error updating requests:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update requests");
    }
  };

  // Bulk delete
  const bulkDelete = async () => {
    if (selectedRequests.length === 0) return;

    try {
      const response = await fetch(`/api/requests`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestIds: selectedRequests
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete requests");
      }

      toast.success(`Successfully deleted ${selectedRequests.length} requests`);
      setBulkActionDialog(false);
      setSelectedRequests([]);
      setSelectAllChecked(false);
      fetchRequests(); // Refresh data after delete
    } catch (error) {
      console.error("Error deleting requests:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete requests");
    }
  };

  const deleteRequest = async () => {
    if (!requestToDelete) return;

    try {
      const response = await fetch(`/api/requests/${requestToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete request");
      }

      toast.success("Request deleted successfully");
      fetchRequests(); // Refresh data after delete
    } catch (error) {
      console.error("Error deleting request:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete request");
    } finally {
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
    }
  };

  const handleStatusUpdate = (request: Request, status: string) => {
    setRequestToUpdate(request);
    setNewStatus(status);
    setStatusUpdateDialogOpen(true);
  };

  const handleViewRequest = (request: Request) => {
    setSelectedRequest(request);
    setViewDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case RequestStatus.ACCEPTED:
        return AppColor.SUCCESS;
      case RequestStatus.REJECTED.toLowerCase():
        return AppColor.ERROR;
      case RequestStatus.PENDING.toLowerCase():
        return AppColor.WARNING;
      default:
        return AppColor.INFO;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case RequestStatus.ACCEPTED.toLowerCase():
        return <CheckCircle className="h-4 w-4 mr-1" />;
      case RequestStatus.REJECTED.toLowerCase():
        return <XCircle className="h-4 w-4 mr-1" />;
      case RequestStatus.PENDING.toLowerCase():
        return <Clock className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  // Handle checkbox selection
  const toggleRequestSelection = (requestId: string) => {
    setSelectedRequests(prevSelected => {
      if (prevSelected.includes(requestId)) {
        return prevSelected.filter(id => id !== requestId);
      } else {
        return [...prevSelected, requestId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectAllChecked) {
      setSelectedRequests([]);
    } else {
      const allRequestIds = paginatedRequests.map(request => request.id);
      setSelectedRequests(allRequestIds);
    }
    setSelectAllChecked(!selectAllChecked);
  };

  // Handle bulk actions
  const handleBulkAction = (action: string, value?: string) => {
    if (selectedRequests.length === 0) {
      toast.error("Please select at least one request");
      return;
    }

    setBulkAction({ type: action, value: value || null });
    setBulkActionDialog(true);
  };

  const executeBulkAction = async () => {
    if (!bulkAction) return;

    switch (bulkAction.type) {
      case 'status':
        await bulkUpdateStatus();
        break;
      case 'delete':
        await bulkDelete();
        break;
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency 
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: "Request Management" }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Request Management</CardTitle>
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
                <SelectItem value={RequestStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={RequestStatus.ACCEPTED}>Accepted</SelectItem>
                <SelectItem value={RequestStatus.REJECTED}>Rejected</SelectItem>
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
                placeholder="Search requests..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedRequests.length} request{selectedRequests.length !== 1 ? 's' : ''} selected
              </span>
              {selectedRequests.length > 0 && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setSelectedRequests([]);
                      setSelectAllChecked(false);
                    }}
                  >
                    Clear selection
                  </Button>
                  
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-green-50 hover:bg-green-100 border-green-200"
                        onClick={() => handleBulkAction('status', RequestStatus.ACCEPTED)}
                      >
                        <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                        Accept All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-red-50 hover:bg-red-100 border-red-200"
                        onClick={() => handleBulkAction('status', RequestStatus.REJECTED)}
                      >
                        <XCircle className="h-4 w-4 text-red-500 mr-1" />
                        Reject All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
                        onClick={() => handleBulkAction('status', RequestStatus.PENDING)}
                      >
                        <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                        Pending All
                      </Button>
                    </div>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-red-50 hover:bg-red-100 border-red-200"
                    onClick={() => handleBulkAction('delete')}
                  >
                    <Trash className="h-4 w-4 text-red-500 mr-1" />
                    Delete All
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectAllChecked}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Requestor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      Loading requests...
                    </TableCell>
                  </TableRow>
                ) : paginatedRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="w-[50px]">
                        <Checkbox
                          checked={selectedRequests.includes(request.id)}
                          onCheckedChange={() => toggleRequestSelection(request.id)}
                          aria-label={`Select request ${request.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{request.sender?.username || 'Unknown'}</TableCell>
                      <TableCell>{request.action || 'N/A'}</TableCell>
                      <TableCell>{request.model_name}</TableCell>
                      <TableCell>
                        <Badge
                          color={getStatusColor(request.status)}
                          text={request.status}
                        />
                      </TableCell>
                      <TableCell>{request.admin?.username || 'Not assigned'}</TableCell>
                      <TableCell>{formatDate(request.created_at)}</TableCell>
                      <TableCell>{formatDate(request.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewRequest(request)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {isAdmin && (
                            <>
                              {request.status !== RequestStatus.ACCEPTED && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-green-50 hover:bg-green-100 border-green-200"
                                  onClick={() => handleStatusUpdate(request, RequestStatus.ACCEPTED)}
                                  title="Accept request"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                </Button>
                              )}
                              
                              {request.status !== RequestStatus.REJECTED && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-red-50 hover:bg-red-100 border-red-200"
                                  onClick={() => handleStatusUpdate(request, RequestStatus.REJECTED)}
                                  title="Reject request"
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                              
                              {request.status !== RequestStatus.PENDING && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
                                  onClick={() => handleStatusUpdate(request, RequestStatus.PENDING)}
                                  title="Mark as pending"
                                >
                                  <Clock className="h-4 w-4 text-yellow-500" />
                                </Button>
                              )}
                            </>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-red-50 hover:bg-red-100 border-red-200"
                            onClick={() => {
                              setRequestToDelete(request);
                              setDeleteDialogOpen(true);
                            }}
                            title="Delete request"
                          >
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination && filteredRequests.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{" "}
                of <span className="font-medium">{pagination.total}</span> requests
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

      {/* View Request Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedRequest && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Requestor</Label>
                    <p className="font-medium">{selectedRequest.sender?.username || 'Unknown'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Status</Label>
                    <div className="pt-1">
                      <Badge
                        color={getStatusColor(selectedRequest.status)}
                        text={selectedRequest.status}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Action</Label>
                    <p className="font-medium">{selectedRequest.action || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Model</Label>
                    <p className="font-medium">{selectedRequest.model_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Model ID</Label>
                    <p className="font-medium">{selectedRequest.model_id}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Handled By</Label>
                    <p className="font-medium">{selectedRequest.admin?.username || 'Not assigned'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Created</Label>
                    <p className="font-medium">{formatDate(selectedRequest.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Updated</Label>
                    <p className="font-medium">{formatDate(selectedRequest.updated_at)}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Message</Label>
                  {(() => {
                    console.log("=== Debug Info ===");
                    console.log("Request Model Name:", selectedRequest.model_name);
                    console.log("Request Action:", selectedRequest.action);
                    console.log("Request Model ID:", selectedRequest.model_id);
                    console.log("Message type:", typeof selectedRequest.message);
                    console.log("Message content:", selectedRequest.message);
                    console.log("Is Create Match Request:", isCreateMatchRequest(selectedRequest));
                    
                    // Try different approaches to parse the message
                    let parsedData = null;
                    
                    // Approach 1: Direct parse attempt
                    if (isCreateMatchRequest(selectedRequest)) {
                      parsedData = parseCreateMatchRequest(selectedRequest.message);
                      console.log("Parse result:", parsedData);
                    }
                    
                    // Approach 2: If parsing failed, try manual extraction
                    if (!parsedData && selectedRequest.message.includes('matches')) {
                      try {
                        // Look for the JSON structure within the message
                        const messageStr = selectedRequest.message;
                        const matchesMatch = messageStr.match(/\{"matches":\[(.*?)\],"reason":"(.*?)"\}/);
                        
                        if (matchesMatch) {
                          console.log("Found matches via regex");
                          // Try to create a clean JSON string and parse it
                          const cleanJson = matchesMatch[0].replace(/\\"/g, '"');
                          parsedData = JSON.parse(cleanJson);
                        }
                      } catch (e) {
                        console.log("Manual extraction failed:", e);
                      }
                    }
                    
                    if (parsedData && parsedData.matches) {
                      // Display formatted match data
                      return (
                        <div className="mt-2 space-y-4">
                          {parsedData.reason && (
                            <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                              <p className="text-blue-900"><strong>Reason:</strong> {parsedData.reason}</p>
                            </div>
                          )}
                          
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              Matches to Create ({parsedData.matches.length})
                            </h4>
                            <div className="overflow-x-auto border rounded-lg">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-gray-50">
                                    <TableHead className="font-semibold">Username</TableHead>
                                    <TableHead className="font-semibold">Amount</TableHead>
                                    <TableHead className="font-semibold">Currency</TableHead>
                                    <TableHead className="font-semibold">Transfer Account</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {parsedData.matches.map((match: any, index: number) => (
                                    <TableRow key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                      <TableCell className="font-medium">{match.username}</TableCell>
                                      <TableCell>{match.amount}</TableCell>
                                      <TableCell>{match.currency}</TableCell>
                                      <TableCell className="font-mono text-xs">
                                        {match.transfer_account_id?.substring(0, 8)}...
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      // Display raw message
                      return (
                        <div className="mt-2">
                          <div className="p-3 bg-gray-100 rounded-md border border-gray-300">
                            <pre className="whitespace-pre-wrap break-all text-sm font-mono text-gray-800">
                              {selectedRequest.message}
                            </pre>
                          </div>
                          {isCreateMatchRequest(selectedRequest) && (
                            <p className="text-sm text-amber-600 mt-2">
                              ⚠️ This appears to be a match creation request, but the data couldn't be parsed.
                            </p>
                          )}
                        </div>
                      );
                    }
                  })()}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={statusUpdateDialogOpen}
        onClose={() => setStatusUpdateDialogOpen(false)}
        onConfirm={updateRequestStatus}
        title={`Update Request Status`}
        children={
          <>
            {requestToUpdate && isCreateMatchRequest(requestToUpdate) && newStatus === RequestStatus.ACCEPTED ? (
              <>
                <p>Are you sure you want to accept this match creation request?</p>
                <p className="mt-2 text-green-600 font-semibold">This will create the following matches:</p>
                {(() => {
                  const matchData = parseCreateMatchRequest(requestToUpdate.message);
                  if (matchData && matchData.matches) {
                    return (
                      <div className="mt-3 border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead>Username</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Currency</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {matchData.matches.map((match, index) => (
                              <TableRow key={index}>
                                <TableCell>{match.username}</TableCell>
                                <TableCell>{match.amount}</TableCell>
                                <TableCell>{match.currency}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  } else {
                    return (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          Warning: Unable to parse match data. The request will be accepted but matches may need to be created manually.
                        </p>
                      </div>
                    );
                  }
                })()}
              </>
            ) : (
              <>
                <p>Are you sure you want to change the status to <strong>{newStatus}</strong>?</p>
                <p className="mt-2">This will notify the requestor of the status change.</p>
              </>
            )}
          </>
        }
        confirmText={newStatus === RequestStatus.ACCEPTED && requestToUpdate && isCreateMatchRequest(requestToUpdate) ? "Accept & Create Matches" : "Update Status"}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={deleteRequest}
        title="Confirm Delete"
        children={
          <>
            <p>Are you sure you want to delete this request?</p>
            <p className="mt-2">This action cannot be undone.</p>
          </>
        }
        confirmText="Delete"
      />

      {/* Bulk Action Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={bulkActionDialog}
        onClose={() => setBulkActionDialog(false)}
        onConfirm={executeBulkAction}
        title={bulkAction?.type === 'delete' ? 'Confirm Bulk Delete' : 'Confirm Bulk Status Update'}
        children={
          <>
            {bulkAction?.type === 'delete' ? (
              <>
                <p>Are you sure you want to delete <strong>{selectedRequests.length}</strong> selected requests?</p>
                <p className="mt-2 text-red-600">This action cannot be undone.</p>
              </>
            ) : (
              <>
                <p>Are you sure you want to update the status of <strong>{selectedRequests.length}</strong> selected requests to <strong>{bulkAction?.value}</strong>?</p>
                {bulkAction?.value === RequestStatus.ACCEPTED && (
                  <p className="mt-2 text-yellow-600">Note: Create match requests cannot be bulk accepted and will be skipped.</p>
                )}
                <p className="mt-2">This will notify all affected requestors of the status change.</p>
              </>
            )}
          </>
        }
        confirmText={bulkAction?.type === 'delete' ? 'Delete All' : 'Update All'}
      />
    </div>
  );
}