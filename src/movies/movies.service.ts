import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Movie } from './movie.entity.js';
import { CreateMovieDto, UpdateMovieDto } from './movie.dto.js';

export interface RewatchOrderResult {
  order: Movie[];
  watchedCount: number;
  unwatchedRuntimeMinutes: number;
}

export { CreateMovieDto, UpdateMovieDto };

@Injectable()
export class MoviesService {
  private movies = new Map<string, Movie>();

  createMovie(dto: CreateMovieDto): Movie {
    this.validateMovieFields(dto);
    for (const m of this.movies.values()) {
      if (m.title === dto.title) {
        throw new BadRequestException('Title must be unique');
      }
    }

    const prerequisiteIds = [...(dto.prerequisiteIds ?? [])];
    this.validatePrerequisites(prerequisiteIds);

    const id = crypto.randomUUID();
    const movie: Movie = {
      id,
      title: dto.title,
      releaseYear: dto.releaseYear,
      runtimeMinutes: dto.runtimeMinutes,
      prerequisiteIds,
      watched: false,
    };

    this.movies.set(id, movie);
    try {
      this.checkCircularDependency();
    } catch (e) {
      this.movies.delete(id);
      throw e;
    }

    return movie;
  }

  listMovies(): Movie[] {
    return Array.from(this.movies.values());
  }

  updateMovie(id: string, dto: UpdateMovieDto): Movie {
    const movie = this.movies.get(id);
    if (!movie) {
      throw new NotFoundException(`Movie not found: ${id}`);
    }

    const candidate: Movie = {
      ...movie,
      prerequisiteIds: [...movie.prerequisiteIds],
    };

    if (dto.title !== undefined) {
      for (const m of this.movies.values()) {
        if (m.id !== id && m.title === dto.title) {
          throw new BadRequestException('Title must be unique');
        }
      }
      if (!dto.title.trim()) {
        throw new BadRequestException('title must not be empty');
      }
      candidate.title = dto.title;
    }

    if (dto.releaseYear !== undefined) {
      this.validateReleaseYear(dto.releaseYear);
      candidate.releaseYear = dto.releaseYear;
    }

    if (dto.runtimeMinutes !== undefined) {
      this.validateRuntime(dto.runtimeMinutes);
      candidate.runtimeMinutes = dto.runtimeMinutes;
    }

    if (dto.prerequisiteIds !== undefined) {
      candidate.prerequisiteIds = [...dto.prerequisiteIds];
      this.validatePrerequisites(candidate.prerequisiteIds);
    }

    if (dto.watched !== undefined) {
      candidate.watched = dto.watched;
    }

    this.movies.set(id, candidate);
    try {
      this.checkCircularDependency();
    } catch (e) {
      this.movies.set(id, movie);
      throw e;
    }

    return candidate;
  }

  getRewatchOrder(targetId: string): RewatchOrderResult {
    const target = this.movies.get(targetId);
    if (!target) {
      throw new NotFoundException(`Movie not found: ${targetId}`);
    }

    const prereqIds = new Set<string>();
    const queue: string[] = [...target.prerequisiteIds];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (prereqIds.has(current)) continue;
      prereqIds.add(current);
      const m = this.movies.get(current);
      if (m) {
        for (const pid of m.prerequisiteIds) {
          if (!prereqIds.has(pid)) {
            queue.push(pid);
          }
        }
      }
    }

    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    for (const id of prereqIds) {
      if (!inDegree.has(id)) inDegree.set(id, 0);
      if (!adjList.has(id)) adjList.set(id, []);
    }

    for (const id of prereqIds) {
      const m = this.movies.get(id)!;
      for (const pid of m.prerequisiteIds) {
        if (prereqIds.has(pid)) {
          adjList.get(pid)!.push(id);
          inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
        }
      }
    }

    const topoQueue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) topoQueue.push(id);
    }

    const sorted: Movie[] = [];
    while (topoQueue.length > 0) {
      const current = topoQueue.shift()!;
      const movie = this.movies.get(current);
      if (movie) sorted.push(movie);

      for (const dependent of (adjList.get(current) ?? [])) {
        const newDeg = (inDegree.get(dependent) ?? 1) - 1;
        inDegree.set(dependent, newDeg);
        if (newDeg === 0) topoQueue.push(dependent);
      }
    }

    const watchedCount = sorted.filter((m) => m.watched).length;
    const unwatchedRuntimeMinutes = sorted
      .filter((m) => !m.watched)
      .reduce((sum, m) => sum + m.runtimeMinutes, 0);

    return { order: sorted, watchedCount, unwatchedRuntimeMinutes };
  }

  private checkCircularDependency(): void {
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (id: string): void => {
      if (inStack.has(id)) {
        throw new ConflictException({ statusCode: 409, error: 'CIRCULAR_DEPENDENCY' });
      }
      if (visited.has(id)) return;

      visited.add(id);
      inStack.add(id);

      const movie = this.movies.get(id);
      if (movie) {
        for (const pid of movie.prerequisiteIds) {
          dfs(pid);
        }
      }

      inStack.delete(id);
    };

    for (const id of this.movies.keys()) {
      if (!visited.has(id)) {
        dfs(id);
      }
    }
  }

  private validateMovieFields(dto: CreateMovieDto): void {
    if (!dto.title || !dto.title.trim()) {
      throw new BadRequestException('title must not be empty');
    }
    this.validateReleaseYear(dto.releaseYear);
    this.validateRuntime(dto.runtimeMinutes);
  }

  private validateReleaseYear(releaseYear: number): void {
    if (!Number.isInteger(releaseYear) || releaseYear <= 0) {
      throw new BadRequestException('releaseYear must be a positive integer');
    }
  }

  private validateRuntime(runtimeMinutes: number): void {
    if (
      !Number.isInteger(runtimeMinutes) ||
      runtimeMinutes < 1 ||
      runtimeMinutes > 300
    ) {
      throw new BadRequestException('runtimeMinutes must be between 1 and 300');
    }
  }

  private validatePrerequisites(prerequisiteIds: string[]): void {
    if (new Set(prerequisiteIds).size !== prerequisiteIds.length) {
      throw new BadRequestException('prerequisiteIds must not contain duplicates');
    }
    for (const pid of prerequisiteIds) {
      if (!this.movies.has(pid)) {
        throw new BadRequestException(`Prerequisite movie not found: ${pid}`);
      }
    }
  }
}
