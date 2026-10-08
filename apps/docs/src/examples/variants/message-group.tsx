import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
} from "@workspace/ui/components/message";

export function MessageGroupDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6 py-12">
      <MessageGroup>
        <Message>
          <MessageAvatar />
          <MessageContent>
            <Bubble variant="muted">
              <BubbleContent>I checked the registry addresses.</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
        <Message>
          <MessageAvatar>
            <Avatar>
              <AvatarImage src="/avatars/02.png" alt="@avatar" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </MessageAvatar>
          <MessageContent>
            <Bubble variant="muted">
              <BubbleContent>
                The component and example JSON now live under the UI registry.
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </MessageGroup>
    </div>
  );
}

export default MessageGroupDemo;
