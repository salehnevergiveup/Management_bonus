"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Check, Info, AlertTriangle, Bell, Eye, Trash2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/dialog";
import { NotificationStatus, NotificationType } from "@/constants/notifications";
import { Notification } from "@/types/notification";
import toast from 'react-hot-toast';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateUnreadCount: (count: number) => void;
}

export function NotificationPanel({ isOpen, onClose, onUpdateUnreadCount }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications from the API when the panel opens.
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications/user-notifications");
      if (!res.ok) {
        throw new Error("Failed to fetch notifications");
      }
      const notifications: Notification[] = await res.json();
      
      setNotifications(notifications);
      updateUnreadCount(notifications);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch notifications")
    } finally {
      setIsLoading(false);
    }
  };

  const updateUnreadCount = (notifs: Notification[]) => {
    const unreadCount = notifs.filter((n) => n.status === NotificationStatus.UNREAD).length;
    onUpdateUnreadCount(unreadCount);
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: NotificationStatus.READ }),
      });
      if (!res.ok) {
        throw new Error("Failed to update notification");
      }
      const updatedNotification: Notification = await res.json();

      const updatedNotifications = notifications.map((n) =>
        n.id === id ? updatedNotification : n
      );
      setNotifications(updatedNotifications);
      updateUnreadCount(updatedNotifications);
      toast.success("Notification marked as read")
    } catch (error) {
      console.error(error);
      toast.error("Failed to update notification")
    }
  };

  const markAllAsRead = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error("Failed to mark all notifications as read");
      }
      
      // Update local state to reflect all notifications as read
      const updatedNotifications = notifications.map((notification) => ({
        ...notification,
        status: NotificationStatus.READ,
      }));
      
      setNotifications(updatedNotifications);
      updateUnreadCount(updatedNotifications);
      
      // Get the count of updated notifications from the response
      const { updatedCount } = await res.json();
      
      if (updatedCount > 0) {
        toast.success(`${updatedCount} notification${updatedCount !== 1 ? "s" : ""} marked as read`);
      } else {
        toast.error("No unread notifications to update")
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to mark all notifications as read")
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        throw new Error("Failed to delete notification");
      }
      
      // Remove the deleted notification from state
      const filteredNotifications = notifications.filter((n) => n.id !== id);
      setNotifications(filteredNotifications);
      updateUnreadCount(filteredNotifications);
      
      setDeleteDialogOpen(false);
      setSelectedNotification(null);
      toast.success("Notification deleted successfully")
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete notification")
    }
  };

  const handleView = (notification: Notification) => {
    setSelectedNotification(notification);
    setViewDialogOpen(true);
    if (notification.status === NotificationStatus.UNREAD) {
      markAsRead(notification.id);
    }
  };

  const handleDelete = (notification: Notification) => {
    setSelectedNotification(notification);
    setDeleteDialogOpen(true);
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case NotificationType.INFO:
        return <Info className="h-4 w-4 text-blue-500" />;
      case NotificationType.WARNING:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case NotificationType.SUCCESS:
        return <Check className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const hasUnreadNotifications = notifications.some(
    (n) => n.status === NotificationStatus.UNREAD
  );

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader className="flex flex-row justify-between items-center">
            <SheetTitle>Notifications</SheetTitle>
            {hasUnreadNotifications && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={markAllAsRead}
                disabled={isLoading}
              >
                <Check className="mr-2 h-4 w-4" />
                Mark All as Read
              </Button>
            )}
          </SheetHeader>
          
          {notifications.length === 0 ? (
            <div className="flex justify-center items-center h-[calc(100vh-15rem)] text-muted-foreground">
              No notifications
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`mb-4 rounded-lg p-4 ${
                    notification.status === NotificationStatus.UNREAD ? "bg-muted" : "bg-background"
                  }`}
                >
                  <div className="flex items-start">
                    <div className="mr-3 mt-1">{getIcon(notification.type)}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                      <div className="mt-2 flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleView(notification)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        {notification.status === NotificationStatus.UNREAD && (
                          <Button size="sm" variant="outline" onClick={() => markAsRead(notification.id)}>
                            <Check className="mr-2 h-4 w-4" />
                            Mark as Read
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(notification)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* View Notification Dialog */}
      <ConfirmationDialog
        isOpen={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        onConfirm={() => setViewDialogOpen(false)}
        title="Notification Details"
        confirmText="Close"
        showCancelButton={false}
      >
        {selectedNotification && (
          <div className="space-y-2">
            <div className="flex items-center">
              {getIcon(selectedNotification.type)}
              <span className="ml-2 font-medium">
                {selectedNotification.type.charAt(0).toUpperCase() +
                  selectedNotification.type.slice(1)}
              </span>
            </div>
            <p>{selectedNotification.message}</p>
            <p className="text-sm text-muted-foreground">
              Received: {new Date(selectedNotification.createdAt).toLocaleString()}
            </p>
          </div>
        )}
      </ConfirmationDialog>

      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => selectedNotification && deleteNotification(selectedNotification.id)}
        title="Delete Notification"
        children="Are you sure you want to delete this notification? This action cannot be undone."
        confirmText="Delete"
      />
    </>
  );
}