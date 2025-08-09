"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Breadcrumb } from "@/components/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useUser } from "@/contexts/usercontext"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search, Calendar, FileDown, MessageSquare } from "lucide-react"
import { Badge } from "@/components/badge"
import toast from "react-hot-toast"
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

interface SmsSendLog {
  id: number;
  endpoint_name: string;
  total_sent: number;
  created_at: string;
}

export default function SmsHistoryPage() {
  const { auth, isLoading } = useUser()
  const [smsSendLogs, setSmsSendLogs] = useState<SmsSendLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<SmsSendLog[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [endpointFilter, setEndpointFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [availableEndpoints, setAvailableEndpoints] = useState<string[]>([])
  const router = useRouter()
  const { lang } = useLanguage()

  const fetchSmsSendLogs = async () => {
    try {
      setIsLoadingData(true)
      const response = await fetch('/api/sms-send-logs');
      if (response.ok) {
        const data = await response.json();
        const logs = data.logs || [];
        setSmsSendLogs(logs);
        
        // Extract unique endpoints for filter
        const endpoints = [...new Set(logs.map((log: SmsSendLog) => log.endpoint_name))] as string[];
        setAvailableEndpoints(endpoints);
        
        // Apply initial filtering
        applyFilters(logs, searchTerm, endpointFilter);
      } else {
        toast.error(t("failed_to_fetch_sms_logs", lang));
      }
    } catch (error) {
      console.error('Error fetching SMS send logs:', error);
      toast.error(t("error_fetching_sms_logs", lang));
    } finally {
      setIsLoadingData(false)
    }
  };

  const applyFilters = (logs: SmsSendLog[], search: string, endpoint: string) => {
    let filtered = [...logs];

    // Apply search filter
    if (search.trim()) {
      filtered = filtered.filter(log => 
        log.endpoint_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply endpoint filter
    if (endpoint !== "all") {
      filtered = filtered.filter(log => log.endpoint_name === endpoint);
    }

    setFilteredLogs(filtered);
    
    // Calculate pagination
    const total = filtered.length;
    const pages = Math.ceil(total / pageSize);
    setTotalPages(pages);
    
    // Reset to first page if current page is out of bounds
    if (currentPage > pages && pages > 0) {
      setCurrentPage(1);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(smsSendLogs, searchTerm, endpointFilter);
  };

  const handleEndpointFilterChange = (value: string) => {
    setEndpointFilter(value);
    applyFilters(smsSendLogs, searchTerm, value);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    applyFilters(smsSendLogs, value, endpointFilter);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const exportSmsLogs = async () => {
    try {
      const response = await fetch('/api/sms-send-logs/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: filteredLogs,
          format: 'csv'
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sms-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(t("sms_export_success", lang));
      } else {
        toast.error(t("sms_export_failed", lang));
      }
    } catch (error) {
      console.error('Error exporting SMS logs:', error);
      toast.error(t("sms_export_failed", lang));
    }
  };

  // Get paginated logs
  const getPaginatedLogs = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredLogs.slice(startIndex, endIndex);
  };

  useEffect(() => {
    if (!isLoading && auth) {
      fetchSmsSendLogs();
    }
  }, [isLoading, auth]);

  useEffect(() => {
    applyFilters(smsSendLogs, searchTerm, endpointFilter);
  }, [pageSize]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">{t("loading", lang)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: t("sms_history_management", lang) }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("sms_history_management", lang)}
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <Button onClick={exportSmsLogs} variant="outline" className="w-full sm:w-auto">
              <FileDown className="mr-2 h-4 w-4" />
              {t("sms_export_logs", lang)}
            </Button>
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
                <SelectItem value="5">5 {t("rows", lang)}</SelectItem>
                <SelectItem value="10">10 {t("rows", lang)}</SelectItem>
                <SelectItem value="20">20 {t("rows", lang)}</SelectItem>
                <SelectItem value="50">50 {t("rows", lang)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t("sms_search_logs", lang)}
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>
            
            <Select value={endpointFilter} onValueChange={handleEndpointFilterChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("sms_filter_by_endpoint", lang)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("sms_all_endpoints", lang)}</SelectItem>
                {availableEndpoints.map((endpoint) => (
                  <SelectItem key={endpoint} value={endpoint}>
                    {endpoint}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SMS Logs Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sms_endpoint_name", lang)}</TableHead>
                  <TableHead>{t("sms_total_sent", lang)}</TableHead>
                  <TableHead>{t("sms_created_at", lang)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingData ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      {t("loading_sms_history", lang)}
                    </TableCell>
                  </TableRow>
                ) : getPaginatedLogs().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      {filteredLogs.length === 0 && smsSendLogs.length > 0 
                        ? t("no_results_match_criteria", lang)
                        : t("no_sms_logs_found", lang)
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  getPaginatedLogs().map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.endpoint_name}</TableCell>
                      <TableCell>
                        <Badge color="success" text={`${log.total_sent} ${t("sms_sent", lang)}`} />
                      </TableCell>
                      <TableCell>{formatDate(log.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                {t("showing", lang)}{" "}
                <span className="font-medium">
                  {filteredLogs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                </span>{" "}
                {t("to", lang)}{" "}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, filteredLogs.length)}
                </span>{" "}
                {t("of", lang)} <span className="font-medium">{filteredLogs.length}</span> {t("sms_logs", lang)}
              </div>

              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => goToPage(1)} 
                  disabled={currentPage === 1} 
                  size="sm"
                >
                  {t("first", lang)}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  size="sm"
                >
                  {t("previous", lang)}
                </Button>
                <span className="px-2">
                  {t("page", lang)} {currentPage} {t("of", lang)} {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  size="sm"
                >
                  {t("next", lang)}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  size="sm"
                >
                  {t("last", lang)}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 