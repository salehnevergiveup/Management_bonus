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
import { AppColor,RequestStatus } from "@/constants/enums";
import toast from "react-hot-toast";
import {PaginationData} from  "@/types/pagination-data.type"
import   {GetResponse} from "@/types/get-response.type" 

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

  const updateRequestStatus = async () => {
    if (!requestToUpdate || !newStatus) return;
    
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
                  <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                    <p className="whitespace-pre-wrap">{selectedRequest.message}</p>
                  </div>
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
            <p>Are you sure you want to change the status to <strong>{newStatus}</strong>?</p>
            <p className="mt-2">This will notify the requestor of the status change.</p>
          </>
        }
        confirmText="Update Status"
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