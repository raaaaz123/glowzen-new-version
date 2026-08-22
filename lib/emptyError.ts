/**
 * "There's nothing here yet" is not a failure. Screens should invite the user
 * to do the missing thing, not show them a red box with a retry button — so
 * these are thrown separately and surfaced separately by useAsync.
 */
export class EmptyError extends Error {
  /** Where the user should go to fill the gap. */
  constructor(
    message: string,
    readonly action?: { label: string; href: string },
  ) {
    super(message);
  }
}
