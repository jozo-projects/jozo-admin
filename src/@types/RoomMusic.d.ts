export interface SongCategoryAssignment {
  categoryId: string;
  position: number;
}

export interface Song {
  _id?: string;
  video_id: string;
  title: string;
  author: string;
  duration?: number;
  url?: string;
  thumbnail?: string;
  categories?: SongCategoryAssignment[];
  created_at: Date | string;
  updated_at: Date | string;
}
