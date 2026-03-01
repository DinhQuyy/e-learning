"use client";

import { useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
  Link2,
  ImageIcon,
  Undo,
  Redo,
  Eye,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  className,
}: RichTextEditorProps) {
  const [activeTab, setActiveTab] = useState<string>("edit");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full rounded-lg",
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none p-3 min-h-[200px] focus:outline-none",
      },
    },
  });

  const addLink = useCallback(() => {
    if (!editor || !linkUrl) return;
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: linkUrl })
      .run();
    setLinkUrl("");
  }, [editor, linkUrl]);

  const addImage = useCallback(async () => {
    if (!editor) return;

    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
      return;
    }

    // File upload
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await apiFetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        const fileId = data.data?.id;
        if (fileId) {
          const directusUrl =
            process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
          editor
            .chain()
            .focus()
            .setImage({ src: `${directusUrl}/assets/${fileId}` })
            .run();
        }
      } catch {
        // Silently fail
      }
    };
    input.click();
  }, [editor, imageUrl]);

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    isActive = false,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-7", isActive && "bg-muted")}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className={cn("border rounded-md", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between border-b px-2 overflow-x-auto">
          {activeTab === "edit" && (
            <div className="flex items-center gap-0.5 py-1 flex-wrap">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive("bold")}
                title="In đậm"
              >
                <Bold className="size-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive("italic")}
                title="In nghiêng"
              >
                <Italic className="size-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive("underline")}
                title="Gạch chân"
              >
                <UnderlineIcon className="size-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive("strike")}
                title="Gạch ngang"
              >
                <Strikethrough className="size-3.5" />
              </ToolbarButton>

              <div className="w-px h-4 bg-border mx-1" />

              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                isActive={editor.isActive("heading", { level: 2 })}
                title="Tiêu đề 2"
              >
                <Heading2 className="size-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
                isActive={editor.isActive("heading", { level: 3 })}
                title="Tiêu đề 3"
              >
                <Heading3 className="size-3.5" />
              </ToolbarButton>

              <div className="w-px h-4 bg-border mx-1" />

              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleBulletList().run()
                }
                isActive={editor.isActive("bulletList")}
                title="Danh sách"
              >
                <List className="size-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleOrderedList().run()
                }
                isActive={editor.isActive("orderedList")}
                title="Danh sách đánh số"
              >
                <ListOrdered className="size-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleBlockquote().run()
                }
                isActive={editor.isActive("blockquote")}
                title="Trích dẫn"
              >
                <Quote className="size-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleCodeBlock().run()
                }
                isActive={editor.isActive("codeBlock")}
                title="Khối code"
              >
                <Code2 className="size-3.5" />
              </ToolbarButton>

              <div className="w-px h-4 bg-border mx-1" />

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-7",
                      editor.isActive("link") && "bg-muted"
                    )}
                    title="Chèn liên kết"
                  >
                    <Link2 className="size-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addLink()}
                      className="h-8 text-sm"
                    />
                    <Button size="sm" className="h-8" onClick={addLink}>
                      Thêm
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Chèn ảnh"
                  >
                    <ImageIcon className="size-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="URL ảnh..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addImage()}
                        className="h-8 text-sm"
                      />
                      <Button size="sm" className="h-8" onClick={addImage}>
                        Thêm
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setImageUrl("");
                        addImage();
                      }}
                    >
                      Tải lên từ máy
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="w-px h-4 bg-border mx-1" />

              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                title="Hoàn tác"
              >
                <Undo className="size-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                title="Làm lại"
              >
                <Redo className="size-3.5" />
              </ToolbarButton>
            </div>
          )}
          {activeTab !== "edit" && <div />}
          <TabsList className="h-8 bg-transparent shrink-0">
            <TabsTrigger value="edit" className="text-xs h-6 px-2">
              <Edit3 className="size-3 mr-1" />
              Soạn thảo
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs h-6 px-2">
              <Eye className="size-3 mr-1" />
              Xem trước
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="edit" className="mt-0">
          <EditorContent editor={editor} />
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <div
            className="prose prose-sm dark:prose-invert max-w-none p-3 min-h-[200px]"
            dangerouslySetInnerHTML={{
              __html:
                value ||
                `<p class="text-muted-foreground">${placeholder}</p>`,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
