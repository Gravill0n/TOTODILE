import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type { ReactNode } from "react";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
} from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ZoomableImageProps = {
  src: string;
  alt: string;
  caption?: string | undefined;
  credit?: string | undefined;
  // Extra classes for the inline image (the tap target).
  className?: string | undefined;
  // Absolutely-positioned markers (map pins) laid over the image. Rendered
  // twice — inline and inside the zoom layer — so fractional-coordinate pins
  // stay aligned at every zoom level (#2).
  overlay?: ReactNode;
};

// Build 3 (#2): tap an image to open a zoomable lightbox — pinch (touch),
// wheel (desktop) and double-tap zoom plus drag-pan come from
// react-zoom-pan-pinch; the explicit buttons cover discoverability. Fully
// offline: the lightbox shows the same local asset as the inline image.
export function ZoomableImage({
  src,
  alt,
  caption,
  credit,
  className,
  overlay,
}: ZoomableImageProps) {
  return (
    <Dialog>
      <div className="relative">
        <DialogTrigger asChild>
          <button
            type="button"
            className="block w-full cursor-zoom-in"
            aria-label={`Zoom: ${alt}`}
          >
            <img src={src} alt={alt} className={cn("w-full", className)} />
          </button>
        </DialogTrigger>
        {overlay}
      </div>
      <DialogContent className="max-w-[calc(100%-1rem)] gap-2 p-2 pt-10 sm:max-w-4xl">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <TransformWrapper doubleClick={{ mode: "toggle" }}>
          <ZoomControls />
          <TransformComponent
            wrapperClass="!w-full max-h-[75vh] rounded"
            contentClass="relative"
          >
            <img src={src} alt={alt} className="w-full" />
            {overlay}
          </TransformComponent>
        </TransformWrapper>
        {caption || credit ? (
          <p className="px-2 pb-1 text-xs text-ink-soft">
            {caption ? <span>{caption}</span> : null}
            {caption && credit ? " — " : null}
            {credit ? <span className="italic">{credit}</span> : null}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// Must live inside TransformWrapper to reach its context. Animation time 0:
// instant response reads better on repeated taps (and keeps tests sync).
function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute top-2 left-2 z-10 flex gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Zoom out"
        onClick={() => zoomOut(0.4, 0)}
      >
        <ZoomOut />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Zoom in"
        onClick={() => zoomIn(0.4, 0)}
      >
        <ZoomIn />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Reset zoom"
        onClick={() => resetTransform(0)}
      >
        <RotateCcw />
      </Button>
    </div>
  );
}
