// ===== ATUR DI SINI =====
const CFG = {
  apiUrl: "/api/save"       // endpoint serverless Vercel (api/save.js), token disimpan di Vercel
};
// ========================
const $ = id => document.getElementById(id);
const say = (t, ok) => { const m = $("msg"); m.textContent = t; m.className = ok ? "ok" : "err"; };

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
  $("b").disabled = true;
  say("Menyimpan ke GitHub...", true);
  try {
    const res = await addViaApi(user);
    say(res === "exists" ? user + " sudah terdaftar di whitelist." : user + " berhasil di-whitelist!", true);
  } catch (err) {
    say(err.message, false);
  }
  $("b").disabled = false;
});
