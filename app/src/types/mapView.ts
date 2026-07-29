// Where a guide's map is left: how far in, and which corner. Shared here
// rather than owned by the progress feature because the spine feature renders
// the panel and features never import each other (PRD §20.1).
//
// The pan is a FRACTION of the scrollable extent, never pixels — the panel is
// a ~320px column on desktop and full width on a phone.
export type MapView = {
  zoom: number;
  panX: number;
  panY: number;
};
