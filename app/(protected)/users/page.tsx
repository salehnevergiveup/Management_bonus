"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Eye, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/usercontext";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/badge";
import { AppColor,UserStatus, Roles } from "@/constants/enums";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfirmationDialog } from "@/components/dialog";
import type { User } from "@/types/user.types";
import { GetResponse } from "@/types/get-response.type";

export default function UsersPage() {
  const { auth, isLoading } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  useEffect(() => {

    if (auth) {
      if (!auth.canAccess("users")) {
        router.push("/dashboard");
        return; 
      } 

      setMounted(true);
      fetch("/api/users")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch users");
          return res.json();
        })
        .then((data: GetResponse) => {
          const result : GetResponse = data;   
          setUsers(result.data) })
        .catch((err) => console.error("Failed to fetch users:", err));
      
    }
  }, [isLoading, auth, router]);

  if (isLoading) {
    return <p>Loading session...</p>;
  }
  
  const confirmDelete = async () => {
    if (userToDelete) {
      try {
        const res = await fetch(`/api/users/${userToDelete.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      } catch (error) {
        console.error(error);
        alert("Failed to delete user.");
      } finally {
        setDeleteDialogOpen(false);
        setUserToDelete(null);
      }
    }
  };

  // Filter users based on search term and role
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase());
  
    const matchesRole =
      roleFilter === "all" || roleFilter === "" || u.role.name === roleFilter;
  
    return matchesSearch && matchesRole;
  });

  // Pagination: Calculate total pages and current users to display.
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  // Handler for changing pages.
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: "Users" }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <Link href="/users/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </Link>
        </CardHeader>

        <CardContent>
          {/* Search and filter controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset page on search
                }}
              />
            </div>
            <Select value={roleFilter} onValueChange={(val) => {
              setRoleFilter(val);
              setCurrentPage(1); // Reset page on filter change
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="management">Management</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={u.profile_img || undefined} alt={u.name} />
                          <AvatarFallback>
                            {u.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge
                        color={
                          u.role.name === Roles.Admin
                            ? AppColor.INFO
                            : u.role.name === Roles.Management
                            ? AppColor.WARNING
                            : AppColor.SUCCESS
                        }
                        text={u.role.name}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        color={
                          u.status === UserStatus.ACTIVE
                            ? AppColor.SUCCESS
                            : u.status === UserStatus.INACTIVE
                            ? AppColor.WARNING
                            : u.status === UserStatus.BANNED
                            ? AppColor.ERROR
                            : AppColor.INFO
                        }
                        text={u.status}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {auth?.can("users:view") &&
                          (<Link href={`/users/${u.id}`}>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                          </Link>)}
                          {auth?.can("users:edit") && (
                          <Link href={`/users/${u.id}/edit`}>
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          </Link>)}
                          {u.role.name.toLowerCase() !== "admin" && auth?.can("users:delete") && (
                            <DropdownMenuItem
                              onClick={() => {
                                setUserToDelete(u);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end mt-4 space-x-2">
              <Button
                variant="outline"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        confirmText="Delete"
        confirmButtonColor="destructive"
      >
        Are you sure you want to delete{" "}
        <span className="font-medium">{userToDelete?.name}</span>? This action cannot be undone.
      </ConfirmationDialog>
    </div>
  );
}
