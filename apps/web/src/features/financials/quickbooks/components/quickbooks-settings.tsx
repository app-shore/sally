"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { Link2, Unlink, RefreshCw } from "lucide-react";

interface QBStatus {
  connected: boolean;
  realm_id?: string;
  last_synced?: string;
}

export function QuickBooksSettings() {
  const qc = useQueryClient();

  const { data: status, isLoading } = useQuery<QBStatus>({
    queryKey: ["quickbooks", "status"],
    queryFn: () => apiClient<QBStatus>("/quickbooks/status"),
  });

  const connect = useMutation({
    mutationFn: async () => {
      const result = await apiClient<{ auth_url: string }>("/quickbooks/connect");
      window.location.href = result.auth_url;
    },
  });

  const disconnect = useMutation({
    mutationFn: () => apiClient("/quickbooks/disconnect", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quickbooks"] });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-foreground">QuickBooks Online</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Sync invoices and settlements to QuickBooks for seamless accounting
          </p>
        </div>
        {status?.connected ? (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            Connected
          </Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            Disconnected
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Checking connection...</div>
        ) : status?.connected ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Company ID</span>
                <p className="font-medium text-foreground">{status.realm_id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Synced</span>
                <p className="font-medium text-foreground">
                  {status.last_synced
                    ? new Date(status.last_synced).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                <Unlink className="mr-2 h-4 w-4" />
                {disconnect.isPending ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your QuickBooks Online account to automatically sync invoices
              and settlements. Eliminate double-entry and keep your books current.
            </p>
            <Button
              onClick={() => connect.mutate()}
              disabled={connect.isPending}
            >
              <Link2 className="mr-2 h-4 w-4" />
              {connect.isPending ? "Connecting..." : "Connect QuickBooks"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
