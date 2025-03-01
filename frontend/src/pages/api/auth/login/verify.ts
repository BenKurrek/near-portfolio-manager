// pages/api/auth/login/verify.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import {
  getUserByCredentialId,
  updateAuthenticatorCounter,
} from "@api-utils/user";
import {
  getOrCreateGlobalLoginUser,
  getChallenge,
  deleteChallenge,
} from "@api-utils/challenges";
import { createSession } from "@api-utils/sessions";
import { v4 as uuidv4 } from "uuid";

type AuthenticatorTransportFuture = "usb" | "nfc" | "ble" | "internal";

interface LoginResponse {
  verified: boolean;
  token?: string;
  username?: string;
  accountMetadata?: {
    contractMetadata: {
      keys: { sudo_key: string };
      contracts: {
        userDepositAddress: string;
      };
    };
  } | null;
  error?: string;
}

export default async function loginVerifyHandler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { assertionResponse } = req.body;
  if (!assertionResponse) {
    return res
      .status(400)
      .json({ verified: false, error: "No assertion response provided" });
  }

  try {
    // 1) Find which user has this credential ID
    const user = await getUserByCredentialId(assertionResponse.id);
    if (!user) {
      return res
        .status(400)
        .json({ verified: false, error: "Authenticator not registered" });
    }

    // 2) Grab the challenge from the special “global login user”
    const globalUser = await getOrCreateGlobalLoginUser();
    const expectedChallenge = await getChallenge(globalUser.id);
    if (!expectedChallenge) {
      return res
        .status(400)
        .json({ verified: false, error: "No challenge found" });
    }

    // 3) Prepare the credential info
    const stored = user.authenticators.find(
      (authr) => authr.id === assertionResponse.id
    );
    if (!stored) {
      return res
        .status(400)
        .json({ verified: false, error: "No matching credential in user" });
    }

    const credentialForVerification = {
      id: stored.id,
      publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64")),
      counter: stored.counter,
      transports: stored.transports.map(
        (t) => t as AuthenticatorTransportFuture
      ),
    };

    // 4) Do the passkey verification
    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge,
      expectedOrigin: process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN!,
      expectedRPID: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID!,
      credential: credentialForVerification,
    });

    const { verified, authenticationInfo } = verification;

    if (verified && authenticationInfo) {
      // 5) Update the counter
      const { credentialID: authCredentialID, newCounter } = authenticationInfo;
      await updateAuthenticatorCounter(user.id, authCredentialID, newCounter);

      // 6) Delete the global challenge from DB
      await deleteChallenge(globalUser.id);

      // 7) Create a session
      const token = uuidv4();
      await createSession(token, user.id);

      // 8) Return user info
      const accountMetadata = {
        contractMetadata: {
          keys: { sudo_key: user.sudoKey || "" },
          contracts: {
            userDepositAddress: user.userDepositAddress || "",
          },
        },
      };

      return res.status(200).json({
        verified: true,
        token,
        username: user.username,
        accountMetadata,
      });
    } else {
      return res
        .status(200)
        .json({ verified: false, error: "Verification failed" });
    }
  } catch (error: any) {
    console.error(error);
    return res
      .status(400)
      .json({ verified: false, error: "Authentication failed" });
  }
}
