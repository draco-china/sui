import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { CircleFadingPlusIcon } from "lucide-react";

export function AlertDialogWithMedia() {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="outline">Share Project</Button>}
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <CircleFadingPlusIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Share this project?</AlertDialogTitle>
          <AlertDialogDescription>
            Anyone with the link will be able to view and edit this project.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Share</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AlertDialogWithMedia;
