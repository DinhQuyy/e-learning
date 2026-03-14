"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { apiPatch } from "@/lib/api-fetch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Info,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Star,
  Settings,
  Loader2,
  Check,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import type { Notification } from "@/types";

interface NotificationsListProps {
  initialNotifications: Notification[];
  initialTotal: number;
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
      return "text-blue-500 bg-blue-100 dark:bg-blue-950";
    case "success":
      return "text-green-500 bg-green-100 dark:bg-green-950";
    case "warning":
      return "text-yellow-500 bg-yellow-100 dark:bg-yellow-950";
    case "enrollment":
      return "text-purple-500 bg-purple-100 dark:bg-purple-950";
    case "review":
      return "text-orange-500 bg-orange-100 dark:bg-orange-950";
    case "system":
      return "text-muted-foreground bg-muted";
    default:
      return "text-muted-foreground bg-muted";
  }
}

export function NotificationsList({
  initialNotifications,
}: NotificationsListProps) {
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") return notifications;
    if (activeFilter === "course") {
      return notifications.filter((n) => n.type === "enrollment" || n.type === "success");
    }
    if (activeFilter === "review") {
      return notifications.filter((n) => n.type === "review");
    }
    if (activeFilter === "system") {
      return notifications.filter((n) => n.type === "system" || n.type === "info" || n.type === "warning");
    }
    return notifications;
  }, [notifications, activeFilter]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (notificationId: string) => {
    setMarkingIds((prev) => new Set(prev).add(notificationId));
    try {
      const res = await apiPatch(`/api/notifications/${notificationId}/read`);

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
      } else {
        toast.error("Không thể đánh dấu đã đọc");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  };

  const markAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      const res = await apiPatch("/api/notifications/read-all");

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        );
        toast.success("Đã đánh dấu tất cả đã đọc");
      } else {
        toast.error("Không thể đánh dấu tất cả đã đọc");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsMarkingAll(false);
    }
  };

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Bell className="size-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Bạn chưa có thông báo nào
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={setActiveFilter}>
        <TabsList>
          <TabsTrigger value="all">
            Tất cả ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="course">
            Khoá học
          </TabsTrigger>
          <TabsTrigger value="review">
            Đánh giá
          </TabsTrigger>
          <TabsTrigger value="system">
            Hệ thống
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Actions Bar */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            {unreadCount} thông báo chưa đọc
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={isMarkingAll}
            className="gap-2"
          >
            {isMarkingAll ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCheck className="size-4" />
            )}
            Đánh dấu tất cả đã đọc
          </Button>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Bell className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Không có thông báo trong mục này
              </p>
            </CardContent>
          </Card>
        )}
        {filteredNotifications.map((notification) => {
          const Icon = getNotificationIcon(notification.type);
          const iconColors = getNotificationIconColor(notification.type);
          const isMarking = markingIds.has(notification.id);

          return (
            <Card
              key={notification.id}
              className={`transition-colors ${
                !notification.is_read
                  ? "border-primary/20 bg-primary/5"
                  : ""
              }`}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div
                  className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full ${iconColors}`}
                >
                  <Icon className="size-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className={`text-sm ${
                          !notification.is_read ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(
                          new Date(notification.date_created),
                          { addSuffix: true, locale: vi }
                        )}
                      </p>
                    </div>

                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        disabled={isMarking}
                        className="shrink-0 gap-1 text-xs"
                      >
                        {isMarking ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Check className="size-3" />
                        )}
                        Đã đọc
                      </Button>
                    )}
                  </div>
                </div>

                {!notification.is_read && (
                  <div className="mt-2 size-2.5 shrink-0 rounded-full bg-primary" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
