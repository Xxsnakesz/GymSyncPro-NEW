import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { useState } from "react";
import logoPath from "@assets/image_1759411904981.png";

export default function Landing() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1047] via-[#2d1b69] to-[#1e3a8a] p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src={logoPath} 
              alt="Idachi Fitness Logo" 
              className="w-40 h-40 object-contain"
              data-testid="img-logo"
            />
          </div>
          
          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-title">
            idachi Fitness Jakarta
          </h1>
          <p className="text-gray-300 text-sm" data-testid="text-subtitle">
            Sign in for access member portal
          </p>
        </div>

        {/* Login Form */}
        <div className="space-y-4">
          {/* Username Input */}
          <Input
            type="text"
            placeholder="Username"
            className="bg-[#2a3a4a] border-none text-white placeholder:text-gray-400 h-14"
            data-testid="input-username"
          />

          {/* Password Input */}
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="bg-[#2a3a4a] border-none text-white placeholder:text-gray-400 h-14 pr-12"
              data-testid="input-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              data-testid="button-toggle-password"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Terms and Conditions Checkbox */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="mt-1 border-gray-400 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
              data-testid="checkbox-terms"
            />
            <label htmlFor="terms" className="text-xs text-gray-300 leading-tight cursor-pointer">
              By signing in as a member, I confirm that I have read, understood, and agree to the{" "}
              <span className="text-white font-semibold">Idachi Fitness Jakarta Terms and Conditions</span>.
            </label>
          </div>

          {/* Sign In Button */}
          <Button
            onClick={handleLogin}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold h-12 text-base"
            data-testid="button-signin"
          >
            SIGN - IN
          </Button>

          {/* Login with Google */}
          <Button
            onClick={handleLogin}
            variant="outline"
            className="w-full bg-white hover:bg-gray-100 text-gray-800 font-medium h-12 border-none"
            data-testid="button-google"
          >
            <SiGoogle className="mr-2" size={18} />
            Login dengan Google
          </Button>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                className="border-gray-400 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                data-testid="checkbox-remember"
              />
              <label htmlFor="remember" className="text-sm text-gray-300 cursor-pointer">
                Remember Me
              </label>
            </div>
            <a href="#" className="text-sm text-gray-300 hover:text-white" data-testid="link-forgot-password">
              Forgot Password?
            </a>
          </div>

          {/* Register Button */}
          <Button
            onClick={handleLogin}
            variant="outline"
            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium h-12 border-none"
            data-testid="button-register"
          >
            👤 Register as Member
          </Button>

          {/* Need Help */}
          <p className="text-center text-sm text-gray-400" data-testid="text-help">
            Need Help?{" "}
            <a href="#" className="text-cyan-400 hover:text-cyan-300 font-medium">
              Contact Us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
