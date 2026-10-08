import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";

export function AvatarWithBadge() {
  return (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>CN</AvatarFallback>
      <AvatarBadge className="bg-green-600 dark:bg-green-800" />
    </Avatar>
  );
}

export default AvatarWithBadge;
