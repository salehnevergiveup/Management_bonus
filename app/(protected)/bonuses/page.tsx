'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash, MoreHorizontal, Plus, Info, Copy, Search } from 'lucide-react';
import { Breadcrumb } from '@/components/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/contexts/usercontext';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/dialog';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Bonus } from '@/types/bonus.type';

export default function BonusManagementPage() {
  const { auth, isLoading } = useUser();
  const router = useRouter();
  
  const [allBonuses, setAllBonuses] = useState<Bonus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Detail dialog state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState<Bonus | null>(null);
  const [activeTab, setActiveTab] = useState<'function' | 'baseline' | 'description'>('function');
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bonusToDelete, setBonusToDelete] = useState<Bonus | null>(null);

  // Filter bonuses based on search term
  const filteredBonuses = allBonuses.filter(bonus => 
    bonus.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bonus.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const paginatedBonuses = filteredBonuses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  const totalPages = Math.max(1, Math.ceil(filteredBonuses.length / pageSize));

  const fetchBonuses = async () => {
    if (auth) {
      if (!auth.canAccess('bonuses')) {
        router.push('/dashboard');
        return;
      }
    }
    
    try {
      const response = await fetch('/api/bonuses?all=true');
      
      if (!response.ok) {
        throw new Error('Failed to fetch bonuses');
      }
      
      const data = await response.json();
      setAllBonuses(data.data);
    } catch (error) {
      console.error('Error fetching bonuses:', error);
      toast.error('Failed to fetch bonuses');
    }
  };

  useEffect(() => {
    if (!isLoading && auth) {
      fetchBonuses();
    }
  }, [isLoading, auth, router]);

  // Reset to first page when search term or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const handleShowDetails = (bonus: Bonus) => {
    setSelectedBonus(bonus);
    setActiveTab('function');
    setDetailsDialogOpen(true);
  };

  const handleDelete = (bonus: Bonus) => {
    if (!auth?.can('bonuses:delete')) {
      toast.error('You do not have permission to delete bonuses');
      return;
    }
    
    setBonusToDelete(bonus);
    setDeleteDialogOpen(true);
  };

  const deleteBonus = async () => {
    if (!bonusToDelete) return;

    try {
      const response = await fetch(`/api/bonuses/${bonusToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete bonus');
      }

      toast.success('Bonus deleted successfully');
      fetchBonuses();
    } catch (error) {
      console.error('Error deleting bonus:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete bonus');
    } finally {
      setDeleteDialogOpen(false);
      setBonusToDelete(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Failed to copy to clipboard'));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Parse JSON strings if needed
  const parseJsonField = (jsonStr: string) => {
    try {
      return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return jsonStr;
    }
  };

  const formatJsonDisplay = (jsonData: any) => {
    try {
      if (typeof jsonData === 'string') {
        return JSON.stringify(parseJsonField(jsonData), null, 2);
      }
      return JSON.stringify(jsonData, null, 2);
    } catch (e) {
      return String(jsonData);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  // Calculate pagination display values
  const startItem = filteredBonuses.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredBonuses.length);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center h-64">
        <h1 className="text-xl font-semibold">Loading bonuses...</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: "Bonus Management" }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Bonus Management</CardTitle>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            {auth?.can('bonuses:create') && (
              <Link href="/bonuses/create">
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Bonus
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search bonuses..."
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
                  <TableHead>Name</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  {(auth?.can('bonuses:edit') || auth?.can('bonuses:delete') || auth?.can('bonuses:view')) && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBonuses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No bonuses found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedBonuses.map((bonus) => (
                    <TableRow key={bonus.id}>
                      <TableCell className="font-medium">{bonus.name}</TableCell>
                      <TableCell>{formatDate(bonus.created_at)}</TableCell>
                      <TableCell>{formatDate(bonus.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleShowDetails(bonus)}>
                              <Info className="mr-2 h-4 w-4" />
                              Show Details
                            </DropdownMenuItem>
                            
                            {auth?.can('bonuses:edit') && (
                              <Link href={`/bonuses/edit/${bonus.id}`} className="w-full">
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              </Link>
                            )}
                            
                            {auth?.can('bonuses:delete') && (
                              <DropdownMenuItem onClick={() => handleDelete(bonus)}>
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
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

          {filteredBonuses.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{startItem}</span> to{" "}
                <span className="font-medium">{endItem}</span>{" "}
                of <span className="font-medium">{filteredBonuses.length}</span> bonuses
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
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBonus?.name} Details
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex border-b mb-4">
              <button
                className={`px-4 py-2 font-medium ${activeTab === 'function' ? 'border-b-2 border-primary' : ''}`}
                onClick={() => setActiveTab('function')}
              >
                Function
              </button>
              <button
                className={`px-4 py-2 font-medium ${activeTab === 'baseline' ? 'border-b-2 border-primary' : ''}`}
                onClick={() => setActiveTab('baseline')}
              >
                Baseline
              </button>
              <button
                className={`px-4 py-2 font-medium ${activeTab === 'description' ? 'border-b-2 border-primary' : ''}`}
                onClick={() => setActiveTab('description')}
              >
                Description
              </button>
            </div>
            
            {activeTab === 'function' && selectedBonus && (
              <div className="relative">
                <button 
                  className="absolute top-2 right-2 p-1 rounded bg-primary/10 hover:bg-primary/20"
                  onClick={() => copyToClipboard(selectedBonus.function)}
                >
                  <Copy size={16} />
                </button>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                  {formatJsonDisplay(selectedBonus.function)}
                </pre>
              </div>
            )}
            
            {activeTab === 'baseline' && selectedBonus && (
              <div className="relative">
                <button 
                  className="absolute top-2 right-2 p-1 rounded bg-primary/10 hover:bg-primary/20"
                  onClick={() => copyToClipboard(typeof selectedBonus.baseline === 'string' 
                    ? selectedBonus.baseline 
                    : JSON.stringify(selectedBonus.baseline, null, 2))}
                >
                  <Copy size={16} />
                </button>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                  {formatJsonDisplay(selectedBonus.baseline)}
                </pre>
              </div>
            )}
            
            {activeTab === 'description' && selectedBonus && (
              <div className="relative">
                <button 
                  className="absolute top-2 right-2 p-1 rounded bg-primary/10 hover:bg-primary/20"
                  onClick={() => copyToClipboard(selectedBonus.description)}
                >
                  <Copy size={16} />
                </button>
                <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">
                  {selectedBonus.description}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={deleteBonus}
        title="Confirm Delete"
        children={
          <>
            <p>Are you sure you want to delete this bonus?</p>
            <p className="mt-2">This action cannot be undone.</p>
          </>
        }
        confirmText="Delete"
      />
    </div>
  );
}