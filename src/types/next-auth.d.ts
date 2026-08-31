import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "manager" | "viewer";
      divisionAccess: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "admin" | "manager" | "viewer";
    divisionAccess: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "manager" | "viewer";
    divisionAccess: string[];
  }
}
