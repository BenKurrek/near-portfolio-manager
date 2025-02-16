// pages/api/auth/register/create-user.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { addUser, getUserByUsername } from "@api-utils/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { username } = req.body;
  if (!username || typeof username !== "string") {
    return res
      .status(400)
      .json({ error: "Invalid input. Username is required." });
  }

  const existingUser = await getUserByUsername(username);
  if (existingUser) {
    // If you prefer error out, do so. Or just respond "User already exists."
    return res.status(200).json({ message: "User already exists" });
  }

  try {
    const newUser = await addUser(username);
    return res.status(201).json({ message: "User created", user: newUser });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create user" });
  }
}
