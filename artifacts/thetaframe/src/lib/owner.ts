export const OWNER_EMAIL = "mark@speaklymedia.com";

type UserWithEmails = {
  emailAddresses?: Array<{ emailAddress?: string | null }>;
} | null | undefined;

export function isOwnerEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === OWNER_EMAIL;
}

export function userIsOwner(user: UserWithEmails): boolean {
  return user?.emailAddresses?.some((email) => isOwnerEmail(email.emailAddress)) ?? false;
}
