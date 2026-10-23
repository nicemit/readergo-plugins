/**
 * Contribution Places
 *
 * Hosts declare named UI places. Plugins contribute items filtered by
 * surface capabilities and simple when-context equality.
 */

/** Well-known place ids. Open string for future places. */
export const WellKnownPlaces = {
  EDITOR_SELECTION_MENU: 'editor/selection-menu',
} as const;

export type WellKnownPlace =
  (typeof WellKnownPlaces)[keyof typeof WellKnownPlaces];

export type PlaceId = WellKnownPlace | (string & {});

/**
 * What an editor / surface advertises about itself.
 * Contributions match when every required capability is present.
 */
export type SurfaceCapability =
  | 'text-range'
  | 'rich-text'
  | 'plain-text'
  | 'node-selection'
  | 'cell-selection'
  | 'spatial'
  | 'tabular'
  | (string & {});

/** Simple equality predicates against a host-provided context bag. */
export type ContributionWhen = Record<string, string | number | boolean>;

export interface PlaceContribution {
  /** Globally unique contribution id */
  id: string;
  /** Target place (e.g. editor/selection-menu) */
  place: PlaceId;
  /** Button / item label */
  title: string;
  icon?: string;
  /** Lower sorts first. Default 100. */
  order?: number;
  /** Surface capabilities this contribution needs */
  requires?: SurfaceCapability[];
  /** Host context must match these key/value pairs */
  when?: ContributionWhen;
  /** Invoked by the host via executeCommand */
  commandId?: string;
  /** Optional display / payload hints */
  schema?: Record<string, unknown>;
}

export interface ContributionSurface {
  editorType?: string;
  capabilities: SurfaceCapability[];
}

export interface ResolveContributionsQuery {
  place: PlaceId;
  surface: ContributionSurface;
  context?: Record<string, string | number | boolean>;
}

export interface ResolvedPlaceContribution extends PlaceContribution {
  pluginId: string;
}

/**
 * Pure resolve helper: filter + sort contributions for a place.
 */
export function resolveContributions(
  all: readonly ResolvedPlaceContribution[],
  query: ResolveContributionsQuery,
): ResolvedPlaceContribution[] {
  const caps = new Set(query.surface.capabilities);
  const ctx = query.context || {};

  const matched = all.filter((c) => {
    if (c.place !== query.place) return false;

    if (c.requires && c.requires.length > 0) {
      for (const req of c.requires) {
        if (!caps.has(req)) return false;
      }
    }

    if (c.when) {
      for (const [key, expected] of Object.entries(c.when)) {
        if (ctx[key] !== expected) return false;
      }
    }

    return true;
  });

  return matched.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}
