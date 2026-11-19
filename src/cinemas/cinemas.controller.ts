import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CinemasService } from './cinemas.service.js';
import { CreateCinemaDto } from './cinema.dto.js';

@Controller('cinemas')
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCinemaDto) {
    return this.cinemasService.createCinema(dto);
  }

  @Get()
  list() {
    return this.cinemasService.listCinemas();
  }

  @Get(':id/booking')
  booking(@Param('id') id: string, @Query('groupSize') groupSize: string) {
    const size = Number(groupSize);
    return this.cinemasService.getBookingQuote(id, size);
  }
}
