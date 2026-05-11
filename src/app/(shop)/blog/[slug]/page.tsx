import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { prepareShopHtmlForRender } from "@/lib/sanitize-shop-html";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: { title: true, metaTitle: true, metaDescription: true },
  });
  if (!post) return { title: "Bài viết" };
  return {
    title: post.metaTitle ?? post.title,
    description: post.metaDescription ?? undefined,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { slug },
  });
  if (!post) notFound();

  return (
    <article className="container" style={{ padding: "2rem 0 3rem", maxWidth: 720 }}>
      <p style={{ marginBottom: "0.75rem" }}>
        <Link href="/blog" className="muted">
          ← Tin tức
        </Link>
      </p>
      <header style={{ marginBottom: "1.5rem" }}>
        <p className="muted" style={{ fontSize: "0.9rem" }}>
          {post.authorName} · {new Date(post.publishedAt).toLocaleDateString("vi-VN")}
        </p>
        <h1 style={{ fontSize: "clamp(1.35rem, 3vw, 1.85rem)", margin: "0.35rem 0 0", lineHeight: 1.25 }}>
          {post.title}
        </h1>
      </header>
      {post.thumbnailUrl ? (
        <div style={{ position: "relative", aspectRatio: "16/10", marginBottom: "1.5rem", borderRadius: 12, overflow: "hidden" }}>
          <Image src={post.thumbnailUrl} alt="" fill sizes="720px" style={{ objectFit: "cover" }} priority />
        </div>
      ) : null}
      <div
        className="blog-content"
        style={{ fontSize: "1.02rem" }}
        dangerouslySetInnerHTML={{ __html: prepareShopHtmlForRender(post.content) }}
      />
    </article>
  );
}
