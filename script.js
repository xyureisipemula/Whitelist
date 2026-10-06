// ===== ATUR DI SINI =====
const CFG = {
  owner: "xyureisipemula",
  repo: "Whitelist",        // nama repo GitHub tempat whitelist.txt
  branch: "main",
  path: "whitelist.txt",
  token: "",                // TOKEN GITHUB (fine-grained, izin Contents: Read and write, khusus repo whitelist)
  apiUrl: ""                // opsional: kalau diisi, token tidak dipakai di web (lewat endpoint serverless)
};
// ========================
const $ = id => document.getElementById(id);
const API = `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/contents/${CFG.path}`;
const say = (t, ok) => { const m = $("msg"); m.textContent = t; m.className = ok ? "ok" : "err"; };

async function addViaGithub(user, token) {
  const h = {Authorization: "Bearer " + token, Accept: "application/vnd.github+json"};
  let sha, text = "";
  const r = await fetch(`${API}?ref=${CFG.branch}&t=${Date.now()}`, {headers: h});
  if (r.ok) {
    const j = await r.json();
    sha = j.sha;
    text = atob(j.content.replace(/\n/g, ""));
  } else if (r.status !== 404) {
    const e = await r.json().catch(() => ({}));
    throw new Error("GitHub " + r.status + ": " + (e.message || "cek token, owner, dan nama repo"));
  }
  const names = text.split(/\r?\n/).map(s => s.trim().toLowerCase());
  if (names.includes(user.toLowerCase())) return "exists";
  if (text && !text.endsWith("\n")) text += "\n";
  text += user + "\n";
  const p = await fetch(API, {method: "PUT", headers: h, body: JSON.stringify({
    message: "whitelist: add " + user, content: btoa(text), branch: CFG.branch, ...(sha && {sha})})});
  if (!p.ok) {
    const e = await p.json().catch(() => ({}));
    throw new Error("Gagal menyimpan " + p.status + ": " + (e.message || "token perlu izin Contents: Read and write"));
  }
  return "added";
}

async function addViaApi(user) {
  const r = await fetch(CFG.apiUrl, {method: "POST", headers: {"Content-Type": "application/json"},
    body: JSON.stringify({username: user})});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Server error " + r.status);
  return j.status || "added";
}

$("f").addEventListener("submit", async e => {
  e.preventDefault();
  const user = $("u").value.trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(user)) return say("Username harus 3-20 karakter: huruf, angka, atau _.", false);
  if (!CFG.apiUrl && !CFG.token) return say("Token GitHub belum diisi di CFG (whitelist.html).", false);
  $("b").disabled = true;
  say("Menyimpan ke GitHub...", true);
  try {
    const res = CFG.apiUrl ? await addViaApi(user) : await addViaGithub(user, CFG.token);
    say(res === "exists" ? user + " sudah terdaftar di whitelist." : user + " berhasil di-whitelist!", true);
  } catch (err) {
    say(err.message, false);
  }
  $("b").disabled = false;
});
