import React from "react";
import { Composition } from "remotion";
import { KaffeelPromo } from "./KaffeelPromo";
import { FPS, W, H, TOTAL_FRAMES } from "./constants";

export const Root: React.FC = () => (
  <Composition
    id="KaffeelPromo"
    component={KaffeelPromo}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={W}
    height={H}
  />
);
