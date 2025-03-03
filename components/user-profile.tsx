"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import type { User } from "./user-table";
import { Badge } from "@/components/badge";
import { AppColor } from "@/constants/colors";
import { UserStatus } from "@/constants/userStatus";
import { Roles } from "@/constants/roles";

interface UserProfileProps {
  user: User;
  onBack: () => void;
}

export function UserProfile({ user, onBack }: UserProfileProps) {
  const displayImage =
    user.profile_img && user.profile_img.startsWith("data:")
      ? user.profile_img
      : user.profile_img
      ? `data:image/png;base64,${user.profile_img}`
      : undefined;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-6">
        <Avatar className="h-24 w-24">
          <AvatarImage src={displayImage} alt={user.name} />
          <AvatarFallback className="text-2xl">
            {user.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div>
            <Badge
              color={
                user.status === UserStatus.ACTIVE
                  ? AppColor.SUCCESS
                  : user.status === UserStatus.INACTIVE
                  ? AppColor.WARNING
                  : user.status === UserStatus.BANNED
                  ? AppColor.ERROR
                  : AppColor.INFO
              }
              text={user.status}
            />
        </div>

        <div className="w-full space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p>{user.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Username</p>
              <p>{user.username}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p>{user.email}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Phone</p>
            <p>{user.phone || "Not provided"}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Role</p>
            <p
              className={`inline-block px-2 py-1 rounded-full text-xs ${
                user.role.name === Roles.Admin
                  ? AppColor.SUCCESS
                  : user.role.name === Roles.Management
                  ? AppColor.INFO
                  : AppColor.ERROR
              }`}
            >
              {user.role.name}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p>{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p>{new Date(user.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Link href={`/users/${user.id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
