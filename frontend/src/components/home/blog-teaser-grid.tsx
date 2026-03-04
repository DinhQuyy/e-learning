import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface BlogTeaserItem {
  title: string;
  description: string;
  href: string;
  badge: string;
}

interface BlogTeaserGridProps {
  items: BlogTeaserItem[];
}

export function BlogTeaserGrid({ items }: BlogTeaserGridProps) {
  return (
    <section className="pb-20 pt-8 sm:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--learnify-primary)]">Bài viết nổi bật</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--learnify-heading)] sm:text-3xl">
              Kiến thức mới cho hành trình học tập
            </h2>
          </div>
          <Link
            href="/help"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--learnify-primary)] hover:underline"
          >
            Xem thêm
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.href} className="learnify-soft-card rounded-2xl border bg-card p-6">
              <span className="inline-flex rounded-full bg-[var(--learnify-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--learnify-primary)]">
                {item.badge}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-[var(--learnify-heading)]">{item.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-[var(--learnify-body)]">{item.description}</p>
              <Link
                href={item.href}
                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--learnify-primary)] hover:underline"
              >
                Khám phá
                <ArrowRight className="size-4" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
