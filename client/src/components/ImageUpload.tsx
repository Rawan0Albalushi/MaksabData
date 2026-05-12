import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useI18n } from "@/lib/i18n";
import { Camera, Upload, X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type ImageUploadFolder = "profiles" | "stores" | "products" | "mandoubs" | "employees" | "general";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onUploadComplete: (url: string) => void;
  folder: ImageUploadFolder;
  /** Shape of the preview */
  shape?: "circle" | "square" | "rectangle";
  /** Size class for the preview container */
  size?: "sm" | "md" | "lg";
  /** Label shown above the upload area */
  label?: string;
  /** Whether to show the URL input fallback */
  showUrlFallback?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Optional class name */
  className?: string;
}

const SIZE_CLASSES = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
};

export function ImageUpload({
  currentImageUrl,
  onUploadComplete,
  folder,
  shape = "square",
  size = "md",
  label,
  showUrlFallback = true,
  disabled = false,
  className = "",
}: ImageUploadProps) {
  const { t, dir } = useI18n();
  const isRtl = dir === "rtl";
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.upload.image.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    // Client-side validation
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError(isRtl ? "صيغة غير مدعومة. يرجى استخدام JPG, PNG, أو WebP" : "Unsupported format. Use JPG, PNG, or WebP");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError(isRtl ? "حجم الملف كبير جداً. الحد الأقصى 25 ميجابايت" : "File too large. Maximum 25MB");
      return;
    }

    // Read as base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      setPreview(base64Data);
      setUploading(true);

      try {
        const result = await uploadMutation.mutateAsync({
          fileName: file.name,
          base64Data,
          folder,
        });
        setPreview(result.url);
        onUploadComplete(result.url);
        toast.success(isRtl ? "تم رفع الصورة بنجاح" : "Image uploaded successfully");
      } catch (err: any) {
        setError(err.message || (isRtl ? "فشل رفع الصورة" : "Upload failed"));
        setPreview(currentImageUrl || null);
        toast.error(isRtl ? "فشل رفع الصورة" : "Image upload failed");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUrlSubmit = () => {
    if (!urlValue.trim()) return;
    setPreview(urlValue.trim());
    onUploadComplete(urlValue.trim());
    setShowUrlInput(false);
    setUrlValue("");
    toast.success(isRtl ? "تم تحديث رابط الصورة" : "Image URL updated");
  };

  const handleRemove = () => {
    setPreview(null);
    onUploadComplete("");
    setError(null);
  };

  const shapeClass = shape === "circle" ? "rounded-full" : shape === "rectangle" ? "rounded-lg aspect-video" : "rounded-lg";
  const sizeClass = shape === "rectangle" ? "w-full max-w-xs h-auto" : SIZE_CLASSES[size];

  return (
    <div className={`flex flex-col gap-2 ${className}`} dir={dir}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}

      <div className="flex items-center gap-3">
        {/* Preview area */}
        <div className={`relative ${sizeClass} ${shapeClass} border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted/30`}>
          {preview ? (
            <>
              <img
                src={preview}
                alt="Preview"
                className={`w-full h-full object-cover ${shapeClass}`}
                onError={() => setPreview(null)}
              />
              {!disabled && (
                <button
                  onClick={handleRemove}
                  className="absolute top-0.5 end-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/80 transition-colors"
                  type="button"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </>
          ) : (
            <Camera className="w-6 h-6 text-muted-foreground/50" />
          )}

          {uploading && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Upload buttons */}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <Upload className="w-3.5 h-3.5" />
            {isRtl ? "رفع صورة" : "Upload"}
          </button>

          {showUrlFallback && (
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              disabled={disabled || uploading}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {isRtl ? "أو أدخل رابط" : "or paste URL"}
            </button>
          )}
        </div>
      </div>

      {/* URL input fallback */}
      {showUrlInput && (
        <div className="flex gap-2 mt-1">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder={isRtl ? "https://example.com/image.png" : "https://example.com/image.png"}
            className="flex-1 px-2 py-1 text-xs border border-input rounded-md bg-background"
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            {isRtl ? "تأكيد" : "Set"}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
