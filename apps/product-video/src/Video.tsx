import React from "react";
import { Series } from "remotion";
import { LogoReveal } from "./scenes/LogoReveal";
import { TheProblem } from "./scenes/TheProblem";
import { RoutePlanning } from "./scenes/RoutePlanning";
import { Monitoring } from "./scenes/Monitoring";
import { Compliance } from "./scenes/Compliance";
import { CallToAction } from "./scenes/CallToAction";

export const SallyLaunchVideo: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={120}>
        <LogoReveal />
      </Series.Sequence>
      <Series.Sequence durationInFrames={150}>
        <TheProblem />
      </Series.Sequence>
      <Series.Sequence durationInFrames={240}>
        <RoutePlanning />
      </Series.Sequence>
      <Series.Sequence durationInFrames={210}>
        <Monitoring />
      </Series.Sequence>
      <Series.Sequence durationInFrames={180}>
        <Compliance />
      </Series.Sequence>
      <Series.Sequence durationInFrames={150}>
        <CallToAction />
      </Series.Sequence>
    </Series>
  );
};
