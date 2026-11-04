import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign } from "node:crypto";
import { type Db, passkey } from "@wambito/db";

/** The bits of a WebAuthn assertion this helper produces (SimpleWebAuthn's JSON shape). */
export interface SoftAssertion {
  id: string;
  rawId: string;
  type: "public-key";
  response: { clientDataJSON: string; authenticatorData: string; signature: string };
  clientExtensionResults: Record<string, never>;
  authenticatorAttachment: "platform";
}

const b64url = (bytes: Buffer) => bytes.toString("base64url");

/** CBOR byte string header for a 32-byte value (major type 2, one length byte). */
const cborBytes32 = (bytes: Buffer) => Buffer.concat([Buffer.from([0x58, bytes.length]), bytes]);

/**
 * A software passkey for tests: a P-256 key from node:crypto, stored in `passkey` the way
 * `@better-auth/passkey` stores one (the COSE public key, base64; the credential id, base64url),
 * and an `assert` that answers a request's challenge as an authenticator would, with user presence
 * and user verification set and a counter that goes up on every assertion.
 */
export async function createSoftPasskey(
  adminDb: Db,
  userId: string,
  rpId: string,
): Promise<{
  credentialId: string;
  assert(options: { challenge: string }, origin: string): SoftAssertion;
}> {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const jwk = publicKey.export({ format: "jwk" });
  const x = Buffer.from(jwk.x ?? "", "base64url");
  const y = Buffer.from(jwk.y ?? "", "base64url");
  // COSE_Key {1: 2 (EC2), 3: -7 (ES256), -1: 1 (P-256), -2: x, -3: y}
  const cose = Buffer.concat([
    Buffer.from([0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21]),
    cborBytes32(x),
    Buffer.from([0x22]),
    cborBytes32(y),
  ]);
  const credentialId = b64url(randomBytes(16));
  await adminDb.insert(passkey).values({
    id: randomUUID(),
    name: "Soft passkey",
    publicKey: cose.toString("base64"),
    userId,
    credentialID: credentialId,
    counter: 0,
    deviceType: "singleDevice",
    backedUp: false,
    transports: "internal",
    createdAt: new Date(),
  });

  let counter = 0;
  return {
    credentialId,
    assert(options, origin) {
      const clientData = Buffer.from(
        JSON.stringify({
          type: "webauthn.get",
          challenge: options.challenge,
          origin,
          crossOrigin: false,
        }),
      );
      const count = Buffer.alloc(4);
      count.writeUInt32BE(++counter);
      const authData = Buffer.concat([
        createHash("sha256").update(rpId).digest(),
        Buffer.from([0x05]), // UP | UV
        count,
      ]);
      const signed = Buffer.concat([authData, createHash("sha256").update(clientData).digest()]);
      const signature = sign("sha256", signed, privateKey);
      return {
        id: credentialId,
        rawId: credentialId,
        type: "public-key",
        response: {
          clientDataJSON: b64url(clientData),
          authenticatorData: b64url(authData),
          signature: b64url(signature),
        },
        clientExtensionResults: {},
        authenticatorAttachment: "platform",
      };
    },
  };
}
