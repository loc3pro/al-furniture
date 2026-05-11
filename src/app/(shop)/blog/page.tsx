import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Tin tức",
};

export default async function BlogIndexPage() {
  let posts: Awaited<ReturnType<typeof prisma.blogPost.findMany>> = [];
  try {
    posts = await prisma.blogPost.findMany({
      orderBy: { publishedAt: "desc" },
      take: 24,
    });
  } catch {
    posts = [];
  }

  return (
    <div className="container" style={{ padding: "2rem 0 3rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Tin tức</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {posts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="card" style={{ overflow: "hidden" }}>
            <div style={{ position: "relative", aspectRatio: "4/5", background: "#ece8e2" }}>
              {post.thumbnailUrl ? (
                <Image
                  src={post.thumbnailUrl}
                  alt=""
                  fill
                  sizes="360px"
                  loading="lazy"
                  style={{ objectFit: "cover" }}
                />
              ) : null}
            </div>
            <div style={{ padding: "1rem 1.1rem 1.25rem" }}>
              <div className="muted" style={{ fontSize: "0.8rem" }}>
                {post.authorName} · {new Date(post.publishedAt).toLocaleDateString("vi-VN")}
              </div>
              <h2 style={{ fontWeight: 700, fontSize: "1.05rem", margin: "0.45rem 0 0", lineHeight: 1.35 }}>
                {post.title}
              </h2>
              <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.92rem" }}>
                {post.excerpt}
              </p>
            </div>
          </Link>
        ))}
      </div>
      {posts.length === 0 ? <p className="muted">Chưa có bài viết.</p> : null}
    </div>
  );
}
