export default async function handler(req, res) {
  const code = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;

  // Real user IP + geo from Vercel (these headers come from the ACTUAL user, not Vercel's server)
  const city = req.headers["x-vercel-ip-city"] || "";
  const country = req.headers["x-vercel-ip-country"] || "";
  const region = req.headers["x-vercel-ip-country-region"] || "";
  const xff = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = req.headers["x-real-ip"] || xff || "";

  console.log("📍 Vercel captured real user:", { ip, city, country, region });

  const supabaseUrl = `https://ozkuefljvpzpmbrkknfw.supabase.co/functions/v1/track-click?code=${encodeURIComponent(code)}`;

  try {
    const upstream = await fetch(supabaseUrl, {
      method: "GET",
      redirect: "manual",
      headers: {
        "user-agent": req.headers["user-agent"] || "",
        "referer": req.headers["referer"] || "",
        "x-vercel-ip-city": city,
        "x-vercel-ip-country": country,
        "x-vercel-ip-country-region": region,
        "x-real-ip": ip,
        "x-forwarded-for": ip,
      },
    });

    // Pass through redirects
    if (upstream.status === 301 || upstream.status === 302) {
      const location = upstream.headers.get("location");
      if (!location) return res.status(502).send("Missing Location header");
      res.setHeader("Location", location);
      res.setHeader("Cache-Control", "no-store");
      return res.status(upstream.status).end();
    }

    // Pass through other responses (password page, errors, etc.)
    const contentType = upstream.headers.get("content-type") || "text/plain";
    res.setHeader("Content-Type", contentType);
    const body = await upstream.text();
    return res.status(upstream.status).send(body);
  } catch (err) {
    console.error("❌ Proxy error:", err);
    return res.status(502).send("Bad gateway");
  }
}
