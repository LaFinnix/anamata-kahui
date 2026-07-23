import { redirect } from "next/navigation";

/**
 * /research — top-level redirect to /research/about.
 *
 * Reason: the (public)/[locale] route group has no `/research/page.tsx`,
 * and the (dashboard)/research route group is a different page. Without
 * this redirect, `/research` returns 404. Forwarding to the canonical
 * about page lets the sidebar / nav links to `/research` work.
 */
export default function ResearchIndex() {
  redirect("/research/about");
}