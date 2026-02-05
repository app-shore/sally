import { RegistrationForm } from "@/features/auth";
import { HeroRouteBackground } from "@/shared/components/common/landing/AnimatedRoute";

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background p-4">
      {/* Animated Background */}
      <HeroRouteBackground />

      {/* Content */}
      <div className="relative z-20">
        {/* Subtle backdrop for better contrast */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl -z-10" />
        <RegistrationForm />
      </div>
    </div>
  );
}
