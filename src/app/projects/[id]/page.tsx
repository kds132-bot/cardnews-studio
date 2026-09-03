import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Editor from "@/components/Editor";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params, searchParams }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("*").eq("id", id).single<Project>();
  if (!data) notFound();
  return <Editor initial={data} autogen={sp.autogen === "1"} />;
}
