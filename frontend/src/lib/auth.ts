import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://fightiq:fightiq_secret@localhost:5432/fightiq",
  ssl: { rejectUnauthorized: false },
  options: 'endpoint=ep-royal-block-b315rtcq-pooler'
});

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  plugins: [
    admin(),
  ]
});
