"use client";
import { CopyIcon } from "@workspace/ui/components/copy-icon";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { useClipboard } from "@workspace/ui/hooks/use-clipboard";
import { InfoIcon, StarIcon } from "lucide-react";
import { useId, useState } from "react";

const profileUrl = "https://x.com/shadcn";

export default function InputGroupButtonExample() {
  const addressId = useId();
  const { copy, status } = useClipboard(profileUrl);
  const [favorite, setFavorite] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div className="grid w-full max-w-sm gap-6">
      <div className="flex flex-col gap-2">
        <InputGroup>
          <InputGroupInput
            value={profileUrl}
            aria-label="Profile URL"
            readOnly
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label={status === "copied" ? "Copied" : "Copy"}
              size="icon-xs"
              disabled={status === "pending"}
              onClick={() => copy()}
            >
              <CopyIcon status={status} />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {status === "error" && (
          <p role="status" className="text-destructive text-sm">
            Copy failed. Select the link and copy it manually.
          </p>
        )}
      </div>
      <InputGroup className="[--radius:9999px]">
        <InputGroupInput
          id={addressId}
          aria-label="Website address"
          defaultValue="example.com"
        />
        <InputGroupAddon>
          <Popover>
            <PopoverTrigger
              render={
                <InputGroupButton
                  variant="secondary"
                  size="icon-xs"
                  aria-label="URL details"
                />
              }
            >
              <InfoIcon />
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="flex flex-col gap-1 rounded-xl text-sm"
            >
              <p className="font-medium">URL details</p>
              <p>
                This example uses HTTPS. Edit the address to try another URL.
              </p>
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
        <InputGroupAddon className="ps-1.5 text-muted-foreground">
          https://
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            aria-label="Toggle favorite"
            aria-pressed={favorite}
            onClick={() => setFavorite((value) => !value)}
            size="icon-xs"
          >
            <StarIcon
              data-favorite={favorite}
              className="data-[favorite=true]:fill-primary data-[favorite=true]:stroke-primary"
            />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(
            query.trim()
              ? `Search preview: ${query.trim()}`
              : "Enter a search term first.",
          );
        }}
        className="flex flex-col gap-2"
      >
        <InputGroup>
          <InputGroupInput
            aria-label="Search term"
            placeholder="Type to search..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton type="submit" variant="secondary">
              Search
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <p role="status" className="text-muted-foreground text-sm">
          {message}
        </p>
      </form>
    </div>
  );
}
