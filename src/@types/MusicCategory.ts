import type { Song } from "./RoomMusic";

export interface MusicCategory {
  _id: string;
  name: string;
  slug: string;
  imageUrl: string;
  imagePublicId?: string;
  isActive: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMusicCategory extends MusicCategory {
  songCount: number;
}

export interface CategorySong extends Song {
  categoryPosition: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CategorySongsResult {
  songs: CategorySong[];
  pagination: PaginationInfo;
}

export interface CategorySongsQuery {
  page?: number;
  limit?: number;
  keyword?: string;
}