"use client";

import { useState, useEffect, useMemo } from "react";
import { Edit, Trash, MoreHorizontal, Plus, Search, DollarSign, RefreshCw } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/usercontext";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import toast from "react-hot-toast";

interface AccountTurnover {
  id: string;
  username: string;
  game: string;
  currency: string;
  turnover: string;
  createdAt: string;
}

interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  createdAt: string;
}

interface Bounce {
  id: string;
  name: string;
  description: string;
}

export default function AccountTurnoverPage() {
  const { auth, isLoading } = useUser();
  const [accountTurnovers, setAccountTurnovers] = useState<AccountTurnover[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [bounces, setBounces] = useState<Bounce[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [turnoverToDelete, setTurnoverToDelete] = useState<AccountTurnover | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTurnover, setSelectedTurnover] = useState<AccountTurnover | null>(null);
  const [exchangeRatesDialogOpen, setExchangeRatesDialogOpen] = useState(false);
  const [createMatchDialogOpen, setCreateMatchDialogOpen] = useState(false);
  const [selectedBounce, setSelectedBounce] = useState("");
  const router = useRouter();

  // Form state for edit
  const [formUsername, setFormUsername] = useState("");
  const [formGame, setFormGame] = useState("");
  const [formCurrency, setFormCurrency] = useState("");
  const [formTurnover, setFormTurnover] = useState("");
  const [formErrors, setFormErrors] = useState<{ username?: string; game?: string }>({});

  // Filter and paginate turnovers on the client side
  const filteredTurnovers = useMemo(() => {
    if (!searchTerm) return accountTurnovers;
    
    return accountTurnovers.filter(turnover => 
      turnover.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      turnover.game.toLowerCase().includes(searchTerm.toLowerCase()) ||
      turnover.currency.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [accountTurnovers, searchTerm]);

  // Calculate pagination
  const paginatedTurnovers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTurnovers.slice(startIndex, startIndex + pageSize);
  }, [filteredTurnovers, currentPage, pageSize]);

  const totalPages = useMemo(() => 
    Math.max(1, Math.ceil(filteredTurnovers.length / pageSize)), 
    [filteredTurnovers, pageSize]
  );

  const fetchAccountTurnovers = async () => {
    if (auth) {
      if (!auth.canAccess("account-turnovers")) {
        router.push("/dashboard");
        return;
      }
    }
    try {
      const response = await fetch(`/api/account-turnovers`);

      if (!response.ok) {
        throw new Error("Failed to fetch account turnovers");
      }

      const data = await response.json();
      setAccountTurnovers(data.data.accountTurnovers);
      setExchangeRates(data.data.exchangeRates);
    } catch (error) {
      console.error("Error fetching account turnovers:", error);
      toast.error("Failed to fetch account turnovers");
    }
  };

  const fetchBounces = async () => {
    try {
      const response = await fetch(`/api/bounce`);

    //   if (!response.ok) {
    //     throw new Error("Failed to fetch bounces");
    //   }

      const data = await response.json();
      setBounces(data?.data);
    } catch (error) {
      console.error("Error fetching bounces:", error);
      toast.error("Failed to fetch bounces");
    }
  };

  useEffect(() => {
    if (!isLoading && auth) {
      fetchAccountTurnovers();
      fetchBounces();
    }
  }, [isLoading, auth, router]);

  // Reset to first page when search term or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const validateForm = () => {
    const errors: { username?: string; game?: string } = {};
    
    if (!formUsername || formUsername.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }
    
    if (!formGame) {
      errors.game = "Game is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateAccountTurnover = async () => {
    if (!selectedTurnover || !validateForm()) return;

    try {
      const updateData: Record<string, any> = {
        username: formUsername,
        game: formGame,
        currency: formCurrency,
        turnover: formTurnover
      };

      const response = await fetch(`/api/account-turnovers/${selectedTurnover.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update account turnover");
      }

      toast.success("Account turnover updated successfully");
      
      setFormUsername("");
      setFormGame("");
      setFormCurrency("");
      setFormTurnover("");
      setEditDialogOpen(false);
      fetchAccountTurnovers();
    } catch (error) {
      console.error("Error updating account turnover:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update account turnover");
    }
  };

  const deleteAccountTurnover = async () => {
    if (!turnoverToDelete) return;

    try {
      const response = await fetch(`/api/account-turnovers/${turnoverToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete account turnover");
      }

      toast.success("Account turnover deleted successfully");
      fetchAccountTurnovers();
    } catch (error) {
      console.error("Error deleting account turnover:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete account turnover");
    } finally {
      setDeleteDialogOpen(false);
      setTurnoverToDelete(null);
    }
  };

  const createMatch = async () => {
    if (!selectedBounce) {
      toast.error("Please select a bounce method");
      return;
    }

    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bounceId: selectedBounce
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create match");
      }

      toast.success("Match created successfully");
      setSelectedBounce("");
      setCreateMatchDialogOpen(false);
    } catch (error) {
      console.error("Error creating match:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create match");
    }
  };

  const handleViewExchangeRates = () => {
    setExchangeRatesDialogOpen(true);
  };

  const handleCreateMatch = () => {
    setSelectedBounce("");
    setCreateMatchDialogOpen(true);
  };

  const handleEdit = (turnover: AccountTurnover) => {
    setSelectedTurnover(turnover);
    setFormUsername(turnover.username);
    setFormGame(turnover.game);
    setFormCurrency(turnover.currency);
    setFormTurnover(turnover.turnover);
    setFormErrors({});
    setEditDialogOpen(true);
  };

  const handleDelete = (turnover: AccountTurnover) => {
    setTurnoverToDelete(turnover);
    setDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  // Calculate pagination display values
  const startItem = filteredTurnovers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredTurnovers.length);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: "Account Turnover Management" }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Account Turnover Management</CardTitle>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <Button 
              onClick={handleViewExchangeRates} 
              className="w-full sm:w-auto"
              variant="outline"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              View Exchange Rates
            </Button>
            <Button 
              onClick={handleCreateMatch} 
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Match
            </Button>
            <Button 
              onClick={fetchAccountTurnovers} 
              className="w-full sm:w-auto"
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => {
                setPageSize(Number(val));
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
                placeholder="Search turnovers..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Turnover</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading account turnovers...
                    </TableCell>
                  </TableRow>
                ) : paginatedTurnovers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No account turnovers found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTurnovers.map((turnover) => (
                    <TableRow key={turnover.id}>
                      <TableCell className="font-medium">{turnover.username}</TableCell>
                      <TableCell>{turnover.game}</TableCell>
                      <TableCell>{turnover.currency}</TableCell>
                      <TableCell>{turnover.turnover}</TableCell>
                      <TableCell>{turnover.createdAt ? formatDate(turnover.createdAt) : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(turnover)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(turnover)}>
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredTurnovers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{startItem}</span> to{" "}
                <span className="font-medium">{endItem}</span>{" "}
                of <span className="font-medium">{filteredTurnovers.length}</span> account turnovers
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center space-x-2 w-full sm:w-auto justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(1)} 
                    disabled={isLoading || !hasPreviousPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    First
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(currentPage - 1)} 
                    disabled={isLoading || !hasPreviousPage}
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
                    disabled={isLoading || !hasNextPage}
                    size="sm"
                    className="h-8 px-2"
                  >
                    Next
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(totalPages)} 
                    disabled={isLoading || !hasNextPage}
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

      {/* Exchange Rates Dialog */}
      <Dialog open={exchangeRatesDialogOpen} onOpenChange={setExchangeRatesDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Exchange Rates</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From Currency</TableHead>
                    <TableHead>To Currency</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exchangeRates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No exchange rates found
                      </TableCell>
                    </TableRow>
                  ) : (
                    exchangeRates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell>{rate.fromCurrency}</TableCell>
                        <TableCell>{rate.toCurrency}</TableCell>
                        <TableCell>{rate.rate}</TableCell>
                        <TableCell>{formatDate(rate.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setExchangeRatesDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Match Dialog */}
      <Dialog open={createMatchDialogOpen} onOpenChange={setCreateMatchDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Match</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bounce">Select Bounce Method</Label>
              <Select 
                value={selectedBounce} 
                onValueChange={setSelectedBounce}
              >
                <SelectTrigger id="bounce">
                  <SelectValue placeholder="Select a bounce method" />
                </SelectTrigger>
                <SelectContent>
                  {bounces.map((bounce) => (
                    <SelectItem key={bounce.id} value={bounce.id}>
                      {bounce.name} - {bounce.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateMatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createMatch}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Turnover Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Account Turnover</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit_username">Username</Label>
              <Input 
                id="edit_username" 
                placeholder="Enter username" 
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
              />
              {formErrors.username && (
                <p className="text-sm text-red-500">{formErrors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_game">Game</Label>
              <Input 
                id="edit_game" 
                placeholder="Enter game" 
                value={formGame}
                onChange={(e) => setFormGame(e.target.value)}
              />
              {formErrors.game && (
                <p className="text-sm text-red-500">{formErrors.game}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_currency">Currency</Label>
              <Input 
                id="edit_currency" 
                placeholder="Enter currency" 
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_turnover">Turnover</Label>
              <Input 
                id="edit_turnover" 
                placeholder="Enter turnover" 
                value={formTurnover}
                onChange={(e) => setFormTurnover(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateAccountTurnover}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={deleteAccountTurnover}
        title="Confirm Delete"
        children={
          <>
            <p>Are you sure you want to delete this account turnover?</p>
            <p className="mt-2">This action cannot be undone.</p>
          </>
        }
        confirmText="Delete"
      />
    </div>
  );
}