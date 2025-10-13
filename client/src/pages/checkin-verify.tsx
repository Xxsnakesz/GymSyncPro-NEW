import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckInVerify() {
  const [, params] = useRoute("/checkin/verify/:code");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [memberData, setMemberData] = useState<any>(null);

  useEffect(() => {
    const verifyCheckIn = async () => {
      if (!params?.code) {
        setStatus("error");
        setMessage("Kode QR tidak valid");
        return;
      }

      try {
        const response = await fetch("/api/checkin/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ qrCode: params.code }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("success");
          setMessage("Check-in berhasil!");
          setMemberData(data.user);
        } else {
          setStatus("error");
          setMessage(data.message || "Check-in gagal");
          setMemberData(data.user);
        }
      } catch (error) {
        setStatus("error");
        setMessage("Terjadi kesalahan saat check-in");
      }
    };

    verifyCheckIn();
  }, [params?.code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
          {status === "loading" && (
            <div className="flex flex-col items-center space-y-4" data-testid="loading-state">
              <Loader2 className="w-20 h-20 text-blue-500 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Memverifikasi...
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Mohon tunggu sebentar
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center space-y-6" data-testid="success-state">
              <div className="relative">
                <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-green-500 rounded-full p-6">
                  <CheckCircle className="w-20 h-20 text-white" data-testid="icon-success" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-success-title">
                  CHECK IN BERHASIL
                </h1>
                <p className="text-lg text-gray-700 dark:text-gray-300">
                  {message}
                </p>
              </div>

              {memberData && (
                <div className="w-full bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Member</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100" data-testid="text-member-name">
                    {memberData.firstName} {memberData.lastName}
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Selamat berolahraga! 💪
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center space-y-6" data-testid="error-state">
              <div className="relative">
                <div className="absolute inset-0 bg-red-400 rounded-full blur-xl opacity-50"></div>
                <div className="relative bg-red-500 rounded-full p-6">
                  <XCircle className="w-20 h-20 text-white" data-testid="icon-error" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-red-600 dark:text-red-400" data-testid="text-error-title">
                  CHECK IN GAGAL
                </h1>
                <p className="text-lg text-gray-700 dark:text-gray-300">
                  {message}
                </p>
              </div>

              {memberData && (
                <div className="w-full bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Member</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    {memberData.firstName} {memberData.lastName}
                  </p>
                </div>
              )}

              <Button
                onClick={() => window.location.href = "/login"}
                className="gym-gradient text-white"
                data-testid="button-back-to-login"
              >
                Kembali ke Login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
