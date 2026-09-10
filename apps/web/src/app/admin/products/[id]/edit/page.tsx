import { notFound } from 'next/navigation';
import { serverFetch } from '../../../../../lib/server-fetch';
import ProductForm from '../../ProductForm';

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const res = await serverFetch(`/admin/products/${id}`);
  if (!res.ok) notFound();
  const product = await res.json();

  return (
    <>
      <h1 className="h3 mb-4">Редактирование товара</h1>
      <ProductForm product={product} />
    </>
  );
}
