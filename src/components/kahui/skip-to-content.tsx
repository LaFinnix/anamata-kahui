/**
 * Skip-to-content link — accessibility primitive.
 *
 * Hidden by default, revealed on focus. Lets keyboard users jump straight to
 * `<main>` without tabbing through every header link. Per WCAG 2.2 SC 2.4.1.
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        focus:fixed focus:left-4 focus:top-4 focus:z-50
        focus:rounded-md focus:border focus:border-bronze-400
        focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium
        focus:text-foreground focus:shadow
      "
    >
      Skip to main content
    </a>
  );
}
