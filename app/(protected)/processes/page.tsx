"use client";

import { useState, useEffect } from "react";
import { Eye, Play, Square, MoreHorizontal, Search } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/usercontext";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import toast from "react-hot-toast";
import { Progress } from "@/components/ui/progress";
import { ProcessStatus } from "@/constants/processStatus";
import  {AppColor} from  "@/constants/colors"


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
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
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
  const router = useRouter();

  const fetchProcesses = async () => {
    if (auth) {
      if (!auth.canAccess("processes")) {
        router.push("/dashboard");
        return;
      }
    }
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append("page", currentPage.toString());
      queryParams.append("limit", pageSize.toString());

      const response = await fetch(`/api/processes?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch processes");
      }

      const data: ApiResponse = await response.json();
      
      // Map the API response to our Process interface
      const mappedData = data.data.map(p => ({
        ...p,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        // Determine active status (a process is active if status is "running")
        isActive: p.status.toLowerCase() === "running"
      }));
      
      setProcesses(mappedData);
      setPagination(data.pagination);


      // Check if there's any active process
      setHasActiveProcess(data.activeProcess);

    } catch (error) {
      console.error("Error fetching processes:", error);
      toast.error("Failed to fetch processes");
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, [isLoading, auth, router, currentPage, pageSize]);

  const startProcess = async () => {
    try {
      const response = await fetch("/api/processes/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Failed to start process");
      }

      const result = await response.json();
      toast.success("Process started successfully");
      fetchProcesses(); // Refresh the list
    } catch (error) {
      console.error("Error starting process:", error);
      toast.error("Failed to start process");
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
            {!hasActiveProcess && (
              <Button onClick={startProcess}>
                <Play className="mr-2 h-4 w-4" />
                Create Process
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
                  <TableHead>Progress</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading processes...
                    </TableCell>
                  </TableRow>
                ) : processes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
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
                            {process.status ==  ProcessStatus.PROCESSING && (
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

      <ConfirmationDialog
        isOpen={stopDialogOpen}
        onClose={() => setStopDialogOpen(false)}
        onConfirm={stopProcess}
        title="Confirm Process Termination"
        children="Are you sure you want to terminate this process? This action cannot be undone."
        confirmText="Terminate"
      />

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