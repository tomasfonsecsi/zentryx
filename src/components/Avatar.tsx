"use client";

import { useRef } from "react";

interface AvatarProps {
  address: string;
  size?: number;
  ensAvatar?: string | null;
  uploadedImage?: string | null;
  onUpload?: (dataUrl: string) => void;
}

export function Avatar({ address, size = 96, ensAvatar, uploadedImage, onUpload }: AvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayImage = uploadedImage || ensAvatar;
  const handleClick = () => { if (onUpload) inputRef.current?.click(); };
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    const reader = new FileReader();
    reader.onloadend = () => { if (typeof reader.result === "string") onUpload(reader.result); };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={onUpload ? "cursor-pointer group" : ""}
      onClick={handleClick}
      style={{ width: size, height: size, position: "relative", flexShrink: 0 }}
    >
      {/* Gradient ring */}
      <div
        className="rounded-full"
        style={{
          width: size, height: size, padding: 2,
          background: displayImage
            ? "linear-gradient(135deg, #1a5fb4, #3b9eff)"
            : "linear-gradient(135deg, rgba(30,50,80,0.6), rgba(15,25,45,0.6))",
          boxShadow: displayImage ? "0 0 24px rgba(59,158,255,0.15)" : "none",
        }}
      >
        {/* Inner circle — fixed size, overflow hidden */}
        <div
          className="rounded-full overflow-hidden"
          style={{
            width: size - 4, height: size - 4,
            background: "rgba(4,8,18,0.95)",
          }}
        >
          {displayImage ? (
            <img
              src={displayImage} alt="Avatar"
              style={{ width: size - 4, height: size - 4, objectFit: "cover", display: "block" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width={size * 0.22} height={size * 0.22} viewBox="0 0 24 24" fill="none"
                stroke="rgba(59,158,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Hover overlay */}
      {onUpload && (
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
      )}

      {/* Edit badge — bottom-right */}
      {onUpload && (
        <div
          className="absolute flex items-center justify-center rounded-full"
          style={{
            width: 26, height: 26, right: 0, bottom: 0,
            background: "linear-gradient(135deg, #1a6fd4, #3b9eff)",
            border: "2px solid rgba(4,8,18,0.95)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </div>
      )}

      {onUpload && <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />}
    </div>
  );
}
