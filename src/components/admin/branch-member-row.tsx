"use client";

import { useActionState, useTransition } from "react";
import { Shield, Trash2, Loader2, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  updateBranchMemberRoleAction,
  removeBranchMemberAction,
  type BranchMemberState,
} from "@/lib/actions/branch-member";

interface Props {
  membershipId: string;
  fullName: string | null;
  email: string | null;
  platformRole: string;
  branchRole: string;
  canManage: boolean;
}

/**
 * <BranchMemberRow/> — one row in the branch member list.
 *
 * Shows the member's identity + both their platform role and per-branch
 * role. If canManage, exposes a role-change select and a remove button.
 */
export function BranchMemberRow({
  membershipId,
  fullName,
  email,
  platformRole,
  branchRole,
  canManage,
}: Props) {
  const [updateState, updateAction, updating] = useActionState(
    updateBranchMemberRoleAction,
    {} as BranchMemberState,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeBranchMemberAction,
    {} as BranchMemberState,
  );
  const [, startTransition] = useTransition();

  const name = fullName ?? email ?? "Unknown";

  function onRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData();
    fd.set("membership_id", membershipId);
    fd.set("branch_role", e.target.value);
    startTransition(async () => {
      await updateAction(fd);
    });
  }

  function onRemove() {
    if (!confirm(`Remove ${name} from this branch?`)) return;
    const fd = new FormData();
    fd.set("membership_id", membershipId);
    startTransition(async () => {
      await removeAction(fd);
    });
  }

  return (
    <div className="rounded-md border border-border bg-card/50 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="truncate font-medium">{name}</p>
          {email && (
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          )}
        </div>
        <Badge variant="outline" className="capitalize">
          {platformRole.replace("_", " ")}
        </Badge>

        {canManage ? (
          <div className="relative">
            <select
              aria-label="Per-branch role"
              defaultValue={branchRole}
              onChange={onRoleChange}
              disabled={updating}
              className="h-8 appearance-none rounded-md border border-border bg-input pl-2 pr-7 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="lead">Lead</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="guest">Guest</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          </div>
        ) : (
          <Badge variant="secondary" className="capitalize">
            {branchRole}
          </Badge>
        )}

        {canManage && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={removing}
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Remove ${name} from branch`}
          >
            {removing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>

      {updateState?.error && (
        <p className="mt-1 text-xs text-destructive">{updateState.error}</p>
      )}
      {updateState?.success && (
        <p className="mt-1 text-xs text-pounamu-300">{updateState.success}</p>
      )}
      {removeState?.error && (
        <p className="mt-1 text-xs text-destructive">{removeState.error}</p>
      )}
      {removeState?.success && (
        <p className="mt-1 text-xs text-pounamu-300">{removeState.success}</p>
      )}
    </div>
  );
}