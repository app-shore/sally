import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Stillness } from "./scenes/Stillness";
import { Signals } from "./scenes/Signals";
import { Awakening } from "./scenes/Awakening";
import { RoutePlanning } from "./scenes/RoutePlanning";
import { TheNerve } from "./scenes/TheNerve";
import { Certainty } from "./scenes/Certainty";
import { Invitation } from "./scenes/Invitation";

const FADE_DURATION = 15; // frames for cross-fade transitions

export const SallyLaunchVideo: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={165}>
        <Stillness />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE_DURATION })}
      />
      <TransitionSeries.Sequence durationInFrames={315}>
        <Signals />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE_DURATION })}
      />
      <TransitionSeries.Sequence durationInFrames={165}>
        <Awakening />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE_DURATION })}
      />
      <TransitionSeries.Sequence durationInFrames={375}>
        <RoutePlanning />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE_DURATION })}
      />
      <TransitionSeries.Sequence durationInFrames={375}>
        <TheNerve />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE_DURATION })}
      />
      <TransitionSeries.Sequence durationInFrames={255}>
        <Certainty />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: FADE_DURATION })}
      />
      <TransitionSeries.Sequence durationInFrames={240}>
        <Invitation />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
