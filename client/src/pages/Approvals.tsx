import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Approvals() {
  const { t } = useI18n();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewDialog, setReviewDialog] = useState<{ id: number; action: "approved" | "rejected" } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const utils = trpc.useUtils();

  const approvals = trpc.approval.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const reviewMutation = trpc.approval.review.useMutation({
    onSuccess: () => {
      toast.success(t("common.save") + " ✓");
      utils.approval.list.invalidate();
      setReviewDialog(null);
      setReviewNotes("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleReview = () => {
    if (!reviewDialog) return;
    reviewMutation.mutate({
      id: reviewDialog.id,
      status: reviewDialog.action,
      notes: reviewNotes || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending_review: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      needs_changes: "bg-orange-100 text-orange-800",
      cancelled: "bg-gray-100 text-gray-600",
    };
    return <Badge className={variants[status] || "bg-gray-100 text-gray-800"}>{t(`status.${status}`)}</Badge>;
  };

  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      profile_edit: t("approval.profileEdit"),
      mandoub_activation: t("approval.mandoubActivation"),
      store_activation: t("approval.storeActivation"),
      role_change: t("approval.roleChange"),
    };
    return names[type] || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold">{t("approval.title")}</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="pending_review">{t("status.pending_review")}</SelectItem>
            <SelectItem value="approved">{t("status.approved")}</SelectItem>
            <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-start p-3 font-medium">#</th>
                  <th className="text-start p-3 font-medium">{t("common.type")}</th>
                  <th className="text-start p-3 font-medium">{t("audit.entity")}</th>
                  <th className="text-start p-3 font-medium">{t("common.status")}</th>
                  <th className="text-start p-3 font-medium">{t("common.createdAt")}</th>
                  <th className="text-start p-3 font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {(approvals.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">{t("common.noData")}</td>
                  </tr>
                ) : (
                  (approvals.data ?? []).map((a) => (
                    <tr key={a.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">{a.id}</td>
                      <td className="p-3">{getTypeName(a.requestType)}</td>
                      <td className="p-3">{a.targetEntityType || "-"} {a.targetEntityId ? `#${a.targetEntityId}` : ""}</td>
                      <td className="p-3">{getStatusBadge(a.status)}</td>
                      <td className="p-3 text-muted-foreground">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}</td>
                      <td className="p-3">
                        {a.status === "pending_review" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => setReviewDialog({ id: a.id, action: "approved" })}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setReviewDialog({ id: a.id, action: "rejected" })}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={(open) => { if (!open) { setReviewDialog(null); setReviewNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog?.action === "approved" ? t("common.approve") : t("common.reject")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("common.notes")}</Label>
              <Input
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={t("common.notes")}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setReviewDialog(null); setReviewNotes(""); }}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleReview}
                className={reviewDialog?.action === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                disabled={reviewMutation.isPending}
              >
                {reviewDialog?.action === "approved" ? t("common.approve") : t("common.reject")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
