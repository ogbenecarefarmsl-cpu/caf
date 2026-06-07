import apiClient from './api-client';
import type {
  WireAssertionResponse,
  WireAttestationResponse,
} from './webauthn-client';

export type RegisterStartResponse = {
  options: {
    rp: { id: string; name: string };
    user: { id: string; name: string; displayName: string };
    challenge: string;
    pubKeyCredParams: { type: 'public-key'; alg: number }[];
    timeout: number;
    attestation: 'none' | 'direct' | 'indirect';
    authenticatorSelection?: Record<string, unknown>;
    excludeCredentials?: { type: 'public-key'; id: string }[];
  };
};

export type RegisterFinishRequest = {
  id: string;
  rawId: string;
  type: 'public-key';
  response: WireAttestationResponse;
  clientExtensionResults?: Record<string, unknown>;
  friendlyName?: string;
};

export type RegisterFinishResponse = {
  credentialId: string;
  transports: string[];
  createdAt: string;
};

export type LoginStartResponse = {
  challenge: string;
  timeout: number;
  rpId: string;
  allowCredentials?: { type: 'public-key'; id: string }[];
  userVerification?: 'discouraged' | 'preferred' | 'required';
  username?: string;
};

export type LoginFinishRequest = {
  id: string;
  rawId: string;
  type: 'public-key';
  response: WireAssertionResponse;
  username?: string;
  clientExtensionResults?: Record<string, unknown>;
};

export type CredentialSummary = {
  id: string;
  friendlyName: string;
  transports: string[];
  authenticatorAttachment?: string;
  backupEligible: boolean;
  backupState: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  revoked: boolean;
};

export const webauthnApi = {
  async registrationStart(): Promise<RegisterStartResponse> {
    const { data } = await apiClient.post<RegisterStartResponse>(
      '/webauthn/register/start',
    );
    return data;
  },

  async registrationFinish(
    payload: RegisterFinishRequest,
  ): Promise<RegisterFinishResponse> {
    const { data } = await apiClient.post<RegisterFinishResponse>(
      '/webauthn/register/finish',
      payload,
    );
    return data;
  },

  async loginStart(username?: string): Promise<LoginStartResponse> {
    const { data } = await apiClient.post<LoginStartResponse>(
      '/webauthn/login/start',
      username ? { username } : {},
    );
    return data;
  },

  async loginFinish(payload: LoginFinishRequest): Promise<unknown> {
    const { data } = await apiClient.post('/webauthn/login/finish', payload);
    return data;
  },

  async loginWithRecoveryCode(
    username: string,
    code: string,
  ): Promise<unknown> {
    const { data } = await apiClient.post('/webauthn/login/recovery', {
      username,
      code,
    });
    return data;
  },

  async listCredentials(): Promise<CredentialSummary[]> {
    const { data } = await apiClient.get<CredentialSummary[]>(
      '/webauthn/credentials',
    );
    return data;
  },

  async revokeCredential(credentialId: string): Promise<void> {
    await apiClient.delete(`/webauthn/credentials/${encodeURIComponent(credentialId)}`);
  },

  async recoveryCodeCount(): Promise<{ unused: number }> {
    const { data } = await apiClient.get<{ unused: number }>(
      '/webauthn/recovery-codes',
    );
    return data;
  },

  async generateRecoveryCodes(): Promise<{ codes: string[] }> {
    const { data } = await apiClient.post<{ codes: string[] }>(
      '/webauthn/recovery-codes/generate',
      {},
    );
    return data;
  },

  async stepUpStart(reason?: string): Promise<LoginStartResponse> {
    const { data } = await apiClient.post<LoginStartResponse>(
      '/webauthn/step-up/start',
      reason ? { reason } : {},
    );
    return data;
  },

  async stepUpFinish(
    reason: string,
    payload: {
      id: string;
      rawId: string;
      type: 'public-key';
      response: WireAssertionResponse;
    },
  ): Promise<{ token: string; expiresAt: number }> {
    const { data } = await apiClient.post<{ token: string; expiresAt: number }>(
      '/webauthn/step-up/finish',
      { ...payload, reason },
    );
    return data;
  },
};
