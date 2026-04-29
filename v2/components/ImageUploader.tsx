"use client";

import { useRef, useState } from "react";
import type { UploadedImage } from "@/lib/types";

interface Props {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  disabled?: boolean;
  max?: number;
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ImageUploader({
  images,
  onChange,
  disabled,
  max = 3,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function processFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    const next: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      if (images.length + next.length >= max) break;
      if (!file.type.startsWith("image/")) continue;
      next.push({
        id: makeId(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (next.length > 0) onChange([...images, ...next]);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    processFiles(files);
  }

  function removeImage(id: string) {
    const img = images.find((i) => i.id === id);
    if (img) URL.revokeObjectURL(img.previewUrl);
    onChange(images.filter((i) => i.id !== id));
  }

  const canAddMore = images.length < max && !disabled;

  return (
    <div
      className={`
        relative rounded-3xl overflow-hidden transition-colors
        ${dragOver ? "bg-neutral-700" : "bg-neutral-900"}
        h-52 sm:h-60 md:h-72 lg:h-80
      `}
      onDragOver={(e) => {
        e.preventDefault();
        if (canAddMore) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (canAddMore) processFiles(e.dataTransfer.files);
      }}
    >
      {images.length === 0 ? (
        <label
          className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${
            canAddMore ? "cursor-pointer" : "cursor-not-allowed opacity-40"
          }`}
        >
          <span
            className="font-thin leading-none select-none"
            style={{ fontSize: "5rem", color: "#e53e3e" }}
          >
            +
          </span>
          <span className="text-xs text-neutral-500 hidden sm:inline">
            點擊或拖放圖片至此（最多 {max} 張）
          </span>
          <span className="text-xs text-neutral-500 sm:hidden">
            點擊拍照或選擇圖片
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={!canAddMore}
            onChange={handleInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center gap-3 p-4 flex-wrap">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative h-full"
              style={{ flex: "1 1 0", maxWidth: "12rem", minWidth: "5rem" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt="upload preview"
                className="w-full h-full object-cover rounded-2xl"
              />
              {!disabled && (
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute -top-2 -right-2 bg-black/70 text-white rounded-full w-7 h-7 flex items-center justify-center text-base z-10"
                  aria-label="移除圖片"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {canAddMore && (
            <label className="relative flex-shrink-0 flex items-center justify-center rounded-2xl border-2 border-neutral-700 cursor-pointer w-14 h-14 sm:w-16 sm:h-16">
              <span className="text-2xl text-neutral-400 leading-none">+</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={!canAddMore}
                onChange={handleInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
