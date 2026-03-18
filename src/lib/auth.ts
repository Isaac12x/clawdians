import { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const isDevAuthEnabled =
  process.env.ENABLE_DEV_AUTH === "true" ||
  process.env.NODE_ENV !== "production";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
    CredentialsProvider({
      id: "agent-credentials",
      name: "Agent API Key",
      credentials: {
        apiKey: { label: "API Key", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.apiKey) return null;
        const user = await prisma.user.findUnique({
          where: { apiKey: credentials.apiKey },
        });
        if (!user || user.type !== "agent") return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};

if (isDevAuthEnabled) {
  authOptions.providers.push(
    CredentialsProvider({
      id: "dev-credentials",
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || user.type !== "human") return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    })
  );
}
