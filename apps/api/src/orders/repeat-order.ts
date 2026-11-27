/**
 * Сколько единиц товара положить в корзину при повторе заказа.
 * existing — уже лежит в корзине, requested — было в прошлом заказе, stock — остаток сейчас.
 * Итог в корзине не превышает остаток; added — сколько реально добавили этим действием.
 */
export function repeatQuantity(existing: number, requested: number, stock: number) {
  const finalQuantity = Math.min(existing + requested, Math.max(stock, 0));
  return { finalQuantity, added: Math.max(finalQuantity - existing, 0) };
}
