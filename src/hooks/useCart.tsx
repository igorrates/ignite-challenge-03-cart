import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = window.localStorage.getItem("@RocketShoes:cart")

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {

      const existingProduct = cart.find(p => p.id === productId);
      if (!existingProduct) {
         api.get<Product>(`products/${productId}`).then((response) => {
           
          const productToAdd = response.data;
          if (productToAdd){

            const cartToSave = [...cart, {...productToAdd, amount: 1}]
            setCart(cartToSave);
            saveCartLocalStorage(cartToSave);
          }
          else toast.error('Erro na adição do produto');
        }).catch((err) => {
          toast.error('Erro na adição do produto');
        })     
      }
      else
        updateProductAmount( { productId, amount: existingProduct.amount + 1 } );
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let products = [...cart];
      const prodIndex = products.findIndex(prod => prod.id === productId);
      if (prodIndex < 0) throw new Error();
      products.splice(prodIndex, 1);
      setCart([...products]);
      saveCartLocalStorage(products);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      await api.get(`stock/${productId}`).then(response => { 
        const currentStock = response.data;
        const productToUpdate = cart.find(product => product.id === productId);
        if (productToUpdate) {
          if (currentStock.amount < amount) {
            toast.error('Quantidade solicitada fora de estoque');
            return;
          }
          let products = [...cart];
          const prodIndex = products.findIndex(prod => prod.id === productToUpdate.id);
          products[prodIndex].amount = amount;
          setCart([...products]);
          saveCartLocalStorage(products);
        }
      }).catch(err => {
        toast.error('Erro na alteração de quantidade do produto');
      });
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

function saveCartLocalStorage(cart:Product[]) {
  window.localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
