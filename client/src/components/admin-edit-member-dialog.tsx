import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MembershipPlan } from "@shared/schema";

const editMemberSchema = z.object({
  firstName: z.string().min(1, "Nama depan diperlukan"),
  lastName: z.string().min(1, "Nama belakang diperlukan"),
  username: z.string().min(3, "Username minimal 3 karakter"),
  email: z.string().email("Email tidak valid"),
  phone: z.string().optional(),
  password: z.string().optional(),
});

const assignMembershipSchema = z.object({
  planId: z.string().min(1, "Pilih paket membership"),
  durationMonths: z.number().min(1, "Durasi minimal 1 bulan").optional(),
});

type EditMemberFormData = z.infer<typeof editMemberSchema>;
type AssignMembershipFormData = z.infer<typeof assignMembershipSchema>;

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone?: string;
  membership?: {
    plan?: {
      name: string;
    };
    endDate?: string;
    status?: string;
  };
}

interface AdminEditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
}

export default function AdminEditMemberDialog({ open, onOpenChange, member }: AdminEditMemberDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");

  const memberForm = useForm<EditMemberFormData>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const membershipForm = useForm<AssignMembershipFormData>({
    resolver: zodResolver(assignMembershipSchema),
    defaultValues: {
      planId: "",
      durationMonths: undefined,
    },
  });

  const { data: membershipPlans } = useQuery<MembershipPlan[]>({
    queryKey: ["/api/membership-plans"],
    enabled: open,
  });

  useEffect(() => {
    if (member) {
      memberForm.reset({
        firstName: member.firstName,
        lastName: member.lastName,
        username: member.username,
        email: member.email,
        phone: member.phone || "",
        password: "",
      });
    }
  }, [member, memberForm]);

  const updateMemberMutation = useMutation({
    mutationFn: async (data: EditMemberFormData) => {
      const dataToSend = { ...data };
      if (!data.password) {
        delete (dataToSend as any).password;
      }
      return await apiRequest("PUT", `/api/admin/members/${member?.id}`, dataToSend);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({
        title: "Berhasil!",
        description: "Data member berhasil diperbarui",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal memperbarui data member",
        variant: "destructive",
      });
    },
  });

  const assignMembershipMutation = useMutation({
    mutationFn: async (data: AssignMembershipFormData) => {
      return await apiRequest("POST", `/api/admin/members/${member?.id}/membership`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({
        title: "Berhasil!",
        description: "Membership berhasil diberikan",
      });
      membershipForm.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal memberikan membership",
        variant: "destructive",
      });
    },
  });

  const onSubmitMemberDetails = (data: EditMemberFormData) => {
    updateMemberMutation.mutate(data);
  };

  const onSubmitMembership = (data: AssignMembershipFormData) => {
    assignMembershipMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Member: {member?.firstName} {member?.lastName}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details" data-testid="tab-details">Detail Member</TabsTrigger>
            <TabsTrigger value="membership" data-testid="tab-membership">Membership</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <Form {...memberForm}>
              <form onSubmit={memberForm.handleSubmit(onSubmitMemberDetails)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={memberForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Depan</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="John"
                            data-testid="input-edit-firstname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={memberForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Belakang</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Doe"
                            data-testid="input-edit-lastname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={memberForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="johndoe"
                          data-testid="input-edit-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={memberForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="john@example.com"
                          data-testid="input-edit-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={memberForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor Telepon (Opsional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="+62 812 3456 7890"
                          data-testid="input-edit-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={memberForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password Baru (Opsional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Kosongkan jika tidak ingin mengubah"
                          data-testid="input-edit-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    data-testid="button-cancel-details"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="gym-gradient text-white"
                    disabled={updateMemberMutation.isPending}
                    data-testid="button-save-details"
                  >
                    {updateMemberMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="membership" className="space-y-4 mt-4">
            {member?.membership && (
              <div className="bg-muted p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2">Membership Saat Ini</h4>
                <div className="text-sm space-y-1">
                  <p>Paket: <span className="font-medium">{member.membership.plan?.name || 'N/A'}</span></p>
                  <p>Status: <span className="font-medium">{member.membership.status || 'N/A'}</span></p>
                  <p>Berakhir: <span className="font-medium">
                    {member.membership.endDate 
                      ? new Date(member.membership.endDate).toLocaleDateString('id-ID')
                      : 'N/A'
                    }
                  </span></p>
                </div>
              </div>
            )}

            <Form {...membershipForm}>
              <form onSubmit={membershipForm.handleSubmit(onSubmitMembership)} className="space-y-4">
                <FormField
                  control={membershipForm.control}
                  name="planId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pilih Paket Membership</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-membership-plan">
                            <SelectValue placeholder="Pilih paket membership" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {membershipPlans?.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - Rp {Number(plan.price).toLocaleString('id-ID')} / {plan.durationMonths} bulan
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={membershipForm.control}
                  name="durationMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durasi Custom (Opsional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Kosongkan untuk durasi default"
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          value={field.value || ""}
                          data-testid="input-duration-months"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                  <p className="text-blue-700 dark:text-blue-300">
                    Memberikan membership baru akan menggantikan membership yang aktif saat ini (jika ada).
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    data-testid="button-cancel-membership"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="gym-gradient text-white"
                    disabled={assignMembershipMutation.isPending}
                    data-testid="button-assign-membership"
                  >
                    {assignMembershipMutation.isPending ? "Memproses..." : "Berikan Membership"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
