import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { verifyEmailSchema } from "@shared/schema";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, useSearch } from "wouter";
import { Mail, CheckCircle } from "lucide-react";
import idachiLogo from "@assets/image_1759411904981.png";

type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;

export default function VerifyEmail() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  const emailFromUrl = urlParams.get('email') || '';
  const [isResending, setIsResending] = useState(false);

  const form = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: emailFromUrl,
      verificationCode: "",
    },
  });

  useEffect(() => {
    if (emailFromUrl) {
      form.setValue('email', emailFromUrl);
    }
  }, [emailFromUrl, form]);

  const verifyMutation = useMutation({
    mutationFn: async (data: VerifyEmailFormData) => {
      return await apiRequest("POST", "/api/verify-email", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Verifikasi Berhasil!",
        description: "Email Anda telah diverifikasi. Selamat datang!",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Verifikasi Gagal",
        description: error.message || "Kode verifikasi tidak valid atau sudah kadaluarsa",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VerifyEmailFormData) => {
    verifyMutation.mutate(data);
  };

  const handleResendCode = async () => {
    if (!emailFromUrl) {
      toast({
        title: "Error",
        description: "Email tidak ditemukan",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    try {
      await apiRequest("POST", "/api/resend-verification-code", { email: emailFromUrl });
      toast({
        title: "Kode Terkirim!",
        description: "Kode verifikasi baru telah dikirim ke email Anda",
      });
    } catch (error: any) {
      toast({
        title: "Gagal Mengirim Kode",
        description: error.message || "Terjadi kesalahan saat mengirim kode verifikasi",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-100 dark:from-gray-950 dark:via-yellow-950 dark:to-amber-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-300/20 dark:bg-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-200/10 dark:bg-yellow-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          <Card className="border-2 border-yellow-200 dark:border-yellow-800/50 shadow-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl">
            <CardHeader className="space-y-2 pb-6">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl blur-2xl opacity-60 animate-pulse"></div>
                  <img 
                    src={idachiLogo} 
                    alt="Idachi Fitness Logo" 
                    className="relative h-16 w-16 object-contain rounded-xl"
                    data-testid="img-logo"
                  />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-center text-gray-900 dark:text-white">
                Verifikasi Email
              </CardTitle>
              <CardDescription className="text-center text-base">
                Masukkan kode verifikasi yang telah dikirim ke email Anda
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                  <Mail className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input
                            type="email"
                            data-testid="input-email"
                            readOnly
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="verificationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">Kode Verifikasi</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Masukkan 6 digit kode"
                            maxLength={6}
                            className="h-14 text-center text-2xl tracking-widest font-bold bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-yellow-500 dark:focus:border-yellow-400"
                            data-testid="input-verification-code"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-center text-sm">
                          Kode verifikasi berlaku selama 15 menit
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold text-base shadow-lg shadow-yellow-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/40"
                    disabled={verifyMutation.isPending}
                    data-testid="button-verify"
                  >
                    {verifyMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        Memverifikasi...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Verifikasi Email
                      </span>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-yellow-500 dark:border-yellow-600 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
                    onClick={handleResendCode}
                    disabled={isResending}
                    data-testid="button-resend-code"
                  >
                    {isResending ? (
                      <span className="flex items-center gap-2">
                        <div className="h-5 w-5 border-3 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
                        Mengirim ulang...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Kirim Ulang Kode
                      </span>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
