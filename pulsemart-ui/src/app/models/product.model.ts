export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
}

export interface AuthResponse {
  token: string;
  email?: string;
  role?: string;
}