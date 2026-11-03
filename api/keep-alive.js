export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hsswobqnjzwqsczbxmrj.supabase.co";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_fr8rj2iLrQhkl3Yjg7qGPg_O4FnnIYG";

  try {
    const startTime = Date.now();
    const response = await fetch(`${supabaseUrl}/rest/v1/event_config?select=id&limit=1`, {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });

    const duration = Date.now() - startTime;
    const isOk = response.ok;
    const data = await response.json().catch(() => null);

    return res.status(200).json({
      status: isOk ? "success" : "warning",
      message: isOk ? "Supabase database keep-alive ping successful (Active 24/7)" : "Ping returned non-200 status",
      statusCode: response.status,
      latencyMs: duration,
      timestamp: new Date().toISOString(),
      thaiTime: new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
      database: isOk ? "active" : "unknown",
      queryResult: data
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
