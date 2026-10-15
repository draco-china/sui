// biome-ignore-all lint/suspicious/noArrayIndexKey: The upstream gallery uses fixed positional fixtures that never reorder.

import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";

export default function CarouselDemo() {
  return (
    <div className="flex w-full justify-center px-12">
      <Carousel className="w-full max-w-[12rem] sm:max-w-xs">
        <CarouselContent>
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index}>
              <div className="p-1">
                <Card glass={false}>
                  <CardContent className="flex aspect-square items-center justify-center p-6">
                    <span className="font-semibold text-4xl">{index + 1}</span>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
