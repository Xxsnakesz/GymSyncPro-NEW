import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, CheckCircle2, RotateCcw } from "lucide-react";

interface CameraSelfieProps {
  onCapture: (imageData: string) => void;
  capturedImage: string | null;
}

export default function CameraSelfie({ onCapture, capturedImage }: CameraSelfieProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      setError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user", // Force front-facing camera (selfie mode)
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      });

      setStream(mediaStream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Tidak dapat mengakses kamera. Pastikan Anda memberikan izin akses kamera.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Mirror the image horizontally for selfie effect
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL("image/jpeg", 0.9);
        onCapture(imageData);
        stopCamera();
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
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
              data-testid="button-start-camera"
            >
              <Camera className="h-5 w-5 mr-2" />
              Buka Kamera
            </Button>
            {error && (
              <p className="text-red-500 text-sm mt-4">{error}</p>
            )}
          </div>
        )}

        {isCameraActive && !capturedImage && (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg transform scale-x-[-1]"
              style={{ maxHeight: "400px" }}
            />
            <div className="flex gap-2 justify-center mt-4">
              <Button
                type="button"
                onClick={capturePhoto}
                className="bg-green-500 hover:bg-green-600 text-white"
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
            <img
              src={capturedImage}
              alt="Selfie preview"
              className="w-full rounded-lg"
              style={{ maxHeight: "400px", objectFit: "cover" }}
            />
            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-2">
              <CheckCircle2 className="h-6 w-6" />
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
