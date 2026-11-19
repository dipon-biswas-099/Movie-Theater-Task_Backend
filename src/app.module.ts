import { Module } from '@nestjs/common';
import { MoviesModule } from './movies/movies.module.js';
import { CinemasModule } from './cinemas/cinemas.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [MoviesModule, CinemasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
