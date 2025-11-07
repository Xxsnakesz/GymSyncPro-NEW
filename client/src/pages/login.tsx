import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/schema.ts";
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
import BrandWatermark from "@/components/brand-watermark";

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
    <div className="min-h-screen w-full bg-background relative overflow-hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* Centered transparent brand watermark like dashboard */}
      <BrandWatermark opacity={0.15} />

      <div className="container mx-auto min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding (desktop only) */}
          <div className="hidden lg:flex flex-col justify-center space-y-6 p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-neon-purple rounded-2xl blur-xl opacity-60 animate-pulse"></div>
                  <img
                    src={idachiLogo}
                    alt="Idachi Fitness Logo"
                    className="relative h-20 w-20 object-contain rounded-xl"
                  />
                </div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-neon-purple bg-clip-text text-transparent">
                  Idachi Fitness
                </h1>
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                Wujudkan Tubuh Impian Anda
              </h2>

              <p className="text-lg text-muted-foreground">
                Bergabunglah dengan ribuan member yang telah mencapai target fitness mereka bersama kami.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border shadow-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Akses Unlimited</h3>
                  <p className="text-sm text-muted-foreground">Gym equipment terlengkap 24/7</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border shadow-lg">
                <div className="p-2 rounded-lg bg-neon-purple/10">
                  <Sparkles className="h-5 w-5 text-neon-purple" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Personal Trainer</h3>
                  <p className="text-sm text-muted-foreground">Bimbingan profesional untuk hasil maksimal</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full">
            {/* Mobile-first: decorative halo behind the card */}
            <div className="lg:hidden relative max-w-md mx-auto">
              <div className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full bg-gradient-to-r from-primary/40 to-neon-purple/40 blur-2xl" />
            </div>

            {/* Gradient border wrapper for subtle premium feel on mobile */}
            <div className="mx-auto max-w-md lg:max-w-none lg:mx-0 p-[1.5px] rounded-3xl bg-gradient-to-r from-primary/40 to-neon-purple/40">
              <Card className="rounded-3xl border border-border/70 shadow-2xl bg-card/90 backdrop-blur-xl">
                <CardHeader className="space-y-2 pb-6">
                  <div className="lg:hidden flex justify-center mb-4">
                    <img
                      src={idachiLogo}
                      alt="Idachi Fitness Logo"
                      className="h-16 w-16 object-contain rounded-xl"
                      data-testid="img-logo"
                    />
                  </div>
                  <CardTitle className="text-3xl font-bold text-center text-foreground">
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
                            <FormLabel className="text-foreground font-medium">Email/Nomor Telepon/Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                  placeholder="Masukkan email, nomor telepon, atau username"
                                  className="pl-10 h-12 rounded-xl text-base font-medium bg-card/90 dark:bg-card/90 text-foreground placeholder:text-muted-foreground/70 caret-primary border border-border/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary shadow-sm"
                                  autoCapitalize="none"
                                  autoCorrect="off"
                                  spellCheck={false}
                                  inputMode="email"
                                  autoComplete="username"
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
                            <FormLabel className="text-foreground font-medium">Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Masukkan password"
                                  className="pl-10 pr-10 h-12 rounded-xl text-base font-medium bg-card/90 dark:bg-card/90 text-foreground placeholder:text-muted-foreground/70 caret-primary border border-border/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary shadow-sm"
                                  autoComplete="current-password"
                                  data-testid="input-password"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                                  className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  data-testid="checkbox-remember"
                                />
                              </FormControl>
                              <FormLabel className="text-sm text-muted-foreground font-normal cursor-pointer">
                                Remember Me
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                        <Link
                          href="/forgot-password"
                          className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                          data-testid="link-forgot-password"
                        >
                          Lupa Password?
                        </Link>
                      </div>

                      <Button
                        type="submit"
                        className="group w-full h-12 bg-gradient-to-r from-primary to-neon-purple hover:from-primary/90 hover:to-neon-purple/90 text-white font-semibold text-base shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40"
                        disabled={loginMutation.isPending}
                        data-testid="button-login"
                      >
                        {loginMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            Memproses...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 justify-center">
                            Login
                            <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                          </span>
                        )}
                      </Button>

                      {/* Terms & Privacy for mobile */}
                      <p className="text-center text-xs text-muted-foreground leading-relaxed">
                        Dengan login, Anda menyetujui{" "}
                        <Link href="/terms" className="text-primary hover:underline">Syarat & Ketentuan</Link>
                        {" "}dan{" "}
                        <Link href="/terms#privacy" className="text-primary hover:underline">Kebijakan Privasi</Link>.
                      </p>
                    </form>
                  </Form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-card text-muted-foreground">
                        Belum punya akun?
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <Link href="/register" data-testid="link-register">
                      <Button
                        variant="outline"
                        className="w-full h-12 border-2 border-primary text-primary hover:bg-primary/10 font-semibold"
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
    </div>
  );
}
