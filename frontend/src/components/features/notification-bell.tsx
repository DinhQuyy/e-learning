"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { apiFetch, apiPatch } from "@/lib/api-fetch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Info,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Star,
  Settings,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import type { Notification } from "@/types";

interface NotificationBellProps {
  initialCount: number;
}

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "info":
      return Info;
    case "success":
      return CheckCircle;
    case "warning":
      return AlertTriangle;
    case "enrollment":
      return BookOpen;
    case "review":
      return Star;
    case "system":
      return Settings;
    default:
      return Bell;
  }
}

function getNotificationIconColor(type: Notification["type"]) {
  switch (type) {
    case "info":
      return "text-blue-500";
    case "success":
      return "text-green-500";
    case "warning":
      return "text-yellow-500";
    case "enrollment":
      return "text-purple-500";
    case "review":
      return "text-orange-500";
    case "system":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
}

export function NotificationBell({ initialCount }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/notifications?limit=5");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await apiPatch(`/api/notifications/${notificationId}/read`);
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // Silent fail
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 flex size-5 items-center justify-center p-0 text-[10px]"
              variant="destructive"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Thông báo</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-sm">Thông báo</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} chưa đọc
            </Badge>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Không có thông báo nào
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const iconColor = getNotificationIconColor(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                      !notification.is_read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div
                      className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted`}
                    >
                      <Icon className={`size-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug ${
                          !notification.is_read ? "font-medium" : ""
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(
                          new Date(notification.date_created),
                          { addSuffix: true, locale: vi }
                        )}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-2">
          <Link href="/notifications">
            <Button variant="ghost" size="sm" className="w-full text-sm">
              Xem tất cả
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
