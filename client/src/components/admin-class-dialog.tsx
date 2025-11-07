import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { GymClass } from "@shared/schema.ts";
import { useRef, useState as useReactState } from "react";

const classSchema = z.object({
  name: z.string().min(1, "Nama class diperlukan"),
  description: z.string().optional(),
  imageUrl: z.string().url("Masukkan URL gambar yang valid").optional().or(z.literal("")),
  instructorName: z.string().min(1, "Nama instruktur diperlukan"),
  schedule: z.string().min(1, "Jadwal diperlukan"),
  maxCapacity: z.string().min(1, "Kapasitas maksimum diperlukan"),
});

type ClassFormData = z.infer<typeof classSchema>;

interface AdminClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gymClass?: GymClass | null;
}

export default function AdminClassDialog({ open, onOpenChange, gymClass }: AdminClassDialogProps) {
  const { toast } = useToast();
  const isEditing = !!gymClass;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useReactState(false);
  const [preview, setPreview] = useReactState<string | undefined>(undefined);

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
      instructorName: "",
      schedule: "",
      maxCapacity: "",
    },
  });

  useEffect(() => {
    if (gymClass) {
      form.reset({
        name: gymClass.name || "",
        description: gymClass.description || "",
        imageUrl: (gymClass as any).imageUrl || "",
        instructorName: gymClass.instructorName || "",
        schedule: gymClass.schedule || "",
        maxCapacity: gymClass.maxCapacity?.toString() || "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        imageUrl: "",
        instructorName: "",
        schedule: "",
        maxCapacity: "",
      });
    }
  }, [gymClass, form]);

  const createMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      const payload = {
        ...data,
        imageUrl: data.imageUrl || undefined,
        maxCapacity: parseInt(data.maxCapacity),
        currentEnrollment: 0,
        active: true,
      };
      return await apiRequest("POST", "/api/admin/classes", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Berhasil!",
        description: "Class berhasil ditambahkan",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menambahkan class",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      const payload = {
        ...data,
        imageUrl: data.imageUrl || undefined,
        maxCapacity: parseInt(data.maxCapacity),
      };
      return await apiRequest("PUT", `/api/admin/classes/${gymClass?.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      toast({
        title: "Berhasil!",
        description: "Class berhasil diupdate",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal mengupdate class",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ClassFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handlePickFile = () => fileInputRef.current?.click();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Format tidak didukung', description: 'Pilih file gambar (PNG/JPG/WEBP).', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      try {
        setUploading(true);
        const res = await apiRequest('POST', '/api/admin/upload-image', { dataUrl });
        const json = await res.json();
        form.setValue('imageUrl', json.url, { shouldDirty: true });
        toast({ title: 'Gambar terunggah', description: 'Poster berhasil diunggah.' });
      } catch (err: any) {
        toast({ title: 'Gagal unggah', description: err?.message || 'Tidak bisa mengunggah gambar', variant: 'destructive' });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Gym Class" : "Tambah Gym Class"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update informasi gym class" : "Isi form di bawah untuk menambah gym class baru"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Poster uploader */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Poster/Gambar</span>
                  <span className="text-xs text-muted-foreground">Upload file gambar untuk poster class</span>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handlePickFile} disabled={uploading}>
                  {uploading ? 'Mengunggah…' : 'Pilih Gambar'}
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
              {(preview || form.watch('imageUrl')) && (
                <div className="aspect-[16/9] w-full overflow-hidden rounded-md border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview || form.watch('imageUrl')!} alt="Poster" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Class *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Contoh: Yoga Beginner, HIIT Training" 
                      {...field} 
                      data-testid="input-class-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instructorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Instruktur *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Contoh: Sarah Johnson" 
                      {...field} 
                      data-testid="input-class-instructor"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Deskripsikan class ini..."
                      rows={3}
                      {...field} 
                      data-testid="input-class-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="schedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jadwal *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Mon, Wed - 7:00 AM" 
                        {...field} 
                        data-testid="input-class-schedule"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kapasitas Maksimum *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="20" 
                        {...field} 
                        data-testid="input-class-capacity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-class"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="gym-gradient text-white"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-class"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Update" : "Tambah Class"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
