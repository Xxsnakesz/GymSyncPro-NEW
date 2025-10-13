import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/schema";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, User, Lock, Dumbbell, Sparkles, ArrowRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import idachiLogo from "@assets/image_1759411904981.png";

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return await apiRequest("POST", "/api/login", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Login berhasil",
        description: "Selamat datang kembali!",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Login gagal",
        description: error.message || "Username atau password salah",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-100 dark:from-gray-950 dark:via-yellow-950 dark:to-amber-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-300/20 dark:bg-yellow-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-200/10 dark:bg-yellow-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding */}
          <div className="hidden lg:flex flex-col justify-center space-y-6 p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl blur-2xl opacity-60 animate-pulse"></div>
                  <img 
                    src={idachiLogo} 
                    alt="Idachi Fitness Logo" 
                    className="relative h-20 w-20 object-contain rounded-xl"
                  />
                </div>
                <h1 className="text-5xl font-bold text-yellow-500 dark:text-yellow-400">
                  Idachi Fitness
                </h1>
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
                Wujudkan Tubuh Impian Anda
              </h2>
              
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Bergabunglah dengan ribuan member yang telah mencapai target fitness mereka bersama kami.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-yellow-200 dark:border-yellow-800/50 shadow-lg">
                <div className="p-2 rounded-lg bg-yellow-400/20 dark:bg-yellow-500/20">
                  <Dumbbell className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Akses Unlimited</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Gym equipment terlengkap 24/7</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-amber-200 dark:border-amber-800/50 shadow-lg">
                <div className="p-2 rounded-lg bg-amber-400/20 dark:bg-amber-500/20">
                  <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Personal Trainer</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Bimbingan profesional untuk hasil maksimal</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full">
            <Card className="border-2 border-yellow-200 dark:border-yellow-800/50 shadow-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl">
              <CardHeader className="space-y-2 pb-6">
                <div className="lg:hidden flex justify-center mb-4">
                  <img 
                    src={idachiLogo} 
                    alt="Idachi Fitness Logo" 
                    className="h-16 w-16 object-contain rounded-xl"
                    data-testid="img-logo"
                  />
                </div>
                <CardTitle className="text-3xl font-bold text-center text-gray-900 dark:text-white">
                  Selamat Datang Kembali
                </CardTitle>
                <CardDescription className="text-center text-base">
                  Login untuk melanjutkan perjalanan fitness Anda
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                                placeholder="Masukkan username"
                                className="pl-10 h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-yellow-500 dark:focus:border-yellow-400"
                                data-testid="input-username"
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
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Masukkan password"
                                className="pl-10 pr-10 h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-yellow-500 dark:focus:border-yellow-400"
                                data-testid="input-password"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                data-testid="button-toggle-password"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between">
                      <FormField
                        control={form.control}
                        name="rememberMe"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="border-gray-400 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                                data-testid="checkbox-remember"
                              />
                            </FormControl>
                            <FormLabel className="text-sm text-gray-600 dark:text-gray-400 font-normal cursor-pointer">
                              Remember Me
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <Link 
                        href="/forgot-password" 
                        className="text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 font-medium transition-colors"
                        data-testid="link-forgot-password"
                      >
                        Lupa Password?
                      </Link>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold text-base shadow-lg shadow-yellow-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/40"
                      disabled={loginMutation.isPending}
                      data-testid="button-login"
                    >
                      {loginMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                          Memproses...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Login
                          <ArrowRight className="h-5 w-5" />
                        </span>
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">
                      Belum punya akun?
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <Link href="/register" data-testid="link-register">
                    <Button 
                      variant="outline" 
                      className="w-full h-12 border-2 border-yellow-300 dark:border-yellow-700 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950 font-semibold"
                    >
                      Daftar Sekarang
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
