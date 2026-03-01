"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  Link as LinkIcon,
  X,
  FileVideo,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";
import Cropper, { Area } from "react-easy-crop";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
const APP_ASSET_PROXY = "/api/assets";

const getYoutubeEmbedUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (!["youtube.com", "youtu.be", "m.youtube.com"].some((h) => host.includes(h))) {
      return null;
    }

    // Short link format: youtu.be/<id>
    if (host.includes("youtu.be")) {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    // Standard watch URL with ?v=
    const idFromQuery = parsed.searchParams.get("v");
    if (idFromQuery) {
      return `https://www.youtube.com/embed/${idFromQuery}`;
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    // /shorts/<id> or /embed/<id>
    if ((parts[0] === "shorts" || parts[0] === "embed") && parts[1]) {
      return `https://www.youtube.com/embed/${parts[1]}`;
    }

    return null;
  } catch {
    return null;
  }
};

const getVimeoEmbedUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("vimeo.com")) return null;
    const id = parsed.pathname.split("/").filter(Boolean).pop();
    return id ? `https://player.vimeo.com/video/${id}` : null;
  } catch {
    return null;
  }
};

const isDirectVideoFile = (url: string): boolean =>
  /\.(mp4|webm|ogg|m3u8)(\?.*)?$/i.test(url);

const looksLikeUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

const normalizeDirectusAssetUrl = (value: string): string => {
  if (!value) return "";
  const match =
    value.match(/\/assets\/([0-9a-f-]{36})/i) ||
    value.match(/\/api\/assets\/([0-9a-f-]{36})/i);
  const id = match?.[1] || (looksLikeUuid(value) ? value : null);

  if (id) {
    // Route through our proxy to avoid Directus auth/CORS issues
    return `${APP_ASSET_PROXY}/${id}`;
  }

  // Already an asset path; ensure it's absolute
  if (value.includes("/assets/")) {
    if (value.startsWith("http")) return value;
    return `${DIRECTUS_URL}${value.startsWith("/") ? "" : "/"}${value}`;
  }

  if (looksLikeUuid(value)) {
    return `${APP_ASSET_PROXY}/${value}`;
  }

  return value;
};

interface MediaUploaderProps {
  value: string;
  onChange: (value: string) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  placeholder?: string;
  className?: string;
  type?: "video" | "image";
}

export function MediaUploader({
  value,
  onChange,
  accept = "video/*",
  maxSizeMB = 500,
  label = "Video",
  placeholder = "https://youtube.com/watch?v=...",
  className,
  type = "video",
  disableUrlInput = false,
}: MediaUploaderProps & { disableUrlInput?: boolean }) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState<string>("image.png");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);

  const isExternalUrl =
    value &&
    (value.startsWith("http://") || value.startsWith("https://")) &&
    !value.includes("/assets/") &&
    !value.includes("/api/assets/") &&
    !looksLikeUuid(value);

  const isDirectusAsset =
    !!value &&
    (value.includes("/assets/") ||
      value.includes("/api/assets/") ||
      looksLikeUuid(value));

  const previewUrl = isDirectusAsset ? normalizeDirectusAssetUrl(value) : value;

  const youtubeEmbedUrl =
    !disableUrlInput && isExternalUrl ? getYoutubeEmbedUrl(previewUrl) : null;
  const vimeoEmbedUrl =
    !disableUrlInput && isExternalUrl ? getVimeoEmbedUrl(previewUrl) : null;
  const showExternalVideoFile =
    !disableUrlInput &&
    isExternalUrl &&
    type === "video" &&
    isDirectVideoFile(previewUrl) &&
    !youtubeEmbedUrl &&
    !vimeoEmbedUrl;

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const getCroppedFile = async (): Promise<File | null> => {
    if (!cropSrc || !croppedAreaPixels) return null;
    const image = await loadImage(cropSrc);
    const canvas = document.createElement("canvas");
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Không thể xử lý ảnh"));
          const file = new File(
            [blob],
            cropFileName ? `cropped-${cropFileName}` : "cropped-image.png",
            { type: blob.type }
          );
          resolve(file);
        },
        "image/png",
        0.95
      );
    });
  };

  const handleFileUpload = async (file: File) => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`Tệp quá lớn. Kích thước tối đa: ${maxSizeMB}MB`);
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress since fetch doesn't support progress natively
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const res = await apiFetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        throw new Error("Tải lên thất bại");
      }

      const data = await res.json();
      const fileId = data.data?.id;
      if (!fileId) throw new Error("Không nhận được ID tệp");

      const assetUrl = `${APP_ASSET_PROXY}/${fileId}`;

      setProgress(100);
      setUploadedFileName(file.name);
      onChange(assetUrl);
      toast.success("Tải lên thành công!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tải lên thất bại");
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleCropConfirm = async () => {
    try {
      const file = await getCroppedFile();
      if (!file) throw new Error("Không thể crop ảnh");
      await handleFileUpload(file);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể xử lý ảnh đã crop"
      );
    } finally {
      setIsCropOpen(false);
      setCropSrc(null);
      setCroppedAreaPixels(null);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (type === "image") {
      const src = URL.createObjectURL(file);
      setCropSrc(src);
      setCropFileName(file.name || "image.png");
      setIsCropOpen(true);
    } else {
      handleFileUpload(file);
    }
  };

  const handleClear = () => {
    onChange("");
    setUploadedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <Tabs defaultValue={isExternalUrl && !disableUrlInput ? "url" : "upload"}>
        {!disableUrlInput && (
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1">
              <Upload className="size-3.5 mr-1.5" />
              Tải lên
            </TabsTrigger>
            <TabsTrigger value="url" className="flex-1">
              <LinkIcon className="size-3.5 mr-1.5" />
              URL bên ngoài
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="upload" className={cn(!disableUrlInput && "mt-3")}>
          {isUploading ? (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">
                Đang tải lên... {progress}%
              </p>
            </div>
          ) : isDirectusAsset || uploadedFileName ? (
            <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
              <CheckCircle2 className="size-5 text-green-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {uploadedFileName || "Tệp đã tải lên"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {previewUrl || value}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                Đổi
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={handleClear}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-6 cursor-pointer hover:border-primary/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              {type === "image" ? (
                <ImageIcon className="size-8 text-muted-foreground" />
              ) : (
                <FileVideo className="size-8 text-muted-foreground" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium">
                  Kéo thả tệp hoặc nhấn để chọn
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tối đa {maxSizeMB}MB
                </p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (type === "image") {
                const src = URL.createObjectURL(file);
                setCropSrc(src);
                setCropFileName(file.name || "image.png");
                setIsCropOpen(true);
              } else {
                handleFileUpload(file);
              }
            }}
          />
        </TabsContent>

        {!disableUrlInput && (
          <TabsContent value="url" className="mt-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder={placeholder}
                value={isExternalUrl ? previewUrl : ""}
                onChange={(e) => {
                  onChange(e.target.value);
                  setUploadedFileName(null);
                }}
              />
              {previewUrl && isExternalUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={handleClear}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Hỗ trợ YouTube, Vimeo hoặc URL video trực tiếp
            </p>
          </TabsContent>
        )}
      </Tabs>

      {/* Preview */}
      {previewUrl && (
        <div className="mt-2">
          {youtubeEmbedUrl ? (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <iframe
                src={youtubeEmbedUrl}
                className="absolute inset-0 size-full"
                allowFullScreen
                title="Video preview"
              />
            </div>
          ) : vimeoEmbedUrl ? (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <iframe
                src={vimeoEmbedUrl}
                className="absolute inset-0 size-full"
                allowFullScreen
                title="Video preview"
              />
            </div>
          ) : showExternalVideoFile ? (
            <video
              src={previewUrl}
              controls
              className="w-full rounded-lg max-h-[300px]"
            />
          ) : isDirectusAsset && type === "video" ? (
            <video
              src={previewUrl}
              controls
              className="w-full rounded-lg max-h-[300px]"
            />
          ) : isDirectusAsset || (type === "image" && value) ? (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview"
                className="object-cover w-full h-full"
              />
            </div>
          ) : null}
        </div>
      )}

      {type === "image" && (
        <Dialog open={isCropOpen} onOpenChange={setIsCropOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Crop ảnh trước khi lưu</DialogTitle>
            </DialogHeader>
            <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden">
              {cropSrc && (
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={16 / 9}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, areaPixels) =>
                    setCroppedAreaPixels(areaPixels)
                  }
                  objectFit="horizontal-cover"
                  cropShape="rect"
                  showGrid
                />
              )}
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground w-20">
                Zoom
              </Label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-12 text-right">
                {zoom.toFixed(1)}x
              </span>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCropOpen(false);
                  setCropSrc(null);
                  setCroppedAreaPixels(null);
                  setZoom(1);
                  setCrop({ x: 0, y: 0 });
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Hủy
              </Button>
              <Button onClick={handleCropConfirm}>Lưu</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
