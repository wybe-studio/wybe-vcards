import type { Metadata } from "next";
import { BlogSection } from "@/components/marketing/sections/blog-section";
import { getAllPosts } from "@/lib/marketing/blog/posts";

export const metadata: Metadata = {
	title: "Blog",
	description: "Leggi i nostri ultimi articoli e aggiornamenti",
};

export default async function BlogListPage() {
	const posts = await getAllPosts();

	return <BlogSection posts={posts} />;
}
