import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

const CarouselContext = createContext(null);

function useCarousel() {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error('useCarousel must be used within a <Carousel />');
  }
  return context;
}

export function Carousel({
  orientation = 'horizontal',
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === 'horizontal' ? 'x' : 'y',
    },
    plugins
  );
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback((instance) => {
    if (!instance) return;
    setCanScrollPrev(instance.canScrollPrev());
    setCanScrollNext(instance.canScrollNext());
  }, []);

  const scrollPrev = useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = useCallback(() => {
    api?.scrollNext();
  }, [api]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext]
  );

  useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on('reInit', onSelect);
    api.on('select', onSelect);
    return () => {
      api?.off('select', onSelect);
    };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api,
        opts,
        orientation: orientation || (opts?.axis === 'y' ? 'vertical' : 'horizontal'),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn('relative', className)}
        role="region"
        aria-roledescription="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

export function CarouselContent({ className, ...props }) {
  const { carouselRef, orientation } = useCarousel();
  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div
        className={cn(
          'flex',
          orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col',
          className
        )}
        {...props}
      />
    </div>
  );
}

export function CarouselItem({ className, ...props }) {
  const { orientation } = useCarousel();
  return (
    <div
      role="group"
      aria-roledescription="slide"
      className={cn(
        'min-w-0 shrink-0 grow-0 basis-full',
        orientation === 'horizontal' ? 'pl-4' : 'pt-4',
        className
      )}
      {...props}
    />
  );
}

export function CarouselPrevious({ className, ...props }) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();
  return (
    <button
      type="button"
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      aria-label="Previous slide"
      className={cn(
        'inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-2 border-ink/15 bg-white text-ink shadow-sm transition hover:border-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark disabled:cursor-not-allowed disabled:opacity-40',
        orientation === 'horizontal'
          ? 'absolute top-1/2 -left-4 -translate-y-1/2'
          : 'absolute -top-12 left-1/2 -translate-x-1/2 rotate-90',
        className
      )}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export function CarouselNext({ className, ...props }) {
  const { orientation, scrollNext, canScrollNext } = useCarousel();
  return (
    <button
      type="button"
      disabled={!canScrollNext}
      onClick={scrollNext}
      aria-label="Next slide"
      className={cn(
        'inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-2 border-ink/15 bg-white text-ink shadow-sm transition hover:border-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark disabled:cursor-not-allowed disabled:opacity-40',
        orientation === 'horizontal'
          ? 'absolute top-1/2 -right-4 -translate-y-1/2'
          : 'absolute -bottom-12 left-1/2 -translate-x-1/2 rotate-90',
        className
      )}
      {...props}
    >
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export { useCarousel };
