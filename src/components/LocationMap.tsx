import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
interface LocationMapProps {
  lat: number;
  lng: number;
  className?: string;
}
export function LocationMap({ lat, lng, className }: LocationMapProps) {
  // Use a small bounding box around the point to center the map
  const src = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}&embed=1`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return (
    <a
      href={googleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("group block relative w-full h-full bg-muted/20 overflow-hidden cursor-pointer", className)}
      title="Open in Google Maps"
    >
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        marginHeight={0}
        marginWidth={0}
        src={src}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-90 mix-blend-multiply dark:mix-blend-screen transition-opacity group-hover:opacity-100"
        title="Location Map"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4 text-center z-10">
        <ExternalLink className="h-8 w-8 mb-2" />
        <span className="text-sm font-medium">Open in Google Maps</span>
      </div>
    </a>
  );
}