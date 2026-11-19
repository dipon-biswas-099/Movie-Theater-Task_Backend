export class CreateMovieDto {
  title!: string;
  releaseYear!: number;
  runtimeMinutes!: number;
  prerequisiteIds?: string[];
}

export class UpdateMovieDto {
  title?: string;
  releaseYear?: number;
  runtimeMinutes?: number;
  prerequisiteIds?: string[];
  watched?: boolean;
}
