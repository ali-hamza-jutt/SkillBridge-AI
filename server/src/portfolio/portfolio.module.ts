import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import {
  PortfolioProject,
  PortfolioProjectSchema,
} from './schemas/portfolio-project.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PortfolioProject.name, schema: PortfolioProjectSchema },
    ]),
  ],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}
