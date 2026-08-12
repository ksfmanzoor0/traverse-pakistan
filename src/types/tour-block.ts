// Block-editor content for the tour body. Discriminated by `type`.
// Adding a new block type = add a variant here + a case in the editor's
// BlockConfigForm + a case in the TourBody renderer.

type Home = "ISB" | "LHE" | "KHI" | "KDU";

interface BaseBlock {
  id: string;
  cityOnly?: Home[];
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  level: 2 | 3;
  text: string;
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  text: string;
}

export interface ListBlock extends BaseBlock {
  type: "list";
  ordered: boolean;
  items: string[];
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  url: string;
  alt: string;
  caption?: string;
}

export interface CalloutBlock extends BaseBlock {
  type: "callout";
  variant: "info" | "warning" | "tip";
  text: string;
}

export interface EmbedBlock extends BaseBlock {
  type: "embed";
  url: string;
  aspect: "16/9" | "4/3" | "1/1";
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
}

export type TourBlock =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | ImageBlock
  | CalloutBlock
  | EmbedBlock
  | DividerBlock;

export type TourBlockType = TourBlock["type"];

export const BLOCK_TYPE_LABELS: Record<TourBlockType, string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  list: "List",
  image: "Image",
  callout: "Callout",
  embed: "Embed (YouTube / Map)",
  divider: "Divider",
};

// Fresh block factory — used by the editor's "+ Add block" menu.
export function makeBlock(type: TourBlockType): TourBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "heading": return { id, type, level: 2, text: "" };
    case "paragraph": return { id, type, text: "" };
    case "list": return { id, type, ordered: false, items: [""] };
    case "image": return { id, type, url: "", alt: "" };
    case "callout": return { id, type, variant: "info", text: "" };
    case "embed": return { id, type, url: "", aspect: "16/9" };
    case "divider": return { id, type };
  }
}
