// src/pages/api/auth/register/create-user.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { addUser, getUserByUsername } from "../utils/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }
  const { username } = req.body;
  if (!username || typeof username !== "string") {
    res.status(400).json({ error: "Invalid input. Username is required." });
    return;
  }
  const existingUser = await getUserByUsername(username);
  if (existingUser) {
    res.status(200).json({ message: "User already exists" });
    return;
  }
  try {
    const newUser = await addUser(username);
    res.status(201).json({ message: "User created", user: newUser });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create user" });
  }
}
