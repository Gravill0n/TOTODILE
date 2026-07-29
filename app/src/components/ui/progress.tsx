"use client";

import { Progress as ProgressPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      // Upstream destructures `value` for the transform and never hands it back
      // to the root, so every bar announces as indeterminate. Completion is the
      // number this app is about — pass it through.
      value={value}
      // Paper-fitted: upstream tracks the bar on a 20% tint of the fill, which
      // in this palette is a washed-out achievement orange. Every bar in the
      // prototypes runs on paper-dim (`--color-paper-dim`) under an accent
      // fill, so the track is a surface and only the fill carries the colour.
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-paper-dim",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
