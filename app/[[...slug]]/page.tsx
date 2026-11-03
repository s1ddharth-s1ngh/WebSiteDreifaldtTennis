import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WixPage } from "@/components/wix";
import { pages } from "@/content/pages";

const find = (slug?: string[]) => pages.find((p) => p.route === "/" + (slug ?? []).join("/"));

export function generateStaticParams() {
  return pages.map((p) => ({ slug: p.route === "/" ? [] : p.route.slice(1).split("/") }));
}

export async function generateMetadata({ params }: PageProps<"/[[...slug]]">): Promise<Metadata> {
  const page = find((await params).slug);
  return page?.route === "/" ? {} : { title: page?.title };
}

export default async function Page({ params }: PageProps<"/[[...slug]]">) {
  const page = find((await params).slug);
  if (!page) notFound();
  return <WixPage page={page} />;
}
