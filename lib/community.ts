export type CommunityComment = {
  id: string;
  parent_id: string | null;
  name: string;
  body: string;
  is_author: boolean;
  created_at: string;
};

export type CommunityData = {
  likes: number;
  liked: boolean;
  comment_count: number;
  comments: CommunityComment[];
  has_more: boolean;
};

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
