import { loadFont } from "@remotion/google-fonts/Inter";
import { cancelRender, continueRender, delayRender } from "remotion";

const { fontFamily, waitUntilDone } = loadFont();

const delay = delayRender("Loading Inter font");

waitUntilDone()
  .then(() => continueRender(delay))
  .catch((err) => cancelRender(err));

export { fontFamily };
