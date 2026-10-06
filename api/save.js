// Vercel Serverless Function (api/save.js): simpan username ke whitelist.txt di GitHub
// Token dibaca dari Environment Variable GITHUB_TOKEN (tidak muncul di HTML/JS)
const OWNER = "xyureisipemula";
const REPO = "Whitelist";
const BRANCH = "main";
const PATH = "whitelist.txt";

const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: "GITHUB_TOKEN belum diatur di Vercel" });

  const user = String((req.body && req.body.username) || "").trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(user)) {
    return res.status(400).json({ error: "Username harus 3-20 karakter: huruf, angka, atau _." });
  }

  const h = {
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "User-Agent": "whitelist-web",
  };

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      let sha, text = "";
      const r = await fetch(`${API}?ref=${BRANCH}&t=${Date.now()}`, { headers: h });
      if (r.ok) {
        const j = await r.json();
        sha = j.sha;
        text = Buffer.from(j.content, "base64").toString("utf8");
      } else if (r.status !== 404) {
        const e = await r.json().catch(() => ({}));
        return res.status(502).json({ error: `GitHub ${r.status}: ${e.message || "gagal membaca"}` });
      }

      const names = text.split(/\r?\n/).map((s) => s.trim().toLowerCase());
      if (names.includes(user.toLowerCase())) return res.status(200).json({ status: "exists" });

      if (text && !text.endsWith("\n")) text += "\n";
      text += user + "\n";

      const body = { message: "whitelist: add " + user, content: Buffer.from(text, "utf8").toString("base64"), branch: BRANCH };
      if (sha) body.sha = sha;
      const p = await fetch(API, { method: "PUT", headers: h, body: JSON.stringify(body) });
      if (p.ok) return res.status(200).json({ status: "added" });
      if (p.status !== 409) {
        const e = await p.json().catch(() => ({}));
        return res.status(502).json({ error: `GitHub ${p.status}: ${e.message || "gagal menyimpan"}` });
      }
      // 409 = ada yang menulis bersamaan, ulangi dengan data terbaru
    }
    return res.status(503).json({ error: "Server sibuk, coba lagi." });
  } catch (err) {
    return res.status(500).json({ error: "Error server: " + err.message });
  }
};
