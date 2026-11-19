export interface Movie {
  id: string;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  prerequisiteIds: string[];
  watched: boolean;
}
