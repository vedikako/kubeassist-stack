export type ClusterInfo = {
  name: string;
  serverVersion: string;
};

export type PodSummary = {
  name: string;
  namespace: string;
  phase: string;
  ready: string;
  restartCount: number;
  waitingReason?: string;
};

export type ResolutionStep = {
  order: number;
  description: string;
  command?: string | null;
  isWriteAction?: boolean;
};

export type DocRef = {
  title: string;
  url: string;
  section?: string;
  snippet?: string;
};

export type DiagnosisResponse = {
  schemaVersion: string;
  failureType: string;
  issueSummary: string;
  observedEvidence: string[];
  probableRootCause: string;
  reasoning: string;
  confidenceScore: number;
  resolutionSteps: ResolutionStep[];
  verificationCommands: string[];
  rollbackGuidance: string;
  documentationReferences: DocRef[];
  uncertaintyNotes: string[];
  mode?: string;
  investigationId?: string;
};

export type ApiError = {
  code: string;
  message: string;
};

export type RegisteredCluster = {
  clusterId: string;
  token: string;
  relayUrl: string;
};

export type ClusterStatus = {
  clusterId: string;
  connected: boolean;
};
