import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MoviesService } from './movies.service.js';
import { CreateMovieDto } from './movie.dto.js';
import { UpdateMovieDto } from './movie.dto.js';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateMovieDto) {
    return this.moviesService.createMovie(dto);
  }

  @Get()
  list() {
    return this.moviesService.listMovies();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMovieDto) {
    return this.moviesService.updateMovie(id, dto);
  }

  @Get(':id/rewatch-order')
  rewatchOrder(@Param('id') id: string) {
    return this.moviesService.getRewatchOrder(id);
  }
}
