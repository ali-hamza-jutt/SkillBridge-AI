import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto, CreateSubCategoryDto } from './dto/category.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @Post()
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoryService.createCategory(dto);
  }

  @Get()
  getAllCategories() {
    return this.categoryService.getAllCategories();
  }

  @Get(':id')
  getCategoryById(@Param('id') id: string) {
    return this.categoryService.getCategoryById(id);
  }

  @Post(':categoryId/sub-categories')
  @ApiParam({ name: 'categoryId', type: String })
  createSubCategory(
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateSubCategoryDto,
  ) {
    return this.categoryService.createSubCategory({
      ...dto,
      categoryId,
    });
  }

  @Get(':categoryId/sub-categories')
  @ApiParam({ name: 'categoryId', type: String })
  getSubCategories(@Param('categoryId') categoryId: string) {
    return this.categoryService.getSubCategoriesByCategory(categoryId);
  }

  @Get('sub-categories/:id')
  getSubCategoryById(@Param('id') id: string) {
    return this.categoryService.getSubCategoryById(id);
  }
}
