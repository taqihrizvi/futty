export function displayNameFromEmail(email: string) {
  const local = email.trim().split("@")[0] ?? "";
  const parts = local.split(".").filter(Boolean);
  if (parts.length === 0) return "Organizer";
  return parts
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase())
    .join(" ");
}
