"use client";

import { useState, useEffect } from "react";
import { Eye, Play,MoreHorizontal, Calendar, AlertCircle,Pause,RefreshCw ,XCircle, Trash2} from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/usercontext";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle,DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { ProcessStatus, AppColor } from "@/constants/enums";
import { PaginationData } from "@/types/pagination-data.type";
import { Alert, AlertDescription } from "@components/ui/alert";
import { ProcessDetailsDialog } from "@/components/process-details-dialog"
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

interface AgentAccount {
  id: string;
  username: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  profile_img?: string;
}

interface ConnectedUser {
  id: string;
  username: string;
}

interface Process {
  id: string;
  process_name: string;
  status: string;
  start_time: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
  isActive: boolean;
  user_id: string;
  user: User;
  from_date?: string;
  to_date?: string;
  connected_users?: ConnectedUser[]; // Added connected users list
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
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [hasActiveProcess, setHasActiveProcess] = useState(true);
  const [hasPendingOrProcessing, setHasPendingOrProcessing] = useState(true);
  const router = useRouter();
  const [agentAccounts, setAgentAccounts] = useState<AgentAccount[]>([]);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [selectedTerminateProcess, setSelectedTerminateProcess] = useState<Process | null>(null);
  const [isTerminating, setIsTerminating] = useState(false);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null)

  // Date selection states
  const [startProcessDialogOpen, setStartProcessDialogOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateErrors, setDateErrors] = useState<{fromDate?: string; toDate?: string}>({});
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const todayDate = new Date().toISOString().split('T')[0]; 
  const [hasPendingProcess, setHasPendingProcess] = useState(false);
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  const [markFailedDialogOpen, setMarkFailedDialogOpen] = useState(false)
  const [processToMarkFailed, setProcessToMarkFailed] = useState<Process | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [processToDelete, setProcessToDelete] = useState<Process | null>(null)
  const [processName, setProcessName] = useState("")
  const [processNameError, setProcessNameError] = useState<string | null>(null)
  const { lang, setLang } = useLanguage()


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
        p.status === ProcessStatus.PROCESSING 
      );
      
      setHasPendingOrProcessing(hasActiveOrSemCompletedProcess);
  
    } catch (error) {
      console.error("Error fetching processes:", error);
      toast.error("Failed to fetch processes");
      setHasPendingOrProcessing(true);
    }
  };

  const handleTerminate = (process: Process) => {
    setSelectedTerminateProcess(process);
    setTerminateDialogOpen(true);
  };
  
  const confirmTerminate = async () => {
    if (!selectedTerminateProcess) return;
   
    setIsTerminating(true);
    try {
      const response = await fetch(`/api/processes/${selectedTerminateProcess.id}/terminate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to terminate process");
      }
  
      const result = await response.json();
      toast.success(result.message || "Process terminated successfully");
      setTerminateDialogOpen(false);
      fetchProcesses(); // Refresh the list
    } catch (error) {
      console.error("Error terminating process:", error);
      toast.error(error instanceof Error ? error.message : "Failed to terminate process");
    } finally {
      setIsTerminating(false);
      setSelectedTerminateProcess(null);
    }
  };

  const fetchAgentAccounts = async () => {
    try {
      const response = await fetch(`/api/agent-accounts?all`);
      if (!response.ok) throw new Error("Failed to fetch agent accounts");
      
      const data = await response.json();
      console.log(data.data)
      setAgentAccounts(data.data);
    } catch (error) {
      console.error(error);
      toast.error("Error loading agent accounts");
    }
  };

  useEffect(() => {
    if (!isLoading && auth) {
      fetchProcesses();
      fetchProcesses();
      fetchAgentAccounts();
    } else {
      // Keep the button hidden while loading by setting this to true
      setHasPendingOrProcessing(true);
    }
  }, [isLoading, auth, router, currentPage, pageSize]);


  const validateDateRange = () => {
    const errors: {fromDate?: string; toDate?: string} = {};
    
    // Create today date at the end of the day to include today itself
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today
    
    // Validate from date
    if (!fromDate) {
      errors.fromDate = "Start date is required";
    } else {
      const fromDateObj = new Date(fromDate);
      fromDateObj.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      
      const minDate = new Date("2020-01-01");
      
      if (fromDateObj < minDate) {
        errors.fromDate = "Start date cannot be before 2020";
      }
      
      // Compare with tomorrow instead of today to allow today's date
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (fromDateObj >= tomorrow) {
        errors.fromDate = "Start date cannot be in the future";
      }
    }
    
    // Validate to date
    if (!toDate) {
      errors.toDate = "End date is required";
    } else {
      const toDateObj = new Date(toDate);
      toDateObj.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      
      // Compare with tomorrow instead of today to allow today's date
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (toDateObj >= tomorrow) {
        errors.toDate = "End date cannot be in the future";
      }
      
      if (fromDate) {
        const fromDateObj = new Date(fromDate);
        fromDateObj.setHours(12, 0, 0, 0); // Set to noon
        
        if (toDateObj < fromDateObj) {
          errors.toDate = "End date must be after the start date";
        }
        
        // Check if date range is more than 3 months
        const threeMonthsInMs = 3 * 30 * 24 * 60 * 60 * 1000; // Approximate 3 months in milliseconds
        if (toDateObj.getTime() - fromDateObj.getTime() > threeMonthsInMs) {
          errors.toDate = "Date range cannot exceed 3 months";
        }
      }
    }
    
    setDateErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleStartProcessClick = () => {
    // Reset form
    setProcessName("")
    setProcessNameError(null)
    setFromDate("");
    setToDate("");
    setDateErrors({});
    setSelectedAgents([]);
    setStartProcessDialogOpen(true);
  };

  const startProcess = async () => {
    const isProcessNameValid = validateProcessName()

    // Validate date range
    const isDateRangeValid = validateDateRange()

    // If either validation fails, return early
    if (!isProcessNameValid || !isDateRangeValid) {
      return
    }

    try {
      const response = await fetch("/api/processes/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          process_name: processName.trim(),
          from_date: fromDate,
          to_date: toDate,
          agent_accounts: selectedAgents,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start process");
      }

      const result = await response.json();
      toast.success(result.message);
      setStartProcessDialogOpen(false);
      fetchProcesses(); // Refresh the list
    } catch (error) {
      console.error("Error starting process:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start process");
    }
  };

  const handleView = (process: Process) => {
    setSelectedProcessId(process.id)
    setViewDialogOpen(true);
  };

  const handleMakeOnHold = async (process: Process) => {
    if (process.status !== ProcessStatus.PENDING) {
      toast.error("Only pending processes can be put on hold")
      return
    }

    setIsStatusChanging(true)
    try {
      const response = await fetch(`/api/processes/${process.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: ProcessStatus.ONBHOLD,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update process status")
      }

      const result = await response.json()
      toast.success(result.message || "Process status updated to On Hold")
      fetchProcesses() // Refresh the list
    } catch (error) {
      console.error("Error updating process status:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update process status")
    } finally {
      setIsStatusChanging(false)
    }
  }

  // Modified handleMakePending function to use the enum
  const handleMakePending = async (process: Process) => {
    if (process.status !== ProcessStatus.ONBHOLD) {
      toast.error("Only on-hold processes can be made pending")
      return
    }

    if (hasPendingProcess) {
      toast.error("Cannot make process pending while another pending process exists")
      return
    }

    setIsStatusChanging(true)
    try {
      const response = await fetch(`/api/processes/${process.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: ProcessStatus.PENDING,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update process status")
      }

      const result = await response.json()
      toast.success(result.message || "Process status updated to Pending")
      fetchProcesses() // Refresh the list
    } catch (error) {
      console.error("Error updating process status:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update process status")
    } finally {
      setIsStatusChanging(false)
    }
  }

  const handleMarkFailedClick = (process: Process) => {
    setProcessToMarkFailed(process)
    setMarkFailedDialogOpen(true)
  }

  const validateProcessName = () => {
    if (!processName.trim()) {
      setProcessNameError("Process name is required")
      return false
    }
    setProcessNameError(null)
    return true
  }


  // New function to handle confirming mark as failed
  const confirmMarkFailed = async () => {
    if (!processToMarkFailed) return

    setIsStatusChanging(true)
    try {
      const response = await fetch(`/api/processes/${processToMarkFailed.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: ProcessStatus.FAILED,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update process status")
      }

      const result = await response.json()
      toast.success(result.message || "Process status updated to Failed")
      setMarkFailedDialogOpen(false)
      fetchProcesses() // Refresh the list
    } catch (error) {
      console.error("Error updating process status:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update process status")
    } finally {
      setIsStatusChanging(false)
    }
  }

  const handleDeleteClick = (process: Process) => {
    setProcessToDelete(process)
    setDeleteDialogOpen(true)
  }

  // New function to handle confirming process deletion
  const confirmDelete = async () => {
    if (!processToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/processes/${processToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete process")
      }

      const result = await response.json()
      toast.success(result.message || "Process deleted successfully")
      setDeleteDialogOpen(false)
      fetchProcesses() // Refresh the list
    } catch (error) {
      console.error("Error deleting process:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete process")
    } finally {
      setIsDeleting(false)
    }
  }

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
      <Breadcrumb items={[{ label: t("process_management", lang) }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{t("process_management", lang)}</CardTitle>
          <div className="flex items-center space-x-2">
            {!hasPendingOrProcessing && (
              <Button onClick={handleStartProcessClick}>
                <Play className="mr-2 h-4 w-4" />
                {t("start_process", lang)}
              </Button>
            )}
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
                <SelectItem value="5">{`5 ${t("rows", lang)}`}</SelectItem>
                <SelectItem value="10">{`10 ${t("rows", lang)}`}</SelectItem>
                <SelectItem value="20">{`20 ${t("rows", lang)}`}</SelectItem>
                <SelectItem value="50">{`50 ${t("rows", lang)}`}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("user", lang)}</TableHead>
                  <TableHead>{t("process_name", lang)}</TableHead>
                  <TableHead>{t("status", lang)}</TableHead>
                  <TableHead>{t("date_from", lang)}</TableHead>
                  <TableHead>{t("date_to", lang)}</TableHead>
                  <TableHead>{t("started_at", lang)}</TableHead>
                  <TableHead>{t("last_updated", lang)}</TableHead>
                  <TableHead className="text-right">{t("actions", lang)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {t("loading_processes", lang)}
                    </TableCell>
                  </TableRow>
                ) : processes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {t("no_processes_found", lang)}
                    </TableCell>
                  </TableRow>
                ) : (
                  processes.map((process) => (
                    <TableRow key={process.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={process.user?.profile_img || undefined} alt={process.user?.name} />
                            <AvatarFallback>{process.user?.name?.substring(0, 2).toUpperCase() || "UN"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div>{process.user?.name || t("unknown", lang)}</div>
                            <div className="text-sm text-muted-foreground">
                              {process.user?.email || t("no_email", lang)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {process.process_name || `${t("process", lang)}-${process.id}`}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full  ${
                            process.status === ProcessStatus.PROCESSING
                              ? AppColor.INFO
                              : process.status === ProcessStatus.SUCCESS
                                ? AppColor.SUCCESS
                                : process.status === ProcessStatus.FAILED
                                  ? AppColor.ERROR
                                  : process.status === ProcessStatus.ONBHOLD
                                    ? AppColor.PURPLE // Custom color
                                    : AppColor.WARNING
                          }`}
                        >
                          {process.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {process.from_date ? (
                          <div className="text-sm">{new Date(process.from_date).toLocaleDateString()}</div>
                        ) : (
                          <span className="text-muted-foreground">{t("not_specified", lang)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {process.to_date ? (
                          <div className="text-sm">{new Date(process.to_date).toLocaleDateString()}</div>
                        ) : (
                          <span className="text-muted-foreground">{t("not_specified", lang)}</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(process.start_time || process.created_at)}</TableCell>
                      <TableCell>{formatDate(process.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">{t("open_menu", lang)}</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(process)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t("view_details", lang)}
                            </DropdownMenuItem>
                            {(process.status === ProcessStatus.PROCESSING ||
                              process.status === ProcessStatus.PROCESSING) && (
                              <DropdownMenuItem
                                onClick={() => handleTerminate(process)}
                                className="text-destructive focus:text-destructive"
                              >
                                <AlertCircle className="mr-2 h-4 w-4" />
                                {t("terminate_process", lang)}
                              </DropdownMenuItem>
                            )}
                            {process.status === ProcessStatus.PENDING && (
                              <DropdownMenuItem onClick={() => handleMakeOnHold(process)} disabled={isStatusChanging}>
                                <Pause className="mr-2 h-4 w-4" />
                                {t("make_on_hold", lang)}
                              </DropdownMenuItem>
                            )}

                            {process.status === ProcessStatus.ONBHOLD && !hasPendingProcess && (
                              <DropdownMenuItem onClick={() => handleMakePending(process)} disabled={isStatusChanging}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {t("make_pending", lang)}
                              </DropdownMenuItem>
                            )}

                            {/* New: Show Mark as Failed button only for ON_HOLD processes */}
                            {process.status === ProcessStatus.ONBHOLD && (
                              <DropdownMenuItem
                                onClick={() => handleMarkFailedClick(process)}
                                disabled={isStatusChanging}
                                className="text-red-600 hover:text-red-700 focus:text-red-700"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                {t("mark_as_failed", lang)}
                              </DropdownMenuItem>
                            )}

                            {/* New: Show Delete Process button only for FAILED processes */}
                            {process.status === ProcessStatus.FAILED && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(process)}
                                disabled={isDeleting}
                                className="text-red-600 hover:text-red-700 focus:text-red-700"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("delete_process", lang)}
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
                {`${t("showing", lang)} ${(pagination.page - 1) * pagination.limit + 1} ${t("to", lang)} ${Math.min(pagination.page * pagination.limit, pagination.total)} ${t("of", lang)} ${pagination.total} ${t("processes", lang)}`}
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => goToPage(1)}
                    disabled={isLoading || !pagination.hasPreviousPage}
                    size="sm"
                  >
                    {t("first", lang)}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={isLoading || !pagination.hasPreviousPage}
                    size="sm"
                  >
                    {t("previous", lang)}
                  </Button>
                  <span className="px-2">
                    {`${t("page", lang)} ${pagination.page} ${t("of", lang)} ${pagination.totalPages}`}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={isLoading || !pagination.hasNextPage}
                    size="sm"
                  >
                    {t("next", lang)}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => goToPage(pagination.totalPages)}
                    disabled={isLoading || !pagination.hasNextPage}
                    size="sm"
                  >
                    {t("last", lang)}
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
            <DialogTitle>{t("start_new_process", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Process Name Field */}
            <div className="space-y-2">
              <Label htmlFor="process_name">{t("process_name", lang)}</Label>
              <Input
                id="process_name"
                placeholder={t("enter_process_name", lang)}
                value={processName}
                onChange={(e) => {
                  setProcessName(e.target.value)
                  if (e.target.value.trim()) {
                    setProcessNameError(null)
                  }
                }}
                className={processNameError ? "border-red-500" : ""}
              />
              {processNameError && <p className="text-sm text-red-500">{processNameError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="from_date">{t("from_date", lang)}</Label>
              <div className="relative">
                <Input
                  id="from_date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  min="2020-01-01"
                  max={toDate || todayDate} // Restrict to either the to date or today, whichever is earlier
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              {dateErrors.fromDate && <p className="text-sm text-red-500">{dateErrors.fromDate}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="to_date">{t("to_date", lang)}</Label>
              <div className="relative">
                <Input
                  id="to_date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  min={fromDate || "2020-01-01"}
                  max={todayDate}
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              {dateErrors.toDate && <p className="text-sm text-red-500">{dateErrors.toDate}</p>}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              <p>{t("date_range_note", lang)}</p>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Label>{t("select_agent_accounts", lang)}</Label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="select_all"
                checked={selectedAgents.length === agentAccounts.length}
                onChange={(e) => setSelectedAgents(e.target.checked ? agentAccounts.map((a) => a.username) : [])}
              />
              <Label htmlFor="select_all" className="text-sm">
                {t("select_all", lang)}
              </Label>
            </div>
            <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-2">
              {agentAccounts.map((account) => (
                <div key={account.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={account.username}
                    checked={selectedAgents.includes(account.username)}
                    onChange={(e) => {
                      setSelectedAgents((prev) =>
                        e.target.checked ? [...prev, account.username] : prev.filter((u) => u !== account.username),
                      )
                    }}
                  />
                  <Label htmlFor={account.username} className="text-sm">
                    {account.username}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartProcessDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
            <Button onClick={startProcess}>{t("start_process", lang)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate Process Dialog */}
      <Dialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("terminate_process", lang)}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t("terminate_process_confirmation", lang)}</AlertDescription>
            </Alert>
            {selectedTerminateProcess && (
              <div className="mt-4 space-y-2">
                <p className="text-sm">
                  <strong>{t("process_id", lang)}:</strong> {selectedTerminateProcess.id}
                </p>
                <p className="text-sm">
                  <strong>{t("status", lang)}:</strong> {selectedTerminateProcess.status}
                </p>
                <p className="text-sm">
                  <strong>{t("user", lang)}:</strong> {selectedTerminateProcess.user?.name || t("unknown", lang)}
                </p>
                {selectedTerminateProcess.from_date && selectedTerminateProcess.to_date && (
                  <>
                    <p className="text-sm">
                      <strong>{t("date_range", lang)}:</strong>{" "}
                      {new Date(selectedTerminateProcess.from_date).toLocaleDateString()} -{" "}
                      {new Date(selectedTerminateProcess.to_date).toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminateDialogOpen(false)} disabled={isTerminating}>
              {t("cancel", lang)}
            </Button>
            <Button variant="destructive" onClick={confirmTerminate} disabled={isTerminating}>
              {isTerminating ? t("terminating", lang) : t("terminate_process", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Failed Confirmation Dialog */}
      <Dialog open={markFailedDialogOpen} onOpenChange={setMarkFailedDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">{t("mark_process_as_failed", lang)}</DialogTitle>
            <DialogDescription>{t("mark_failed_confirmation", lang)}</DialogDescription>
          </DialogHeader>

          {processToMarkFailed && (
            <div className="py-4">
              <div className="mb-4 p-3 border rounded-md bg-gray-50">
                <p className="font-medium">
                  {t("process_id", lang)}: {processToMarkFailed.id}
                </p>
                {processToMarkFailed.from_date && processToMarkFailed.to_date && (
                  <p className="text-sm mt-2">
                    {t("date_range", lang)}: {new Date(processToMarkFailed.from_date).toLocaleDateString()}{" "}
                    {t("to", lang)} {new Date(processToMarkFailed.to_date).toLocaleDateString()}
                  </p>
                )}
                <p className="text-sm mt-2">
                  {t("created_by", lang)}: {processToMarkFailed.user?.name || t("unknown", lang)}
                </p>
                <p className="text-sm mt-2">
                  {t("current_status", lang)}: <span className="font-medium text-blue-600">{t("on_hold", lang)}</span>
                </p>
              </div>

              <p className="text-sm text-red-600">{t("mark_failed_warning", lang)}</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMarkFailedDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
            <Button variant="destructive" onClick={confirmMarkFailed} disabled={isStatusChanging}>
              {isStatusChanging ? t("processing", lang) : t("confirm", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New: Delete Process Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">{t("delete_process", lang)}</DialogTitle>
            <DialogDescription>{t("delete_process_confirmation", lang)}</DialogDescription>
          </DialogHeader>

          {processToDelete && (
            <div className="py-4">
              <div className="mb-4 p-3 border rounded-md bg-gray-50">
                <p className="font-medium">
                  {t("process_id", lang)}: {processToDelete.id}
                </p>
                {processToDelete.from_date && processToDelete.to_date && (
                  <p className="text-sm mt-2">
                    {t("date_range", lang)}: {new Date(processToDelete.from_date).toLocaleDateString()} {t("to", lang)}{" "}
                    {new Date(processToDelete.to_date).toLocaleDateString()}
                  </p>
                )}
                <p className="text-sm mt-2">
                  {t("created_by", lang)}: {processToDelete.user?.name || t("unknown", lang)}
                </p>
                <p className="text-sm mt-2">
                  {t("current_status", lang)}: <span className="font-medium text-red-600">{t("failed", lang)}</span>
                </p>
              </div>

              <p className="text-sm text-red-600 font-medium">{t("delete_process_warning", lang)}</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("cancel", lang)}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? t("deleting", lang) : t("delete_process", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProcessDetailsDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen} processId={selectedProcessId} />
    </div>
  );
}