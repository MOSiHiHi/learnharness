/**
 * Compaction queries (activeCompactionOf, keptIndexFor).
 *
 * Extracted from compaction.ts to break the native-messages ↔ compaction
 * VALUE cycle: native-messages.ts needs these two helpers inside
 * toLlmMessages, while compaction.ts needs newMessageId from
 * native-messages.ts.
 *
 * Design: this module imports NOTHING from ./native-messages.ts (not even
 * types) — it operates on minimal structural shapes, so the dependency
 * arrow points strictly one way:
 *   native-messages.ts ──value──▶ compaction-queries.ts (leaf)
 *   compaction.ts ──value──▶ compaction-queries.ts (leaf, re-export)
 * Callers keep full static types via generics (inferred at call sites).
 */

/** The compaction marker's details (UI payload — never model-visible;
 * the model sees content, the header + summary). Single source of truth;
 * compaction.ts re-exports it. */
export interface CompactionDetails {
	/** Record id of the first KEPT message: the projection renders the
	 * summary, then everything from this message onward. */
	firstKeptMessageId: string;
	/** The estimated context tokens that triggered this compaction
	 * (provenance for the divider's tooltip/dialog). */
	tokensBefore: number;
	/** provider:id of the model that wrote the summary (the session's
	 * own model — owner ruling; provenance, never a routing input). */
	model?: string;
	/** ISO timestamp of the compaction moment. */
	at: string;
}

/** Minimal structural shape of a record message: enough to find the
 * active compaction marker without depending on native-messages.ts. */
export interface MarkerLike {
	readonly id: string;
	readonly role?: string;
	readonly customType?: string;
	readonly details?: unknown;
}

/** The ACTIVE compaction marker: the newest one with a retained-message
 * id. Its summary supersedes older markers even when their stored
 * positions remain inside its retained tail.
 *
 * The return carries `content: string` + `timestamp: number` because only
 * real compaction markers (built by newCompactionMarker, string content)
 * can satisfy the guard — callers project `active.content` directly. */
export function activeCompactionOf<M extends MarkerLike>(
	messages: readonly M[],
): (M & { details: CompactionDetails; content: string; timestamp: number }) | null {
	for (let i = messages.length - 1; i >= 0; i--) {
		const m = messages[i]!;
		if (m.role !== "custom") continue;
		if (m.customType === "compaction") {
			const details = m.details as Partial<CompactionDetails>;
			if (typeof details.firstKeptMessageId === "string") {
				return m as M & { details: CompactionDetails; content: string; timestamp: number };
			}
		}
	}
	return null;
}

/** The index of the first KEPT message, or -1 when the record's active
 * marker names an id that no longer exists (corrupt/foreign) — callers
 * fall back to rendering everything (honest degradation, never throw). */
export function keptIndexFor<M extends MarkerLike>(
	messages: readonly M[],
	marker: { details: CompactionDetails },
): number {
	const id = marker.details.firstKeptMessageId;
	for (let i = 0; i < messages.length; i++) {
		if (messages[i]!.id === id) return i;
	}
	return -1;
}
