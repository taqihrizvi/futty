export async function signOut() {
  await fetch("/api/logout", { method: "POST" });
  window.location.assign("/login");
}
