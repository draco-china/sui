// biome-ignore-all lint/suspicious/noArrayIndexKey: The upstream gallery uses fixed positional fixtures that never reorder.

"use client";

import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";
import * as React from "react";

export default function CarouselDApiDemo() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <div className="mx-auto max-w-[10rem] sm:max-w-xs">
      <Carousel setApi={setApi} className="w-full max-w-xs">
        <CarouselContent>
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index}>
              <Card className="m-px">
                <CardContent className="flex aspect-square items-center justify-center p-6">
                  <span className="font-semibold text-4xl">{index + 1}</span>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
      <div className="py-2 text-center text-muted-foreground text-sm">
        Slide {current} of {count}
      </div>
    </div>
  );
}
