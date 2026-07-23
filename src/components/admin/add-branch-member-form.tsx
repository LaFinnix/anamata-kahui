"use client";

import { useActionState, useState } from "react";
import { UserPlus, Loader2, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addBranchMemberAction,
  type BranchMemberState,
} from "@/lib/actions/branch-member";

interface Props {
  branchId: string;
  branchName: string;
  availableProfiles: { id: string; label: string }[];
}

const initialState: BranchMemberState = {};

/**
 * <AddBranchMemberForm/> — adds a profile to a branch.
 *
 * Renders only the profiles that aren't already in the branch. The
 * server action validates the actor's role (super_admin or lead/admin
 * in this branch) before inserting.
 */
export function AddBranchMemberForm({
  branchId,
  branchName,
  availableProfiles,
}: Props) {
  const [state, formAction, pending] = useActionState(
    addBranchMemberAction,
    initialState,
  );

  if (availableProfiles.length === 0) {
    return (
      <p className="text-xs italic text-muted-foreground">
        Every profile is already a member of {branchName}.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="branch_id" value={branchId} />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,180px,auto]">
        <label className="sr-only" htmlFor="add-profile">
          Profile
        </label>
        <div className="relative">
          <select
            id="add-profile"
            name="profile_id"
            required
            defaultValue=""
            className="flex h-9 w-full appearance-none rounded-md border border-border bg-input px-3 pr-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" disabled>
              Choose a profile…
            </option>
            {availableProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        </div>

        <label className="sr-only" htmlFor="add-role">
          Branch role
        </label>
        <div className="relative">
          <select
            id="add-role"
            name="branch_role"
            required
            defaultValue="member"
            className="flex h-9 w-full appearance-none rounded-md border border-border bg-input px-3 pr-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="lead">Lead</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="guest">Guest</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        </div>

        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Add
        </Button>
      </div>

      {state.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
      {state.success && (
        <p className="text-xs text-pounamu-300">{state.success}</p>
      )}
    </form>
  );
}