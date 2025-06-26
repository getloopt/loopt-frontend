"use client"

import { Button } from "@/components/ui/ui/button"
import { Input } from "@/components/ui/ui/input"
import { useImageUpload } from "@/hooks/use-image-upload"
import { ImagePlus, X, Upload, Trash2, LogOut } from "lucide-react"
import Image from "next/image"
import { useCallback, useState } from "react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore"
import { db } from "../../firebase-config"
import { collection, } from "firebase/firestore";
import { toast } from "sonner";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from "@/components/ui/ui/alert-dialog"
import { WandSparkles } from "lucide-react"
import { GradientButton } from "./ui/gradient-button"
import { useRouter } from 'next/router'




export function ImageUploadDemo() {
  const {
    previewUrl,
    fileName,
    fileInputRef,
    uploadedFile,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  } = useImageUpload({
    onUpload: (url, file) => {
      console.log("Selected file:", file.name);
    },
  })


  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [publicImageUrl, setPublicImageUrl] = useState<string | null>(null);
  const router = useRouter();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleMistralBackend = async (publicUrl: string, email: string | null | undefined) => {
    if (!publicUrl) {
      toast.error("Error: No image URL to process.");
      return;
    }
    if (!email) {
        toast.error("Error: User not logged in.");
        return;
    }
    try {
      const response = await fetch('/api/mistralbackend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: publicUrl, email: email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server response:', errorData);
        throw new Error(errorData.message || 'Failed to process timetable from image.');
      }

      const data = await response.json();
      console.log("Timetable data received:", data);
      router.push('/editTimetable');

    } catch (error) {
      console.error("Error calling mistral backend:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast.error("Error processing timetable", {
        description: `${errorMessage}. Please check console for more details.`,
      });
    }
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }


  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const file = e.dataTransfer.files?.[0]
      if (file && file.type.startsWith("image/")) {
        const fakeEvent = {
          target: {
            files: [file],
          },
        } as unknown as React.ChangeEvent<HTMLInputElement>
        handleFileChange(fakeEvent)
      }
    },
    [handleFileChange],
  )

  

  const handleSubmit = async () => {
    if (!uploadedFile || !user?.email) {
      alert("No file selected or you are not logged in.");
      return;
    }

    setIsUploading(true);
    toast.promise(
        new Promise((resolve) => setTimeout(resolve, 2000)),
        {
          loading: "Loading...",
          success: "Success!",
          error: "Promise rejected",
        }
      )


    try {
      // 1. Get pre-signed URL from our API route
      const presignResponse = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadedFile.name,
          contentType: uploadedFile.type,
        }),
      });

      console.log(presignResponse)

      if (!presignResponse.ok) {
        const errorData = await presignResponse.json();
        throw new Error(errorData.message || 'Failed to get pre-signed URL.');
      }

      const { uploadUrl, publicUrl } = await presignResponse.json();

      setPublicImageUrl(publicUrl);

      // 2. Upload file to R2 using the pre-signed URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: uploadedFile,
        headers: { 'Content-Type': uploadedFile.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to R2.');
      }

      console.log(publicUrl)

      // 3. Update user's document in Firestore
      // First, we need to find the document ID for the logged-in user
      const usersCollection = collection(db, "users");
      const q = query(usersCollection, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("User document not found in Firestore. Cannot save timetable URL.");
      }

      // Get the actual document reference from the query result
      const userDocRef = querySnapshot.docs[0].ref;

      // Now, update the found document
      await updateDoc(userDocRef, {
        "image-timetable": publicUrl,
      }).then(() => {
        setIsOpen(true)
        
      }).catch((error) => {
        console.error("Error updating user document:", error);
        toast.error("Error!", {
          description: `Something went wrong, ${error.message} `,
        })
      })

      handleRemove(); // Clear the form

    } catch (error) {
      console.error("Upload failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast.error("Error!", {
        description: `Something went wrong, ${errorMessage} `,
      })
    } finally {
      setIsUploading(false);
    }
  };


  


  return (
    <div>
            <div className="flex justify-end items-center py-2 mb-2.5 absolute top-0 -right-10 xl:-right-140 md:-right-70 sm:-right-20 lg:-right-100">
            <Button
              className=" button-logout border-white/20 border-1 font-proxima-nova"
              onClick={logout}
            >
              Logout
            </Button>
            </div>
    <div className="flex flex-col items-center justify-center w-90vw h-90vh ">
           {/* Add the AlertDialog here */}
           <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent className="bg-zinc-900 border-white/20 sm:max-w-[425px] max-w-[85%] w-full">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-proxima-nova border-b border-white/20 pb-5">Do you want to auto generate your timetable?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row-reverse sm:gap-30 gap-5">
            <AlertDialogAction>
                  <GradientButton variant="variant" className="!w-full mt-5" onClick={() => handleMistralBackend(publicImageUrl || "", user?.email || "")}>
            
                Yes
                <WandSparkles className="w-4 h-4 ml-2" />
               </GradientButton>
            </AlertDialogAction>
            <AlertDialogCancel className="bg-zinc-800 text-white !border-white/20 hover:bg-zinc-700 hover:text-white font-proxima-nova sm:w-[110px] sm:h-[50px] sm:translate-y-1 w-full mt-5">
              No
            </AlertDialogCancel>

          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
     
        
    <div className="w-[25rem] sm:w-[30rem] space-y-6 rounded-xl border border-border bg-[#141415] p-6 shadow-sm xl:translate-x-80 lg:translate-x-30 md:-translate-x-20 ">
      <div className="space-y-2">
        <h3 className="text-lg font-medium sm:text-xl">Image Upload</h3>
        <p className="text-sm text-muted-foreground sm:text-lg">
          Supported formats: JPG, PNG
        </p>
      </div>

      <Input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {!previewUrl ? (
        <div
          onClick={handleThumbnailClick}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex h-64 cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-none transition-colors hover:bg-white/10 ",
            isDragging && "border-primary/50 bg-primary/5",
          )}
        >
          <div className="rounded-full bg-background p-3 shadow-sm">
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium sm:text-lg">Click to select</p>
            <p className="text-xs text-muted-foreground sm:text-md">
              or drag and drop file here
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="group relative h-64 overflow-hidden rounded-lg border">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleThumbnailClick}
                className="h-9 w-9 p-0"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRemove}
                className="h-9 w-9 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {fileName && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="truncate">{fileName}</span>
              <button
                onClick={handleRemove}
                className="ml-auto rounded-full p-1 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {previewUrl && (
        <div className="mt-4">
          <Button 
            onClick={handleSubmit}
            disabled={isUploading}
            className="w-full button-normal flex items-center gap-2 justify-center"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? "Uploading..." : "Upload Image"}
          </Button>
        </div>
      )}
    </div>
    </div>
    </div>
  )

  
}


