import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { ProductQueryDto } from './dto/product-query.dto';

@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  listCategories() {
    return this.catalogService.listCategories();
  }

  @Get('products')
  listProducts(@Query() query: ProductQueryDto) {
    return this.catalogService.listProducts(query);
  }

  @Get('products/:slug')
  getProduct(@Param('slug') slug: string) {
    return this.catalogService.getProductBySlug(slug);
  }
}
