import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/ui/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, ImageIcon } from "lucide-react";

interface Promotion {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  cta?: string | null;
  ctaHref?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminPromotions() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: promos, refetch } = useQuery<Promotion[]>({
    queryKey: ["/api/admin/promotions"],
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState<Partial<Promotion>>({
    title: "",
    description: "",
    imageUrl: "",
    cta: "",
    ctaHref: "",
    isActive: true,
    sortOrder: 0,
  });
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setEditing(null);
    setForm({ title: "", description: "", imageUrl: "", cta: "", ctaHref: "", isActive: true, sortOrder: 0 });
  };

  const onAdd = () => { resetForm(); setOpen(true); };
  const onEdit = (p: Promotion) => {
    setEditing(p);
    setForm({ ...p });
    setOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/admin/promotions", payload);
      // Body is not required for UI since we refetch; avoid JSON parse issues if server sends HTML by mistake
      return { ok: res.ok } as const;
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Promotion created" });
      setOpen(false); resetForm(); refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/member/promotions"] });
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await apiRequest("PUT", `/api/admin/promotions/${id}`, payload);
      return { ok: res.ok } as const;
    },
    onSuccess: () => {
      toast({ title: "Updated", description: "Promotion updated" });
      setOpen(false); resetForm(); refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/member/promotions"] });
    },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/promotions/${id}`);
      return { ok: res.ok } as const;
    },
    onSuccess: () => { toast({ title: "Deleted", description: "Promotion removed" }); refetch(); queryClient.invalidateQueries({ queryKey: ["/api/member/promotions"] }); },
    onError: (e: any) => toast({ title: "Gagal", description: e.message, variant: "destructive" })
  });

  const onSubmit = () => {
    const payload: any = {
      title: form.title,
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
      cta: form.cta || undefined,
      ctaHref: form.ctaHref || undefined,
      isActive: form.isActive ?? true,
      sortOrder: Number(form.sortOrder || 0),
    };
    if (!payload.title) {
      toast({ title: "Judul wajib diisi", variant: "destructive" });
      return;
    }
    if (editing) updateMutation.mutate({ id: editing.id, payload });
    else createMutation.mutate(payload);
  };

  const rows = promos || [];

  const onFileChange = async (file: File | null) => {
    if (!file) return;
    // Only allow images up to ~2MB
    if (!file.type.startsWith('image/')) {
      toast({ title: 'File harus gambar', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Ukuran gambar terlalu besar (maks 2MB)', variant: 'destructive' });
      return;
    }
    try {
      setUploading(true);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Gagal membaca file'));
        reader.readAsDataURL(file);
      });
      const res = await apiRequest('POST', '/api/admin/upload-image', { dataUrl });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error('Server tidak mengembalikan JSON yang valid untuk upload');
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Gagal upload');
      setForm((f) => ({ ...f, imageUrl: json.url }));
      toast({ title: 'Gambar terunggah' });
    } catch (e: any) {
      toast({ title: 'Upload gagal', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminLayout user={user!} notificationCount={0}>
      <div className="space-y-4 bg-[#0F172A] min-h-screen -m-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Promotions</h1>
          <Button onClick={onAdd} className="bg-emerald-600 hover:bg-emerald-500">
            <Plus className="h-4 w-4 mr-2" /> New Promotion
          </Button>
        </div>

        <Card className="border-0 bg-[#1E293B] shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">All Promotions</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="text-center py-12 text-gray-400">Belum ada promotions</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-gray-400">Banner</TableHead>
                      <TableHead className="text-gray-400">Title</TableHead>
                      <TableHead className="text-gray-400">CTA</TableHead>
                      <TableHead className="text-right text-gray-400">Status</TableHead>
                      <TableHead className="text-right text-gray-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((p) => (
                      <TableRow key={p.id} className="hover:bg-[#0B1220]">
                        <TableCell>
                          <div className="w-16 h-10 rounded-md overflow-hidden bg-[#0B1220] flex items-center justify-center border border-gray-700">
                            {p.imageUrl ? <img src={p.imageUrl} alt="banner" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-gray-500" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-medium">{p.title}</TableCell>
                        <TableCell className="text-gray-300 text-sm">{p.cta || '—'}</TableCell>
                        <TableCell className="text-right">{p.isActive ? <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => onEdit(p)}><Pencil className="w-4 h-4 mr-1"/> Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="w-4 h-4 mr-1"/> Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-[#0F172A] border border-gray-700 text-white max-w-xl">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Promotion' : 'New Promotion'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-300">Title</Label>
                  <Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Judul promo" />
                </div>
                <div>
                  <Label className="text-gray-300">Description</Label>
                  <Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi singkat" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Banner Image</Label>
                  {form.imageUrl ? (
                    <div className="flex items-center gap-3">
                      <img src={form.imageUrl} alt="preview" className="w-24 h-16 rounded-md object-cover border border-gray-700" />
                      <Button type="button" variant="outline" onClick={() => setForm({ ...form, imageUrl: '' })}>Ganti</Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        id="promo-image"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500"
                        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                        disabled={uploading}
                      />
                      {uploading && <p className="text-xs text-gray-400 mt-1">Mengunggah...</p>}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-700 p-3">
                  <div>
                    <Label className="text-gray-300">Active</Label>
                    <p className="text-xs text-gray-400">Tampilkan untuk member</p>
                  </div>
                  <Switch checked={form.isActive ?? true} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-300">CTA Text</Label>
                    <Input value={form.cta || ''} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder="Claim Now" />
                  </div>
                  <div>
                    <Label className="text-gray-300">CTA Link</Label>
                    <Input value={form.ctaHref || ''} onChange={(e) => setForm({ ...form, ctaHref: e.target.value })} placeholder="/classes atau https://..." />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Sort Order</Label>
                  <Input type="number" value={String(form.sortOrder ?? 0)} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={onSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                    {editing ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
