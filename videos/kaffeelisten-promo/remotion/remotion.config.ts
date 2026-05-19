import { Config } from "@remotion/cli/config";

// Serve assets from the parent promo directory so staticFile('beats.mp3'),
// staticFile('assets/logo.svg'), staticFile('assets/member-start.png'), etc. resolve correctly.
Config.setPublicDir("..");
