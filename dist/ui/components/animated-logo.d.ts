import React from "react";
interface AnimatedLogoProps {
    subtitle?: string;
    showSubtitle?: boolean;
}
export default function AnimatedLogo({ subtitle, showSubtitle }: AnimatedLogoProps): React.JSX.Element;
/**
 * Alternative: Static gradient logo (no animation)
 * Use this for onboarding or when animation causes performance issues
 */
export declare function StaticGradientLogo({ subtitle, showSubtitle }: AnimatedLogoProps): React.JSX.Element;
export {};
