"use client";

import { useState, useEffect } from "react";
import { Eye, Play, Square, MoreHorizontal, Search, Calendar } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/usercontext";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { Progress } from "@/components/ui/progress";
import { ProcessStatus,AppColor, Roles } from "@/constants/enums";
import { hasPermission, createRequest, fetchRequests } from "@/lib/requstHandling";
import {PaginationData} from  "@/types/pagination-data.type"
import {RequestData} from "@/types/request-data.type" 

interface User {
  id: string;
  name: string;
  email: string;
  profile_img?: string;
}

interface Process {
  id: string;
  status: string;
  progress: number;
  start_time: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
  isActive: boolean;
  user_id: string;
  user: User;
  from_date?: string;
  to_date?: string;
}
interface ApiResponse {
  data: Process[];
  success: boolean;
  pagination: PaginationData;
  activeProcess: boolean;
  message: string;
}

export default function ProcessManagementPage() {
  const { auth, isLoading } = useUser();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [processToStop, setProcessToStop] = useState<Process | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [hasActiveProcess, setHasActiveProcess] = useState(true);
  // Set default to true to prevent button from showing on initial load
  const [hasPendingOrProcessing, setHasPendingOrProcessing] = useState(true);
  const router = useRouter();

  // Permissions related states
  const [permissionsMap, setPermissionsMap] = useState<Map<string, RequestData>>(new Map());
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [completePermission, setCompletePermission] = useState<{modelId: string, action: string} | null>(null);

  // Date selection states
  const [startProcessDialogOpen, setStartProcessDialogOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateErrors, setDateErrors] = useState<{fromDate?: string; toDate?: string}>({});

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
      let key = "";  
      if(action === "create") {  
        key = `new:${action}`;
      } else {  
        key = `${modelId}:${action}`;
      }
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

  const fetchProcesses = async () => {
    if (auth) {
      if (!auth.canAccess("processes")) {
        router.push("/dashboard");
        return;
      }
    }
    
    try {
      setHasPendingOrProcessing(true);
      
      const queryParams = new URLSearchParams();
      queryParams.append("page", currentPage.toString());
      queryParams.append("limit", pageSize.toString());
  
      const response = await fetch(`/api/processes?${queryParams.toString()}`);
  
      if (!response.ok) {
        throw new Error("Failed to fetch processes");
      }
  
      const data: ApiResponse = await response.json();
      
      const mappedData = data.data.map(p => ({
        ...p,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        isActive: p.status.toLowerCase() === "running"
      }));
      
      setProcesses(mappedData);
      setPagination(data.pagination);
  
      // Check if there's any active process
      setHasActiveProcess(data.activeProcess);
  
      const hasActiveOrSemCompletedProcess = mappedData.some(p => 
        p.status === ProcessStatus.PENDING || 
        p.status === ProcessStatus.PROCESSING ||
        p.status === ProcessStatus.SEM_COMPLETED
      );
      
      setHasPendingOrProcessing(hasActiveOrSemCompletedProcess);
  
    } catch (error) {
      console.error("Error fetching processes:", error);
      toast.error("Failed to fetch processes");
      setHasPendingOrProcessing(true);
    }
  };

  useEffect(() => {
    if (!isLoading && auth) {
      fetchProcesses();
      loadPermissions();
    } else {
      // Keep the button hidden while loading by setting this to true
      setHasPendingOrProcessing(true);
    }
  }, [isLoading, auth, router, currentPage, pageSize]);

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

  const validateDateRange = () => {
    const errors: {fromDate?: string; toDate?: string} = {};
    
    // Validate from date
    if (!fromDate) {
      errors.fromDate = "Start date is required";
    } else {
      const fromDateObj = new Date(fromDate);
      const minDate = new Date("2020-01-01");
      
      if (fromDateObj < minDate) {
        errors.fromDate = "Start date cannot be before 2020";
      }
    }
    
    // Validate to date
    if (!toDate) {
      errors.toDate = "End date is required";
    } else if (fromDate) {
      const fromDateObj = new Date(fromDate);
      const toDateObj = new Date(toDate);
      
      if (toDateObj < fromDateObj) {
        errors.toDate = "End date must be after the start date";
      }
      
      // Check if date range is more than 3 months
      const threeMonthsInMs = 3 * 30 * 24 * 60 * 60 * 1000; // Approximate 3 months in milliseconds
      if (toDateObj.getTime() - fromDateObj.getTime() > threeMonthsInMs) {
        errors.toDate = "Date range cannot exceed 3 months";
      }
    }
    
    setDateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStartProcessClick = () => {
    if (auth?.role === Roles.Admin || hasPermission(permissionsMap, "new", "create")) {
      // Reset form
      setFromDate("");
      setToDate("");
      setDateErrors({});
      setStartProcessDialogOpen(true);
    } else {
      // Open request dialog
      setRequestMessage("");
      setRequestDialogOpen(true);
    }
  };

  const startProcess = async () => {
    if (!validateDateRange()) return;

    try {
      const response = await fetch("/api/processes/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from_date: fromDate,
          to_date: toDate
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start process");
      }

      // If this was a permission-based create, mark it as complete
      if (auth?.role !== Roles.Admin && hasPermission(permissionsMap, "new", "create")) {
        setCompletePermission({
          modelId: "new",
          action: "create"
        });
      }

      const result = await response.json();
      toast.success("Process started successfully");
      setStartProcessDialogOpen(false);
      fetchProcesses(); // Refresh the list
    } catch (error) {
      console.error("Error starting process:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start process");
    }
  };

  // Submit permission request
  const submitPermissionRequest = async () => {
    if (!auth || requestMessage.length < 10) return;
    
    try {
      const result = await createRequest(
        "Process",
        "new",
        "create",
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

  const stopProcess = async () => {
    if (!processToStop) return;

    try {
      const response = await fetch("/api/external/out/shutdown", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ process_id: processToStop.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to stop process");
      }

      const result = await response.json();
      toast.success("Process stopped successfully");
      fetchProcesses(); // Refresh the list
    } catch (error) {
      console.error("Error stopping process:", error);
      toast.error("Failed to stop process");
    } finally {
      setStopDialogOpen(false);
      setProcessToStop(null);
    }
  };

  const handleView = (process: Process) => {
    setSelectedProcess(process);
    setViewDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
        return "bg-green-100 text-green-800";
      case "stopped":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: "Process Management" }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Process Management</CardTitle>
          <div className="flex items-center space-x-2">
            {!hasPendingOrProcessing && (
              <Button onClick={handleStartProcessClick}>
                <Play className="mr-2 h-4 w-4" />
                {auth?.role === Roles.Admin || hasPermission(permissionsMap, "new", "create") 
                  ? "Create Process" 
                  : "Request to Create Process"}
              </Button>
            )}
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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Process ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Loading processes...
                    </TableCell>
                  </TableRow>
                ) : processes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No processes found
                    </TableCell>
                  </TableRow>
                ) : (
                  processes.map((process) => (
                    <TableRow key={process.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={process.user?.profile_img || undefined} alt={process.user?.name} />
                            <AvatarFallback>{process.user?.name?.substring(0, 2).toUpperCase() || 'UN'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div>{process.user?.name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{process.user?.email || 'No email'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{process.id}</TableCell>
                      <TableCell>
                       <span
                            className={`px-2 py-1 rounded-full  ${
                              process.status === ProcessStatus.PROCESSING
                                ? AppColor.INFO
                                : process.status === ProcessStatus.COMPLETED
                                  ? AppColor.SUCCESS
                                  : process.status === ProcessStatus.FAILED? 
                                    AppColor.ERROR
                                    : AppColor.WARNING
                            }`}
                          >
                          {process.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {process.from_date && process.to_date ? (
                          <div className="text-sm">
                            <div>{new Date(process.from_date).toLocaleDateString()}</div>
                            <div className="text-muted-foreground">to</div>
                            <div>{new Date(process.to_date).toLocaleDateString()}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not specified</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="w-full">
                          <Progress value={process.progress} className="h-2" />
                          <div className="text-xs text-right mt-1">{process.progress}%</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(process.start_time || process.created_at)}</TableCell>
                      <TableCell>{formatDate(process.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(process)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {process.status === ProcessStatus.PROCESSING && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setProcessToStop(process);
                                  setStopDialogOpen(true);
                                }}
                              >
                                <Square className="mr-2 h-4 w-4" />
                                Terminate Process
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{" "}
                of <span className="font-medium">{pagination.total}</span> processes
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => goToPage(1)}
                    disabled={isLoading || !pagination.hasPreviousPage}
                    size="sm"
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={isLoading || !pagination.hasPreviousPage}
                    size="sm"
                  >
                    Previous
                  </Button>
                  <span className="px-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={isLoading || !pagination.hasNextPage}
                    size="sm"
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => goToPage(pagination.totalPages)}
                    disabled={isLoading || !pagination.hasNextPage}
                    size="sm"
                  >
                    Last
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Process Dialog */}
      <Dialog open={startProcessDialogOpen} onOpenChange={setStartProcessDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Process</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="from_date">From Date</Label>
              <div className="relative">
                <Input
                  id="from_date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  min="2020-01-01"
                  max={toDate || undefined}
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              {dateErrors.fromDate && (
                <p className="text-sm text-red-500">{dateErrors.fromDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="to_date">To Date</Label>
              <div className="relative">
                <Input
                  id="to_date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  min={fromDate || "2020-01-01"}
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              {dateErrors.toDate && (
                <p className="text-sm text-red-500">{dateErrors.toDate}</p>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              <p>Note: Date range cannot exceed 3 months and must be after 2020.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartProcessDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={startProcess}>Start Process</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request Permission to Create Process</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="request_message">Reason for Request</Label>
              <Textarea
                id="request_message"
                placeholder="Explain why you need to create a process..."
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
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
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

      {/* Stop Process Dialog */}
      <ConfirmationDialog
        isOpen={stopDialogOpen}
        onClose={() => setStopDialogOpen(false)}
        onConfirm={stopProcess}
        title="Confirm Process Termination"
        children="Are you sure you want to terminate this process? This action cannot be undone."
        confirmText="Terminate"
      />

      {/* View Process Dialog */}
      <ConfirmationDialog
        isOpen={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        onConfirm={() => setViewDialogOpen(false)}
        title="Process Details"
        confirmText="Close"
        showCancelButton={false}
      >
        {selectedProcess && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-4">
              <Avatar>
                <AvatarImage src={selectedProcess.user?.profile_img || undefined} alt={selectedProcess.user?.name} />
                <AvatarFallback>{selectedProcess.user?.name?.substring(0, 2).toUpperCase() || 'UN'}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{selectedProcess.user?.name || 'Unknown'}</div>
                <div className="text-sm text-muted-foreground">{selectedProcess.user?.email || 'No email'}</div>
              </div>
              <span
                className={`ml-auto px-2 py-1 rounded-full text-xs ${getStatusColor(selectedProcess.status)}`}
              >
                {selectedProcess.status}
              </span>
            </div>
            
            <p className="font-medium">Process ID: {selectedProcess.id}</p>
            
            {selectedProcess.from_date && selectedProcess.to_date && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Date Range:</p>
                <p className="text-sm">From: {new Date(selectedProcess.from_date).toLocaleDateString()}</p>
                <p className="text-sm">To: {new Date(selectedProcess.to_date).toLocaleDateString()}</p>
              </div>
            )}
            
            <div className="mt-2">
              <p className="text-sm font-medium mb-1">Progress:</p>
              <Progress value={selectedProcess.progress} className="h-2" />
              <div className="text-xs text-right mt-1">{selectedProcess.progress}%</div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Started: {formatDate(selectedProcess.start_time || selectedProcess.created_at)}
            </p>
            
            {selectedProcess.end_time && (
              <p className="text-sm text-muted-foreground">
                Ended: {formatDate(selectedProcess.end_time)}
              </p>
            )}
            
            <p className="text-sm text-muted-foreground">
              Last Updated: {formatDate(selectedProcess.updated_at)}
            </p>
            
            <p className="text-sm text-muted-foreground">
              Status: {selectedProcess.status}
            </p>
            
            <p className="text-sm text-muted-foreground">
              Active: {selectedProcess.isActive ? "Yes" : "No"}
            </p>
            
            <p className="text-sm text-muted-foreground">
              User ID: {selectedProcess.user_id}
            </p>
          </div>
        )}
      </ConfirmationDialog>
    </div>
  );
}