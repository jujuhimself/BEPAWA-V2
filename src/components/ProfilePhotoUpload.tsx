import { useState, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string | null;
  userId?: string;
  onPhotoUploaded: (url: string) => void;
  onFileSelected?: (file: File) => void;
  /** If true, stores to a temp preview (for registration before user exists) */
  previewOnly?: boolean;
  label?: string;
  required?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
};

export default function ProfilePhotoUpload({
  currentPhotoUrl,
  userId,
  onPhotoUploaded,
  onFileSelected,
  previewOnly = false,
  label = "Profile Photo",
  required = false,
  size = "lg",
}: ProfilePhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image under 5MB.", variant: "destructive" });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    if (previewOnly) {
      setSelectedFile(file);
      onFileSelected?.(file);
      onPhotoUploaded(URL.createObjectURL(file));
      return;
    }

    // Upload immediately if userId is available
    if (userId) {
      await uploadFile(file, userId);
    }
  };

  const uploadFile = async (file: File, uid: string) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${uid}/profile.${ext}`;

      // Remove old file if exists
      await supabase.storage.from("profile-photos").remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
      await supabase
        .from("profiles")
        .update({ profile_photo_url: publicUrl } as any)
        .eq("id", uid);

      setPreview(publicUrl);
      onPhotoUploaded(publicUrl);
      toast({ title: "Photo updated", description: "Your profile photo has been updated." });
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({ title: "Upload failed", description: err.message || "Could not upload photo.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  /** Called externally after registration to do the actual upload */
  const uploadPending = async (uid: string) => {
    if (selectedFile) {
      await uploadFile(selectedFile, uid);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="flex items-center gap-4">
        <Avatar className={sizeClasses[size]}>
          {preview ? (
            <AvatarImage src={preview} alt="Profile photo" className="object-cover" />
          ) : (
            <AvatarFallback className="bg-muted text-muted-foreground">
              <Camera className="h-8 w-8" />
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : preview ? "Change Photo" : "Upload Photo"}
          </Button>
          {preview && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
              <X className="h-4 w-4 mr-2" /> Remove
            </Button>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
