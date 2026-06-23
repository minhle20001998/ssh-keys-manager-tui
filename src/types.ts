export interface SshKey {
  name: string;
  privatePath: string;
  publicPath: string;
  comment?: string;
  fingerprint?: string;
  keyType?: string;
  bits?: number;
  isActive: boolean;
}

export interface Config {
  lastActiveKey?: string;
}

export interface StatusMessage {
  text: string;
  type: "info" | "success" | "error";
}
