export type RetentionPolicy = {
  captureRequiresExplicitSession: boolean;
  exportRequiresUserAction: boolean;
  retainRawAudio: boolean;
  retainRawVideo: boolean;
  retainKeyframes: boolean;
  retainTranscripts: boolean;
  futureControls: string[];
};

export const defaultRetentionPolicy: RetentionPolicy = {
  captureRequiresExplicitSession: true,
  exportRequiresUserAction: true,
  retainKeyframes: true,
  retainRawAudio: false,
  retainRawVideo: false,
  retainTranscripts: true,
  futureControls: ["auto-delete raw media after processing", "exclude apps/domains", "private mode", "encryption at rest"]
};
