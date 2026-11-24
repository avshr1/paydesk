import { CredentialsSignin } from "next-auth";

// Thrown from authorize() when an email has too many recent failed logins.
// The code reaches the login form, which shows a specific message.
export class TooManyAttempts extends CredentialsSignin {
  override code = "too_many_attempts";
}
