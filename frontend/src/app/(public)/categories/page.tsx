import type { Metadata } from "next";
import Link from "next/link";
import {
  Code,
  Palette,
  BarChart3,
  Globe,
  Music,
  Camera,
  Briefcase,
  Heart,
  BookOpen,
  Folder,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCategories } from "@/lib/queries/categories";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Danh muc",
  description: "Kham pha cac danh muc khoa hoc da dang.",
};

const iconMap: Record<string, React.ElementType> = {
  code: Code,
  palette: Palette,
  "bar-chart": BarChart3,
  globe: Globe,
  music: Music,
  camera: Camera,
  briefcase: Briefcase,
  heart: Heart,
  "book-open": BookOpen,
};

function getIcon(iconName: string | null): React.ElementType {
  if (!iconName) return Folder;
  return iconMap[iconName] || Folder;
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Danh mục khóa học</h1>
        <p className="mt-2 text-muted-foreground">
          Chọn danh mục bạn quan tâm để bắt đầu học tập
        </p>
      </div>

      {categories.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => {
            const Icon = getIcon(cat.icon);
            return (
              <Link key={cat.id} href={`/categories/${cat.slug}`}>
                <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                  <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                    <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="size-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{cat.name}</h3>
                      {cat.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {cat.course_count} khoa hoc
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Folder className="size-16 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold">
            Chua co danh muc nao
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Cac danh muc se som duoc cap nhat.
          </p>
        </div>
      )}
    </div>
  );
}
