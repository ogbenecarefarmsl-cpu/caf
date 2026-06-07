/**
 * WebAuthn / FIDO2 browser wrapper.
 *
 * Converts between base64url (wire format) and ArrayBuffer (browser format),
 * and exposes two functions:
 *   - createCredential(publicKey): Promise<PublicKeyCredential>
 *   - getAssertion(publicKey): Promise<PublicKeyCredential>
 *
 * The backend's /webauthn/register/start and /login/start endpoints return
 * PublicKeyCredentialCreationOptions / PublicKeyCredentialRequestOptions
 * in base64url-encoded form. We decode them, call navigator.credentials.*,
 * then re-encode the response to send back to the backend.
 */

function b64UrlToBuf(b64url: string): ArrayBuffer {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const b64 = padded + pad;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufToB64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export type WireCreationOptions = {
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  challenge: string;
  pubKeyCredParams: { type: 'public-key'; alg: number }[];
  timeout: number;
  attestation: 'none' | 'direct' | 'indirect';
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    residentKey?: 'discouraged' | 'preferred' | 'required';
    userVerification?: 'discouraged' | 'preferred' | 'required';
    requireResidentKey?: boolean;
  };
  excludeCredentials?: { type: 'public-key'; id: string }[];
  extensions?: Record<string, unknown>;
};

export type WireRequestOptions = {
  challenge: string;
  timeout: number;
  rpId: string;
  allowCredentials?: { type: 'public-key'; id: string }[];
  userVerification?: 'discouraged' | 'preferred' | 'required';
  extensions?: Record<string, unknown>;
};

export type WireAttestationResponse = {
  clientDataJSON: string;
  attestationObject: string;
  transports?: string[];
};

export type WireAssertionResponse = {
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  userHandle?: string;
};

type MediationType = 'conditional' | 'optional' | 'required' | 'silent';

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'PublicKeyCredential' in window &&
    typeof navigator.credentials?.create === 'function' &&
    typeof navigator.credentials?.get === 'function'
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function toCreationOptions(wire: WireCreationOptions): PublicKeyCredentialCreationOptions {
  return {
    rp: wire.rp,
    user: {
      id: b64UrlToBuf(wire.user.id),
      name: wire.user.name,
      displayName: wire.user.displayName,
    },
    challenge: b64UrlToBuf(wire.challenge),
    pubKeyCredParams: wire.pubKeyCredParams,
    timeout: wire.timeout,
    attestation: wire.attestation,
    authenticatorSelection: wire.authenticatorSelection,
    excludeCredentials: wire.excludeCredentials?.map((c) => ({
      type: c.type,
      id: b64UrlToBuf(c.id),
    })),
    extensions: wire.extensions as PublicKeyCredentialCreationOptions['extensions'],
  };
}

function toRequestOptions(wire: WireRequestOptions): PublicKeyCredentialRequestOptions {
  return {
    challenge: b64UrlToBuf(wire.challenge),
    timeout: wire.timeout,
    rpId: wire.rpId,
    allowCredentials: wire.allowCredentials?.map((c) => ({
      type: c.type,
      id: b64UrlToBuf(c.id),
    })),
    userVerification: wire.userVerification,
    extensions: wire.extensions as PublicKeyCredentialRequestOptions['extensions'],
  };
}

function fromAttestation(cred: PublicKeyCredential): {
  id: string;
  rawId: string;
  type: 'public-key';
  response: WireAttestationResponse;
  clientExtensionResults: Record<string, unknown>;
} {
  const att = cred.response as AuthenticatorAttestationResponse;
  return {
    id: cred.id,
    rawId: bufToB64Url(cred.rawId),
    type: 'public-key',
    response: {
      clientDataJSON: bufToB64Url(att.clientDataJSON),
      attestationObject: bufToB64Url(att.attestationObject),
      transports: att.getTransports?.() ?? undefined,
    },
    clientExtensionResults: (cred.getClientExtensionResults?.() ?? {}) as Record<string, unknown>,
  };
}

function fromAssertion(cred: PublicKeyCredential): {
  id: string;
  rawId: string;
  type: 'public-key';
  response: WireAssertionResponse;
  clientExtensionResults: Record<string, unknown>;
} {
  const ass = cred.response as AuthenticatorAssertionResponse;
  return {
    id: cred.id,
    rawId: bufToB64Url(cred.rawId),
    type: 'public-key',
    response: {
      clientDataJSON: bufToB64Url(ass.clientDataJSON),
      authenticatorData: bufToB64Url(ass.authenticatorData),
      signature: bufToB64Url(ass.signature),
      userHandle: ass.userHandle ? bufToB64Url(ass.userHandle) : undefined,
    },
    clientExtensionResults: (cred.getClientExtensionResults?.() ?? {}) as Record<string, unknown>,
  };
}

export async function createCredential(
  wireOptions: WireCreationOptions,
  mediation?: MediationType,
  ): Promise<ReturnType<typeof fromAttestation>> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn not supported in this browser');
  }
  const publicKey = toCreationOptions(wireOptions);
  const cred = (await navigator.credentials.create({
    publicKey,
    mediation,
  } as CredentialCreationOptions)) as PublicKeyCredential | null;
  if (!cred) throw new Error('No credential was created');
  return fromAttestation(cred);
}

export async function getAssertion(
  wireOptions: WireRequestOptions,
  mediation?: MediationType,
): Promise<ReturnType<typeof fromAssertion>> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn not supported in this browser');
  }
  const publicKey = toRequestOptions(wireOptions);
  const cred = (await navigator.credentials.get({
    publicKey,
    mediation,
  } as CredentialRequestOptions)) as PublicKeyCredential | null;
  if (!cred) throw new Error('No assertion was returned');
  return fromAssertion(cred);
}

/**
 * Detect existing platform credentials for the current RP.
 * Returns a list of credential IDs the browser will surface as
 * `allowCredentials` for the next login/start call.
 */
export async function listPlatformCredentials(rpId: string): Promise<string[]> {
  // Browsers don't expose a generic "list credentials" API.
  // This is a best-effort: we rely on the backend to return the user's
  // registered credential IDs, then we can pass them in `allowCredentials`.
  // This helper is for symmetry / future use.
  return Promise.resolve([]);
}
