import { NextResponse } from "next/server";

const BASE = "https://provinces.open-api.vn/api";

/**
 * Proxy địa chỉ VN (open-api) — client gọi để tránh CORS.
 * ?type=provinces | districts&provinceCode=79 | wards&districtCode=764
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  try {
    if (type === "provinces") {
      const r = await fetch(`${BASE}/?depth=1`, { next: { revalidate: 86_400 } });
      if (!r.ok) throw new Error("upstream");
      const raw = (await r.json()) as { code: number; name: string }[];
      return NextResponse.json(
        raw.map((p) => ({ code: p.code, name: p.name })),
        { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } },
      );
    }

    const provinceCode = url.searchParams.get("provinceCode");
    if (type === "districts" && provinceCode) {
      const r = await fetch(`${BASE}/p/${provinceCode}?depth=2`, { next: { revalidate: 86_400 } });
      if (!r.ok) throw new Error("upstream");
      const data = (await r.json()) as {
        districts: { code: number; name: string }[];
      };
      return NextResponse.json(
        (data.districts ?? []).map((d) => ({ code: d.code, name: d.name })),
        { headers: { "Cache-Control": "public, s-maxage=86400" } },
      );
    }

    const districtCode = url.searchParams.get("districtCode");
    if (type === "wards" && districtCode) {
      const r = await fetch(`${BASE}/d/${districtCode}?depth=2`, { next: { revalidate: 86_400 } });
      if (!r.ok) throw new Error("upstream");
      const data = (await r.json()) as {
        wards: { code: number; name: string }[];
      };
      return NextResponse.json(
        (data.wards ?? []).map((w) => ({ code: w.code, name: w.name })),
        { headers: { "Cache-Control": "public, s-maxage=86400" } },
      );
    }

    return NextResponse.json({ error: "Thiếu tham số hợp lệ" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Không tải được dữ liệu địa chỉ" }, { status: 502 });
  }
}
