import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, CheckCircle2, RotateCcw, Loader2 } from "lucide-react";

interface CameraSelfieProps {
  onCapture: (imageData: string) => void;
  capturedImage: string | null;
}

export default function CameraSelfie({ onCapture, capturedImage }: CameraSelfieProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      setError("");
      setIsLoading(true);
      setIsVideoReady(false);

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser Anda tidak mendukung akses kamera");
      }

      // Request camera access with mobile-friendly constraints
      const constraints = {
        video: {
          facingMode: "user", // Force front-facing camera
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      setStream(mediaStream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              setIsVideoReady(true);
              setIsLoading(false);
            }).catch((err) => {
              console.error("Error playing video:", err);
              setError("Gagal memulai video kamera");
              setIsLoading(false);
            });
          }
        };
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setIsLoading(false);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Akses kamera ditolak. Mohon izinkan akses kamera untuk melanjutkan.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("Kamera tidak ditemukan di perangkat Anda.");
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError("Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut dan coba lagi.");
      } else {
        setError(err.message || "Tidak dapat mengakses kamera. Pastikan Anda memberikan izin akses kamera.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraActive(false);
      setIsVideoReady(false);
      setIsLoading(false);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && isVideoReady) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      if (ctx && canvas.width > 0 && canvas.height > 0) {
        // Mirror the image horizontally for selfie effect
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        // Convert to base64 with good quality
        const imageData = canvas.toDataURL("image/jpeg", 0.85);
        onCapture(imageData);
        stopCamera();
      } else {
        setError("Gagal mengambil foto. Coba lagi.");
      }
    }
  };

  const retakePhoto = () => {
    onCapture("");
    startCamera();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="relative">
        {!isCameraActive && !capturedImage && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Ambil foto selfie untuk melanjutkan registrasi
            </p>
            <Button
              type="button"
              onClick={startCamera}
              disabled={isLoading}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
              data-testid="button-start-camera"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Membuka Kamera...
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5 mr-2" />
                  Buka Kamera
                </>
              )}
            </Button>
            {error && (
              <p className="text-red-500 text-sm mt-4">{error}</p>
            )}
          </div>
        )}

        {isCameraActive && !capturedImage && (
          <div className="relative">
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: "300px" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
                style={{ maxHeight: "500px" }}
              />
              {!isVideoReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-center text-white">
                    <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin" />
                    <p>Memuat kamera...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-center mt-4">
              <Button
                type="button"
                onClick={capturePhoto}
                disabled={!isVideoReady}
                className="bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-capture-photo"
              >
                <Camera className="h-5 w-5 mr-2" />
                Ambil Foto
              </Button>
              <Button
                type="button"
                onClick={stopCamera}
                variant="outline"
                className="border-gray-300 dark:border-gray-600"
                data-testid="button-cancel-camera"
              >
                <X className="h-5 w-5 mr-2" />
                Batal
              </Button>
            </div>
          </div>
        )}

        {capturedImage && (
          <div className="relative">
            <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img
                src={capturedImage}
                alt="Selfie preview"
                className="w-full h-auto object-contain"
                style={{ maxHeight: "500px" }}
              />
              <div className="absolute top-3 right-3 bg-green-500 text-white rounded-full p-2 shadow-lg">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <div className="flex gap-2 justify-center mt-4">
              <Button
                type="button"
                onClick={retakePhoto}
                variant="outline"
                className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                data-testid="button-retake-photo"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Ambil Ulang
              </Button>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
