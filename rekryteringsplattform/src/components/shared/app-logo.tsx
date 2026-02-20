import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";

const SIZE_MAP: Record<LogoSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
};

const TEXT_SIZE_MAP: Record<LogoSize, string> = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
};

interface AppLogoProps {
  size?: LogoSize;
  withText?: boolean;
  textClassName?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

export function AppLogo({
  size = "sm",
  withText = true,
  textClassName,
  className,
  imageClassName,
  priority = false,
}: AppLogoProps) {
  const dimension = SIZE_MAP[size];

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/recruito-logo.png"
        alt="Recruito"
        width={dimension}
        height={dimension}
        priority={priority}
        className={cn("object-contain", imageClassName)}
      />
      {withText ? (
        <span className={cn("font-bold tracking-tight", TEXT_SIZE_MAP[size], textClassName || "text-brand-600")}>Recruito</span>
      ) : null}
    </div>
  );
}
