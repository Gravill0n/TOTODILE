import { z } from "zod";
import { localId, schemaVersion } from "./common.ts";
import { widgetType } from "./widgets.ts";

export const deckSlot = z.object({
  primitive: widgetType,
  defaultTitle: z.string().min(1),
  // A slot's default scope names the *kind* only — the concrete chapter /
  // location / visit binding happens on the widget instance (§6.3). "location"
  // joins the set in Workstream A so encounter-table-style slots default to a
  // place across all its visits.
  defaultScope: z.enum(["global", "chapter", "location"]),
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
