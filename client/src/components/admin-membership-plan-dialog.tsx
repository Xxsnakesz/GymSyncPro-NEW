import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X } from "lucide-react";
import type { MembershipPlan } from "@shared/schema";

const membershipPlanSchema = z.object({
  name: z.string().min(1, "Nama paket diperlukan"),
  description: z.string().optional(),
  price: z.string().min(1, "Harga diperlukan").refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Harga harus berupa angka positif",
  }),
  durationMonths: z.string().min(1, "Durasi diperlukan").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Durasi harus lebih dari 0 bulan",
  }),
  features: z.array(z.string()).optional(),
  active: z.boolean().default(true),
});

type MembershipPlanFormData = z.infer<typeof membershipPlanSchema>;

interface AdminMembershipPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: MembershipPlan | null;
}

export default function AdminMembershipPlanDialog({ open, onOpenChange, plan }: AdminMembershipPlanDialogProps) {
  const { toast } = useToast();
  const [featureInput, setFeatureInput] = useState("");
  const [features, setFeatures] = useState<string[]>([]);

  const form = useForm<MembershipPlanFormData>({
    resolver: zodResolver(membershipPlanSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      durationMonths: "",
      features: [],
      active: true,
    },
  });

  useEffect(() => {
    if (plan) {
      form.reset({
        name: plan.name,
        description: plan.description || "",
        price: plan.price.toString(),
        durationMonths: plan.durationMonths.toString(),
        features: [],
        active: plan.active ?? true,
      });
      setFeatures(Array.isArray(plan.features) ? plan.features : []);
    } else {
      form.reset({
        name: "",
        description: "",
        price: "",
        durationMonths: "",
        features: [],
        active: true,
      });
      setFeatures([]);
    }
  }, [plan, form]);

  const createPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/membership-plans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/membership-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/membership-plans"] });
      toast({
        title: "Berhasil!",
        description: plan ? "Paket membership berhasil diperbarui" : "Paket membership baru berhasil dibuat",
      });
      form.reset();
      setFeatures([]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menyimpan paket membership",
        variant: "destructive",
      });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PUT", `/api/admin/membership-plans/${plan?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/membership-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/membership-plans"] });
      toast({
        title: "Berhasil!",
        description: "Paket membership berhasil diperbarui",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal memperbarui paket membership",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MembershipPlanFormData) => {
    const planData = {
      name: data.name,
      description: data.description || null,
      price: data.price,
      durationMonths: data.durationMonths,
      features: features.length > 0 ? features : null,
      active: data.active,
    };

    if (plan) {
      updatePlanMutation.mutate(planData);
    } else {
      createPlanMutation.mutate(planData);
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFeatures([...features, featureInput.trim()]);
      setFeatureInput("");
    }
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFeature();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit Paket Membership" : "Buat Paket Membership Baru"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Paket</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Contoh: Basic, Premium, Elite"
                      data-testid="input-plan-name"
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
                  <FormLabel>Deskripsi (Opsional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Deskripsi singkat tentang paket ini"
                      rows={3}
                      data-testid="input-plan-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga (Rp)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="500000"
                        data-testid="input-plan-price"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Masa Aktif (Bulan)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="1"
                        data-testid="input-plan-duration"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormLabel>Fitur-fitur</FormLabel>
              <FormDescription className="text-sm text-muted-foreground mb-2">
                Tambahkan fitur yang termasuk dalam paket ini
              </FormDescription>
              <div className="flex gap-2 mb-3">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Contoh: Akses gym 24/7"
                  data-testid="input-feature"
                />
                <Button
                  type="button"
                  onClick={addFeature}
                  variant="outline"
                  data-testid="button-add-feature"
                >
                  Tambah
                </Button>
              </div>
              {features.length > 0 && (
                <div className="space-y-2">
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-muted p-2 rounded-md"
                      data-testid={`feature-item-${index}`}
                    >
                      <span className="text-sm">{feature}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeature(index)}
                        data-testid={`button-remove-feature-${index}`}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Status Aktif</FormLabel>
                    <FormDescription>
                      Paket aktif akan ditampilkan kepada member
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-plan-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setFeatures([]);
                  onOpenChange(false);
                }}
                data-testid="button-cancel"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="gym-gradient text-white"
                disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                data-testid="button-submit"
              >
                {(createPlanMutation.isPending || updatePlanMutation.isPending)
                  ? "Menyimpan..."
                  : plan
                  ? "Update Paket"
                  : "Buat Paket"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
