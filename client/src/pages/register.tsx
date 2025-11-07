import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@shared/schema.ts";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, User, Mail, Phone, Lock, UserPlus, ArrowRight, CheckCircle2, Send } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import CameraSelfie from "@/components/CameraSelfie";

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      selfieImage: "",
    },
  });

  const password = form.watch("password");
  const email = form.watch("email");

  const passwordStrength = useMemo(() => {
    if (!password) return { strength: 0, label: "", color: "" };
    
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.length >= 8) strength += 15;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 20;
    if (/\d/.test(password)) strength += 20;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 20;

    if (strength < 40) return { strength, label: "Lemah", color: "bg-red-500" };
    if (strength < 70) return { strength, label: "Sedang", color: "bg-yellow-500" };
    return { strength, label: "Kuat", color: "bg-green-500" };
  }, [password]);

  const handleSendCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Email tidak valid",
        description: "Mohon masukkan email yang valid",
        variant: "destructive",
      });
      return;
    }

    if (!email.toLowerCase().endsWith("@gmail.com")) {
      toast({
        title: "Email tidak valid",
        description: "Email harus menggunakan Gmail (@gmail.com)",
        variant: "destructive",
      });
      return;
    }

    setIsSendingCode(true);
    try {
      await apiRequest("POST", "/api/send-verification-code", { email });
      setCodeSent(true);
      toast({
        title: "Kode Terkirim!",
        description: "Kode verifikasi telah dikirim ke email Anda",
      });
    } catch (error: any) {
      toast({
        title: "Gagal Mengirim Kode",
        description: error.message || "Terjadi kesalahan saat mengirim kode verifikasi",
        variant: "destructive",
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Kode tidak valid",
        description: "Mohon masukkan kode verifikasi 6 digit",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/check-verification-code", { 
        email, 
        verificationCode 
      });
      setEmailVerified(true);
      toast({
        title: "Email Terverifikasi!",
        description: "Silakan lanjutkan mengisi form registrasi",
      });
    } catch (error: any) {
      toast({
        title: "Verifikasi Gagal",
        description: error.message || "Kode verifikasi tidak valid atau sudah kadaluarsa",
        variant: "destructive",
      });
    }
  };

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      return await apiRequest("POST", "/api/register-verified", data);
    },
    onSuccess: async (response: any) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Registrasi berhasil",
        description: "Selamat datang di Idachi Fitness!",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Registrasi gagal",
        description: error.message || "Terjadi kesalahan saat registrasi",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    if (!emailVerified) {
      toast({
        title: "Email belum diverifikasi",
        description: "Mohon verifikasi email Anda terlebih dahulu",
        variant: "destructive",
      });
      return;
    }
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-100 dark:from-gray-950 dark:via-yellow-950 dark:to-amber-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-300/20 dark:bg-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto min-h-screen flex items-center justify-center p-4 py-12 relative z-10">
        <div className="w-full max-w-5xl">
          <Card className="border-2 border-yellow-200 dark:border-yellow-800/50 shadow-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl">
            <CardHeader className="space-y-2 pb-6">
              <div className="flex justify-center mb-2">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 shadow-lg">
                  <UserPlus className="h-10 w-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-center text-yellow-500 dark:text-yellow-400">
                Bergabung dengan Idachi Fitness
              </CardTitle>
              <CardDescription className="text-center text-base">
                Mulai perjalanan fitness Anda hari ini
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* Name Fields */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">Nama Depan</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input
                                placeholder="John"
                                className="pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-yellow-500 dark:focus:border-yellow-400"
                                data-testid="input-firstName"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">Nama Belakang</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input
                                placeholder="Doe"
                                className="pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-yellow-500 dark:focus:border-yellow-400"
                                data-testid="input-lastName"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Username */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                              placeholder="johndoe"
                              className="pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                              data-testid="input-username"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email Verification Section */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">
                            Email (Gmail) 
                            {emailVerified && <CheckCircle2 className="inline ml-2 h-4 w-4 text-green-500" />}
                          </FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                  type="email"
                                  placeholder="nama@gmail.com"
                                  className="pl-10 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-yellow-500 dark:focus:border-yellow-400"
                                  data-testid="input-email"
                                  disabled={emailVerified}
                                  {...field}
                                />
                              </div>
                              <Button
                                type="button"
                                onClick={handleSendCode}
                                disabled={isSendingCode || emailVerified || !email}
                                className="h-11 bg-yellow-500 hover:bg-yellow-600 text-white"
                                data-testid="button-send-code"
                              >
                                {isSendingCode ? (
                                  <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : emailVerified ? (
                                  <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                  <Send className="h-5 w-5" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {codeSent && !emailVerified && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kode Verifikasi</label>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Masukkan 6 digit kode"
                            maxLength={6}
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            className="flex-1 h-11 text-center text-lg tracking-widest font-bold bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-yellow-500 dark:focus:border-yellow-400"
                            data-testid="input-verification-code"
                          />
                          <Button
                            type="button"
                            onClick={handleVerifyCode}
                            disabled={verificationCode.length !== 6}
                            className="h-11 bg-green-500 hover:bg-green-600 text-white"
                            data-testid="button-verify-code"
                          >
                            Verifikasi
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Kode verifikasi berlaku selama 15 menit
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Selfie Photo Section */}
                  <FormField
                    control={form.control}
                    name="selfieImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">
                          Foto Selfie <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <CameraSelfie
                            onCapture={(imageData) => {
                              field.onChange(imageData);
                            }}
                            capturedImage={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Foto selfie wajib diambil untuk melanjutkan registrasi
                        </p>
                      </FormItem>
                    )}
                  />

                  {/* Phone */}
                  <div className="grid md:grid-cols-1 gap-4">

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">Nomor Telepon</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <div className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 font-medium pointer-events-none">
                                +62
                              </div>
                              <Input
                                type="tel"
                                placeholder="812345678"
                                className="pl-[4.5rem] h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-yellow-500 dark:focus:border-yellow-400"
                                data-testid="input-phone"
                                {...field}
                                value={field.value || ""}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Password Fields */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">Password</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Minimal 6 karakter"
                                className="pl-10 pr-10 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                                data-testid="input-password"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                data-testid="button-toggle-password"
                              >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                            </div>
                            {password && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Progress value={passwordStrength.strength} className="h-2 flex-1" />
                                  <span className={`text-xs font-medium ${
                                    passwordStrength.label === "Kuat" ? "text-green-600" :
                                    passwordStrength.label === "Sedang" ? "text-yellow-600" : "text-red-600"
                                  }`}>
                                    {passwordStrength.label}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">Konfirmasi Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Ketik ulang password"
                              className="pl-10 pr-10 h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                              data-testid="input-confirmPassword"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              data-testid="button-toggle-confirm-password"
                            >
                              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold text-base shadow-lg shadow-yellow-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/40"
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        Mendaftar...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Daftar Sekarang
                        <ArrowRight className="h-5 w-5" />
                      </span>
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">
                        Sudah punya akun?
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <Link href="/login" data-testid="link-login">
                      <Button 
                        variant="outline" 
                        type="button"
                        className="w-full h-11 border-2 border-yellow-300 dark:border-yellow-700 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950 font-semibold"
                      >
                        Login di sini
                      </Button>
                    </Link>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
