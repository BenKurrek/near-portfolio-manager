// pages/api/auth/register/create-user.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { addUser, getUserByUsername } from "../utils/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("CreateUser request received.");

  if (req.method !== "POST") {
    console.error(`Method not allowed: ${req.method}`);
    res.status(405).end();
    return;
  }

  const { username } = req.body;

  if (!username || typeof username !== "string") {
    console.error("CreateUser failed: Invalid input.");
    res.status(400).json({
      error: "Invalid input. Username is required.",
    });
    return;
  }

  const existingUser = await getUserByUsername(username);
  if (existingUser) {
    console.warn(`CreateUser failed: User '${username}' already exists.`);
    res.status(200).json({ message: "User already exists" });
    return;
  }

  try {
    console.log(`Creating new user '${username}'.`);
    const newUser = await addUser(username);
    console.log(
      `User '${username}' created successfully with ID '${newUser.id}'.`
    );
    res.status(201).json({ message: "User created", user: newUser });
  } catch (error: any) {
    console.error(`Error creating user '${username}':`, error);
    res.status(500).json({ error: "Failed to create user" });
  }
}
