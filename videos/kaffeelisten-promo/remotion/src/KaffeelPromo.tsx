import React from "react";
import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { EX, SCENES } from "./constants";
import { Hook } from "./scenes/Hook";
import { Problem } from "./scenes/Problem";
import { MemberFlow } from "./scenes/MemberFlow";
import { InstantStat } from "./scenes/InstantStat";
import { AdminScene } from "./scenes/AdminScene";
import { CTA } from "./scenes/CTA";

export const KaffeelPromo: React.FC = () => (
  <>
    {/* Beat — Suno track at 90 BPM, warm minimal jazz */}
    {/* Volume fades out over the last 2 s (frames 1740–1800) for a clean ending */}
    <Audio
      src={staticFile("beat.mp3")}
      volume={(frame) =>
        interpolate(frame, [1740, 1800], [0.82, 0], EX)
      }
    />

    <Sequence from={SCENES.HOOK.from}         durationInFrames={SCENES.HOOK.dur}>
      <Hook />
    </Sequence>
    <Sequence from={SCENES.PROBLEM.from}      durationInFrames={SCENES.PROBLEM.dur}>
      <Problem />
    </Sequence>
    <Sequence from={SCENES.MEMBER_FLOW.from}  durationInFrames={SCENES.MEMBER_FLOW.dur}>
      <MemberFlow />
    </Sequence>
    <Sequence from={SCENES.INSTANT_STAT.from} durationInFrames={SCENES.INSTANT_STAT.dur}>
      <InstantStat />
    </Sequence>
    <Sequence from={SCENES.ADMIN.from}        durationInFrames={SCENES.ADMIN.dur}>
      <AdminScene />
    </Sequence>
    <Sequence from={SCENES.CTA.from}          durationInFrames={SCENES.CTA.dur}>
      <CTA />
    </Sequence>
  </>
);
