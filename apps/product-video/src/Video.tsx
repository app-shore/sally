import React from "react";
import { Series } from "remotion";
import { Stillness } from "./scenes/Stillness";
import { Signals } from "./scenes/Signals";
import { Awakening } from "./scenes/Awakening";
import { RoutePlanning } from "./scenes/RoutePlanning";
import { TheNerve } from "./scenes/TheNerve";
import { Certainty } from "./scenes/Certainty";
import { Invitation } from "./scenes/Invitation";

export const SallyLaunchVideo: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={150}>
        <Stillness />
      </Series.Sequence>
      <Series.Sequence durationInFrames={300}>
        <Signals />
      </Series.Sequence>
      <Series.Sequence durationInFrames={150}>
        <Awakening />
      </Series.Sequence>
      <Series.Sequence durationInFrames={360}>
        <RoutePlanning />
      </Series.Sequence>
      <Series.Sequence durationInFrames={360}>
        <TheNerve />
      </Series.Sequence>
      <Series.Sequence durationInFrames={240}>
        <Certainty />
      </Series.Sequence>
      <Series.Sequence durationInFrames={240}>
        <Invitation />
      </Series.Sequence>
    </Series>
  );
};
