import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useInitials } from "@/hooks/use-initials";
import { type User } from "@/services/api";

export function UserInfo({
  user,
  showEmail = false,
}: {
  user?: User | null;
  showEmail?: boolean;
}) {
  const getInitials = useInitials();

  if (!user) {
    return (
      <>
        <Avatar className="h-8 w-8 overflow-hidden rounded-full">
          <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
            INV
          </AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left ml-2 text-sm leading-tight">
          <span className="truncate font-medium">Invitado</span>
        </div>
      </>
    );
  }

  const displayName =
    `${user.first_name} ${user.last_name}`.trim() || user.username;

  return (
    <>
      <Avatar className="h-8 w-8 overflow-hidden rounded-full">
        <AvatarImage src={undefined} alt={displayName} />
        <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left ml-2 text-sm leading-tight">
        <span className="truncate font-medium">{displayName}</span>
        {showEmail && (
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        )}
      </div>
    </>
  );
}
