import { z } from "zod";
import { localId, schemaVersion } from "./common.ts";
import { widgetType } from "./widgets.ts";

export const deckSlot = z.object({
  primitive: widgetType,
  defaultTitle: z.string().min(1),
  // A slot's default scope can't name a chapter — concrete chapter binding
  // happens on the widget instance (§6.3).
  defaultScope: z.enum(["global", "chapter"]),
});

// guides/<slug>/deck.json — genre deck config, reusable across guides (§6.4).
// Slot order in the array is the deck layout order; widget instances point
// back via `deckPosition`.
export const genreDeck = z.object({
  schemaVersion,
  id: localId,
  slots: z.array(deckSlot).min(1),
});

export type DeckSlot = z.infer<typeof deckSlot>;
export type GenreDeck = z.infer<typeof genreDeck>;
