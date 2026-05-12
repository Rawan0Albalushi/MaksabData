import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";

export default function Finance() {
  const { t, language } = useI18n();
  const [tab, setTab] = useState("overview");
  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const [showCreateRevenue, setShowCreateRevenue] = useState(false);

  // Budget form aligned with schema: name, feature, approvedAmount, notes
  const [budgetForm, setBudgetForm] = useState({ name: "", feature: "operations" as string, approvedAmount: "", notes: "" });
  // Expense form aligned with schema: expenseType, reason, amount, paymentMethod, notes
  const [expenseForm, setExpenseForm] = useState({ expenseType: "operations" as string, description: "", amount: "", paymentMethod: "cash" as string, notes: "" });
  // Revenue form aligned with schema: source, amount, paymentMethod, notes
  const [revenueForm, setRevenueForm] = useState({ source: "order" as string, amount: "", paymentMethod: "cash" as string, notes: "" });

  const { data: budgets } = trpc.budget.list.useQuery({});
  const { data: expenses } = trpc.expense.list.useQuery({});
  const { data: revenues } = trpc.revenue.list.useQuery({});
  const utils = trpc.useUtils();

  const createBudget = trpc.budget.create.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم إنشاء الميزانية" : "Budget created"); setShowCreateBudget(false); utils.budget.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const createExpense = trpc.expense.create.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم تسجيل المصروف" : "Expense recorded"); setShowCreateExpense(false); utils.expense.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const createRevenue = trpc.revenue.create.useMutation({
    onSuccess: () => { toast.success(language === "ar" ? "تم تسجيل الإيراد" : "Revenue recorded"); setShowCreateRevenue(false); utils.revenue.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const totalBudget = budgets?.reduce((s: number, b: any) => s + parseFloat(b.approvedAmount || "0"), 0) || 0;
  const totalExpenses = expenses?.reduce((s: number, e: any) => s + parseFloat(e.amount || "0"), 0) || 0;
  const totalRevenues = revenues?.reduce((s: number, r: any) => s + parseFloat(r.amount || "0"), 0) || 0;
  const netProfit = totalRevenues - totalExpenses;

  const BUDGET_FEATURES = [
    { value: "ezhalha", labelAr: "ازهلها", labelEn: "Ezhalha" },
    { value: "marketing", labelAr: "تسويق", labelEn: "Marketing" },
    { value: "delivery", labelAr: "توصيل", labelEn: "Delivery" },
    { value: "training", labelAr: "تدريب", labelEn: "Training" },
    { value: "special_tasks", labelAr: "مهام خاصة", labelEn: "Special Tasks" },
    { value: "operations", labelAr: "عمليات", labelEn: "Operations" },
    { value: "other", labelAr: "أخرى", labelEn: "Other" },
  ];

  const EXPENSE_TYPES = [
    { value: "purchase", labelAr: "شراء", labelEn: "Purchase" },
    { value: "operations", labelAr: "عمليات", labelEn: "Operations" },
    { value: "mandoub", labelAr: "مندوب", labelEn: "Mandoub" },
    { value: "service", labelAr: "خدمة", labelEn: "Service" },
    { value: "marketing", labelAr: "تسويق", labelEn: "Marketing" },
    { value: "training", labelAr: "تدريب", labelEn: "Training" },
    { value: "price_difference", labelAr: "فرق سعر", labelEn: "Price Difference" },
    { value: "refund", labelAr: "استرجاع", labelEn: "Refund" },
    { value: "other", labelAr: "أخرى", labelEn: "Other" },
  ];

  const REVENUE_SOURCES = [
    { value: "order", labelAr: "طلب", labelEn: "Order" },
    { value: "booking", labelAr: "حجز", labelEn: "Booking" },
    { value: "delivery_fee", labelAr: "رسوم توصيل", labelEn: "Delivery Fee" },
    { value: "store_commission", labelAr: "عمولة محل", labelEn: "Store Commission" },
    { value: "other", labelAr: "أخرى", labelEn: "Other" },
  ];

  const PAYMENT_METHODS_EXPENSE = [
    { value: "cash", labelAr: "نقد", labelEn: "Cash" },
    { value: "bank_transfer", labelAr: "تحويل بنكي", labelEn: "Bank Transfer" },
    { value: "card", labelAr: "بطاقة", labelEn: "Card" },
    { value: "other", labelAr: "أخرى", labelEn: "Other" },
  ];

  const PAYMENT_METHODS_REVENUE = [
    { value: "in_app", labelAr: "داخل التطبيق", labelEn: "In App" },
    { value: "cash", labelAr: "نقد", labelEn: "Cash" },
    { value: "bank_transfer", labelAr: "تحويل بنكي", labelEn: "Bank Transfer" },
    { value: "card", labelAr: "بطاقة", labelEn: "Card" },
    { value: "other", labelAr: "أخرى", labelEn: "Other" },
  ];

  const getExpenseTypeLabel = (val: string) => EXPENSE_TYPES.find(t => t.value === val)?.[language === "ar" ? "labelAr" : "labelEn"] || val;
  const getRevenueSourceLabel = (val: string) => REVENUE_SOURCES.find(t => t.value === val)?.[language === "ar" ? "labelAr" : "labelEn"] || val;
  const getBudgetFeatureLabel = (val: string) => BUDGET_FEATURES.find(t => t.value === val)?.[language === "ar" ? "labelAr" : "labelEn"] || val;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("finance.title")}</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><Wallet className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-sm text-muted-foreground">{t("finance.budgets")}</p><p className="text-xl font-bold">{totalBudget.toFixed(2)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg"><TrendingDown className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-sm text-muted-foreground">{t("finance.expenses")}</p><p className="text-xl font-bold text-red-600">{totalExpenses.toFixed(2)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-sm text-muted-foreground">{t("finance.revenues")}</p><p className="text-xl font-bold text-green-600">{totalRevenues.toFixed(2)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg"><DollarSign className="w-5 h-5 text-purple-600" /></div>
          <div><p className="text-sm text-muted-foreground">{t("finance.profits")}</p><p className={`text-xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>{netProfit.toFixed(2)}</p></div>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">{language === "ar" ? "نظرة عامة" : "Overview"}</TabsTrigger>
            <TabsTrigger value="budgets">{t("finance.budgets")}</TabsTrigger>
            <TabsTrigger value="expenses">{t("finance.expenses")}</TabsTrigger>
            <TabsTrigger value="revenues">{t("finance.revenues")}</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {tab === "budgets" && <Button size="sm" onClick={() => { setBudgetForm({ name: "", feature: "operations", approvedAmount: "", notes: "" }); setShowCreateBudget(true); }}><Plus className="w-4 h-4 me-1" />{language === "ar" ? "ميزانية جديدة" : "New Budget"}</Button>}
            {tab === "expenses" && <Button size="sm" onClick={() => { setExpenseForm({ expenseType: "operations", description: "", amount: "", paymentMethod: "cash", notes: "" }); setShowCreateExpense(true); }}><Plus className="w-4 h-4 me-1" />{language === "ar" ? "مصروف جديد" : "New Expense"}</Button>}
            {tab === "revenues" && <Button size="sm" onClick={() => { setRevenueForm({ source: "order", amount: "", paymentMethod: "cash", notes: "" }); setShowCreateRevenue(true); }}><Plus className="w-4 h-4 me-1" />{language === "ar" ? "إيراد جديد" : "New Revenue"}</Button>}
          </div>
        </div>

        <TabsContent value="overview">
          <Card><CardContent className="pt-4">
            <p className="text-center py-8 text-muted-foreground">{language === "ar" ? "الملخص المالي يظهر أعلاه في البطاقات" : "Financial summary is shown in the cards above"}</p>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="budgets">
          <Card><CardContent className="pt-4">
            {!budgets?.length ? <p className="text-center py-8 text-muted-foreground">{t("common.noData")}</p> :
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="text-start p-3">{language === "ar" ? "الاسم" : "Name"}</th>
                  <th className="text-start p-3">{language === "ar" ? "القسم" : "Feature"}</th>
                  <th className="text-start p-3">{language === "ar" ? "المبلغ المعتمد" : "Approved Amount"}</th>
                  <th className="text-start p-3">{language === "ar" ? "المصروف" : "Spent"}</th>
                  <th className="text-start p-3">{language === "ar" ? "المتبقي" : "Remaining"}</th>
                  <th className="text-start p-3">{t("common.status")}</th>
                </tr></thead>
                <tbody>
                  {budgets.map((b: any) => (
                    <tr key={b.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{b.name}</td>
                      <td className="p-3">{getBudgetFeatureLabel(b.feature || "")}</td>
                      <td className="p-3">{b.approvedAmount}</td>
                      <td className="p-3 text-red-600">{b.spentAmount || "0"}</td>
                      <td className="p-3 text-green-600">{b.remainingAmount || "0"}</td>
                      <td className="p-3"><Badge className={b.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{b.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card><CardContent className="pt-4">
            {!expenses?.length ? <p className="text-center py-8 text-muted-foreground">{t("common.noData")}</p> :
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="text-start p-3">{language === "ar" ? "النوع" : "Type"}</th>
                  <th className="text-start p-3">{language === "ar" ? "السبب" : "Reason"}</th>
                  <th className="text-start p-3">{t("common.amount")}</th>
                  <th className="text-start p-3">{language === "ar" ? "طريقة الدفع" : "Payment"}</th>
                  <th className="text-start p-3">{t("common.status")}</th>
                  <th className="text-start p-3">{t("common.createdAt")}</th>
                </tr></thead>
                <tbody>
                  {expenses.map((e: any) => (
                    <tr key={e.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">{getExpenseTypeLabel(e.expenseType || "")}</td>
                      <td className="p-3 max-w-[200px] truncate">{e.reason || e.notes || "-"}</td>
                      <td className="p-3 font-medium text-red-600">{e.amount}</td>
                      <td className="p-3">{e.paymentMethod || "-"}</td>
                      <td className="p-3"><Badge className={e.approvalStatus === "approved" ? "bg-green-100 text-green-800" : e.approvalStatus === "pending_approval" ? "bg-yellow-100 text-yellow-800" : e.approvalStatus === "rejected" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}>{e.approvalStatus}</Badge></td>
                      <td className="p-3 text-xs">{new Date(e.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="revenues">
          <Card><CardContent className="pt-4">
            {!revenues?.length ? <p className="text-center py-8 text-muted-foreground">{t("common.noData")}</p> :
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="text-start p-3">{language === "ar" ? "المصدر" : "Source"}</th>
                  <th className="text-start p-3">{t("common.amount")}</th>
                  <th className="text-start p-3">{language === "ar" ? "طريقة الدفع" : "Payment Method"}</th>
                  <th className="text-start p-3">{t("common.notes")}</th>
                  <th className="text-start p-3">{t("common.createdAt")}</th>
                </tr></thead>
                <tbody>
                  {revenues.map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">{getRevenueSourceLabel(r.source || "")}</td>
                      <td className="p-3 font-medium text-green-600">{r.amount}</td>
                      <td className="p-3">{r.paymentMethod || "-"}</td>
                      <td className="p-3 max-w-[200px] truncate">{r.notes || "-"}</td>
                      <td className="p-3 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Create Budget Dialog */}
      <Dialog open={showCreateBudget} onOpenChange={setShowCreateBudget}>
        <DialogContent>
          <DialogHeader><DialogTitle>{language === "ar" ? "ميزانية جديدة" : "New Budget"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{language === "ar" ? "الاسم" : "Name"} *</Label><Input value={budgetForm.name} onChange={e => setBudgetForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div>
              <Label>{language === "ar" ? "القسم" : "Feature"} *</Label>
              <Select value={budgetForm.feature} onValueChange={v => setBudgetForm(p => ({ ...p, feature: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUDGET_FEATURES.map(f => <SelectItem key={f.value} value={f.value}>{language === "ar" ? f.labelAr : f.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{language === "ar" ? "المبلغ المعتمد" : "Approved Amount"} *</Label><Input type="number" value={budgetForm.approvedAmount} onChange={e => setBudgetForm(p => ({ ...p, approvedAmount: e.target.value }))} /></div>
            <div><Label>{t("common.notes")}</Label><Textarea value={budgetForm.notes} onChange={e => setBudgetForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateBudget(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createBudget.mutate(budgetForm as any)} disabled={!budgetForm.name || !budgetForm.approvedAmount || createBudget.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Expense Dialog */}
      <Dialog open={showCreateExpense} onOpenChange={setShowCreateExpense}>
        <DialogContent>
          <DialogHeader><DialogTitle>{language === "ar" ? "مصروف جديد" : "New Expense"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{language === "ar" ? "نوع المصروف" : "Expense Type"} *</Label>
              <Select value={expenseForm.expenseType} onValueChange={v => setExpenseForm(p => ({ ...p, expenseType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{language === "ar" ? t.labelAr : t.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{language === "ar" ? "الوصف / السبب" : "Description / Reason"}</Label><Textarea value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>{t("common.amount")} *</Label><Input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div>
              <Label>{language === "ar" ? "طريقة الدفع" : "Payment Method"}</Label>
              <Select value={expenseForm.paymentMethod} onValueChange={v => setExpenseForm(p => ({ ...p, paymentMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS_EXPENSE.map(m => <SelectItem key={m.value} value={m.value}>{language === "ar" ? m.labelAr : m.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("common.notes")}</Label><Textarea value={expenseForm.notes} onChange={e => setExpenseForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateExpense(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createExpense.mutate({ expenseType: expenseForm.expenseType, description: expenseForm.description, amount: expenseForm.amount, notes: expenseForm.notes } as any)} disabled={!expenseForm.amount || !expenseForm.expenseType || createExpense.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Revenue Dialog */}
      <Dialog open={showCreateRevenue} onOpenChange={setShowCreateRevenue}>
        <DialogContent>
          <DialogHeader><DialogTitle>{language === "ar" ? "إيراد جديد" : "New Revenue"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{language === "ar" ? "المصدر" : "Source"} *</Label>
              <Select value={revenueForm.source} onValueChange={v => setRevenueForm(p => ({ ...p, source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REVENUE_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{language === "ar" ? s.labelAr : s.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("common.amount")} *</Label><Input type="number" value={revenueForm.amount} onChange={e => setRevenueForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div>
              <Label>{language === "ar" ? "طريقة الدفع" : "Payment Method"}</Label>
              <Select value={revenueForm.paymentMethod} onValueChange={v => setRevenueForm(p => ({ ...p, paymentMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS_REVENUE.map(m => <SelectItem key={m.value} value={m.value}>{language === "ar" ? m.labelAr : m.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("common.notes")}</Label><Textarea value={revenueForm.notes} onChange={e => setRevenueForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateRevenue(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createRevenue.mutate(revenueForm as any)} disabled={!revenueForm.amount || !revenueForm.source || createRevenue.isPending}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
