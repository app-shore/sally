import { Composition } from "remotion";
import { SallyLaunchVideo } from "./Video";

export const Root: React.FC = () => {
  return (
    <Composition
      id="SallyLaunchVideo"
      component={SallyLaunchVideo}
      durationInFrames={1800}
      width={1920}
      height={1080}
      fps={30}
    />
  );
};
