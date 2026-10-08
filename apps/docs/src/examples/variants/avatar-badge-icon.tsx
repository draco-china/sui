import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { PlusIcon } from "lucide-react";

export function AvatarBadgeIconExample() {
  return (
    <Avatar className="grayscale">
      <AvatarImage src="https://github.com/pranathip.png" alt="@pranathip" />
      <AvatarFallback>PP</AvatarFallback>
      <AvatarBadge>
        <PlusIcon />
      </AvatarBadge>
    </Avatar>
  );
}

export default AvatarBadgeIconExample;
