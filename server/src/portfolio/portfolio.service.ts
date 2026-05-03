import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PortfolioProject,
  PortfolioProjectDocument,
} from './schemas/portfolio-project.schema';
import {
  CreatePortfolioProjectDto,
  UpdatePortfolioProjectDto,
} from './dto/portfolio.dto';

type ProjectLean = PortfolioProject & { _id: Types.ObjectId };

@Injectable()
export class PortfolioService {
  constructor(
    @InjectModel(PortfolioProject.name)
    private readonly projectModel: Model<PortfolioProjectDocument>,
  ) {}

  async create(userId: string, dto: CreatePortfolioProjectDto) {
    return this.projectModel.create({ ...dto, userId });
  }

  async findByUser(userId: string) {
    return this.projectModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean<ProjectLean[]>();
  }

  async update(id: string, userId: string, dto: UpdatePortfolioProjectDto) {
    const project = await this.projectModel.findById(id);
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId) throw new ForbiddenException('Access denied');

    Object.assign(project, dto);
    return project.save();
  }

  async remove(id: string, userId: string) {
    const project = await this.projectModel.findById(id);
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId) throw new ForbiddenException('Access denied');

    await project.deleteOne();
    return { message: 'Project deleted' };
  }
}
