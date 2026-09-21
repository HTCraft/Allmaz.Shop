'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ordersApi, Order } from '../lib/orders-api';

export default function PaymentStatusSync({ order }: { order: Order }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPendingCardPayment = order.paymentMethod === 'CARD' && order.status === 'PENDING';

  useEffect(() => {
    if (!isPendingCardPayment) return;

    // Возврат со страницы оплаты ЮKassa не сопровождается вебхуком на localhost —
    // поэтому при заходе на страницу заказа сами активно спрашиваем актуальный статус
    setChecking(true);
    ordersApi
      .checkPaymentStatus(order.id)
      .then((updated) => {
        if (updated.status !== order.status) {
          router.refresh();
        }
      })
      .catch(() => null)
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  async function handleRetryPayment() {
    setError(null);
    setRetrying(true);
    try {
      const { paymentUrl } = await ordersApi.pay(order.id);
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        setError('Не удалось получить ссылку на оплату');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось начать оплату');
    } finally {
      setRetrying(false);
    }
  }

  if (!isPendingCardPayment) return null;

  return (
    <div className="alert alert-warning d-flex flex-column gap-2">
      {checking ? (
        <span>Проверяем статус оплаты...</span>
      ) : (
        <>
          <span>Оплата ещё не подтверждена.</span>
          <button
            type="button"
            className="btn btn-sm btn-warning align-self-start"
            onClick={handleRetryPayment}
            disabled={retrying}
          >
            {retrying ? 'Открываем оплату...' : 'Оплатить'}
          </button>
        </>
      )}
      {error && <span className="text-danger small">{error}</span>}
    </div>
  );
}
