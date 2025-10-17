import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, RotateCcw } from "lucide-react";

interface CameraSelfieProps {
  onCapture: (imageData: string) => void;
  capturedImage: string | null;
}

export default function CameraSelfie({ onCapture, capturedImage }: CameraSelfieProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          
          // Set max dimensions
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = height * (MAX_WIDTH / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = width * (MAX_HEIGHT / height);
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress with quality 0.7 (70%)
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(compressedDataUrl);
          } else {
            reject(new Error('Failed to get canvas context'));
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedImage = await compressImage(file);
        onCapture(compressedImage);
      } catch (error) {
        console.error('Error compressing image:', error);
        // Fallback to original
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageData = event.target?.result as string;
          onCapture(imageData);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const retakePhoto = () => {
    onCapture("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (capturedImage) {
    return (
      <div className="space-y-4">
        <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img
            src={capturedImage}
            alt="Selfie preview"
            className="w-full h-auto object-contain mx-auto"
            style={{ maxHeight: "400px" }}
          />
          <div className="absolute top-3 right-3 bg-green-500 text-white rounded-full p-2 shadow-lg">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
        <Button
          type="button"
          onClick={retakePhoto}
          variant="outline"
          className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950"
          data-testid="button-retake-photo"
        >
          <RotateCcw className="h-5 w-5 mr-2" />
          Ambil Ulang Foto
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
        <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Ambil foto selfie untuk melanjutkan registrasi
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
          Pastikan wajah Anda terlihat jelas
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-camera-file"
      />
      
      <Button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white h-12"
        data-testid="button-take-selfie"
      >
        <Camera className="h-5 w-5 mr-2" />
        Ambil Foto Selfie
      </Button>
    </div>
  );
}
