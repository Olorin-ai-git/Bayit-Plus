import React from 'react';
import { Link } from 'react-router-dom';
import { slugify } from '../../api/utils/string';

interface ProductLinkProps {
  productId: string;
  productName: string;
  className?: string;
  children?: React.ReactNode;
}

export const ProductLink: React.FC<ProductLinkProps> = ({
  productId,
  productName,
  className,
  children,
}) => {
  const href = `/product/${productId}-${slugify(productName)}`;

  return (
    <Link to={href} className={className}>
      {children || productName}
    </Link>
  );
};
