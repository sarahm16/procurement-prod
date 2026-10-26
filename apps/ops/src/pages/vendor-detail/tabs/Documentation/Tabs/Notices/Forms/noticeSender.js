// Notices/Forms/noticeSender.js
//
// The sender's title and phone, remembered between notices (termination,
// warning, …) in this browser. The old app used "title" / "phoneNumber";
// those are read as a fallback the first time.
const KEY = "nfc.noticeSender";

export function loadSender() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    return {
      title: saved?.title ?? localStorage.getItem("title") ?? "",
      phone: saved?.phone ?? localStorage.getItem("phoneNumber") ?? "",
    };
  } catch {
    return { title: "", phone: "" };
  }
}

export function saveSender(title, phone) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ title, phone }));
  } catch {
    /* not remembered; fine */
  }
}
