import * as React from "react";

// Simple `cn` function for className merging
function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// Minimal custom slider using native <input type="range">
export interface SliderProps {
  id?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number[];
  onValueChange?: (value: number[]) => void;
  className?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      id,
      min = 0,
      max = 100,
      step = 1,
      value,
      onValueChange,
      className,
      ...props
    },
    ref
  ) => (
    <input
      type="range"
      id={id}
      min={min}
      max={max}
      step={step}
      value={value[0]}
      ref={ref}
      className={cn(
        "w-full h-2 rounded-full bg-secondary appearance-none outline-none transition-all cursor-pointer",
        className
      )}
      onChange={e => onValueChange && onValueChange([Number(e.target.value)])}
      {...props}
    />
  )
);
Slider.displayName = "Slider";

export { Slider };