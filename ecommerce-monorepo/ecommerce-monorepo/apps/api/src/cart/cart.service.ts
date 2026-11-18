import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ecommerce/database';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { resolveMediaUrl } from '../media/resolve-media-url';

const CART_INCLUDE = {
  items: {
    include: {
      product: {
        include: {
          // Для миниатюры в корзине берём только первое ИЗОБРАЖЕНИЕ (не видео)
          media: {
            where: { type: 'IMAGE' as const },
            orderBy: { position: 'asc' as const },
            take: 1,
            select: { id: true, url: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

@Injectable()
export class CartService {
  private async getOrCreateCartId(userId: string): Promise<string> {
    const cart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return cart.id;
  }

  async getCart(userId: string) {
    await this.getOrCreateCartId(userId);
    const cart = await prisma.cart.findUniqueOrThrow({
      where: { userId },
      include: CART_INCLUDE,
    });
    return this.shapeCart(cart);
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = await prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException('Товар не найден');
    }
    if (product.stock <= 0) {
      throw new BadRequestException('Товара нет в наличии');
    }

    const cartId = await this.getOrCreateCartId(userId);
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId: dto.productId } },
    });

    const desiredQuantity = (existing?.quantity ?? 0) + dto.quantity;
    const clampedQuantity = Math.min(desiredQuantity, product.stock);

    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId: dto.productId } },
      update: { quantity: clampedQuantity },
      create: { cartId, productId: dto.productId, quantity: clampedQuantity },
    });

    return this.getCart(userId);
  }

  async updateItemQuantity(userId: string, productId: string, quantity: number) {
    const cartId = await this.getOrCreateCartId(userId);

    if (quantity === 0) {
      await prisma.cartItem.deleteMany({ where: { cartId, productId } });
      return this.getCart(userId);
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Товар не найден');
    }

    const clampedQuantity = Math.min(quantity, product.stock);

    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      update: { quantity: clampedQuantity },
      create: { cartId, productId, quantity: clampedQuantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cartId = await this.getOrCreateCartId(userId);
    await prisma.cartItem.deleteMany({ where: { cartId, productId } });
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cartId = await this.getOrCreateCartId(userId);
    await prisma.cartItem.deleteMany({ where: { cartId } });
    return this.getCart(userId);
  }

  private shapeCart(cart: {
    id: string;
    items: Array<{
      id: string;
      quantity: number;
      product: {
        id: string;
        title: string;
        slug: string;
        priceCents: number;
        stock: number;
        media: Array<{ id: string; url: string }>;
      };
    }>;
  }) {
    const items = cart.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        title: item.product.title,
        slug: item.product.slug,
        priceCents: item.product.priceCents,
        stock: item.product.stock,
        image: item.product.media[0] ? resolveMediaUrl(item.product.media[0]) : null,
      },
      subtotalCents: item.product.priceCents * item.quantity,
    }));

    const totalCents = items.reduce((sum, i) => sum + i.subtotalCents, 0);
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

    return { id: cart.id, items, totalCents, totalItems };
  }
}
