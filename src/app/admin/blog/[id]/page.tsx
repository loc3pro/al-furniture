import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BlogEditForm } from "./BlogEditForm";

export default async function AdminBlogEditPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  let post = null;
  try {
    post = await prisma.blogPost.findUnique({ where: { id } });
  } catch {
    post = null;
  }
  if (!post) notFound();

  const initial = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    thumbnailUrl: post.thumbnailUrl,
    authorName: post.authorName,
    publishedAt: post.publishedAt.toISOString(),
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
  };

  return <BlogEditForm initial={initial} />;
}
