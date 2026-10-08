import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu";
import { PencilIcon, ShareIcon, TrashIcon } from "lucide-react";

export function ContextMenuDestructive() {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex aspect-video w-full max-w-xs items-center justify-center rounded-xl border border-dashed text-sm">
        <span className="pointer-fine:inline-block hidden">
          Right click here
        </span>
        <span className="pointer-coarse:inline-block hidden">
          Long press here
        </span>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem>
            <PencilIcon />
            Edit
          </ContextMenuItem>
          <ContextMenuItem>
            <ShareIcon />
            Share
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem variant="destructive">
            <TrashIcon />
            Delete
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default ContextMenuDestructive;
