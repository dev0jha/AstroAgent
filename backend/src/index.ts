import "dotenv/config";
import app from "./api/server";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

app.listen(PORT, () => {
  console.log(`🌟 Aradhana backend running on http://localhost:${PORT}`);
  console.log(`   Ephemeris sidecar expected at ${process.env.EPHEMERIS_SIDECAR_URL ?? "http://localhost:8001"}`);
});
