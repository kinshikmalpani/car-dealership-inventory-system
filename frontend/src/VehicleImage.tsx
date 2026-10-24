import { useState } from "react";
export function VehicleImage({
  image,
  name,
  className = "",
}: {
  image?: string;
  name: string;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState("");
  return image && failedUrl !== image ? (
    <img
      className={`model-photo ${className}`}
      src={image}
      alt={name}
      loading="lazy"
      onError={() => setFailedUrl(image)}
    />
  ) : (
    <div
      className={`photo-fallback ${className}`}
      role="img"
      aria-label={`${name}: photograph unavailable`}
    >
      <span aria-hidden="true">▧</span>
      <strong>{name}</strong>
      <small>Photograph coming soon</small>
    </div>
  );
}
