import queries from '../../services/queries';
import { AuthenticationError, UserInputError, IResolvers } from 'apollo-server-express';

const ProductResolver: IResolvers = {
  Query: {
    products: async (rootValue, args) => {
      const { productId, name } = args;
      return await queries.listProducts({ productId, name });
    }
  },
  Product: {
    id: parent => {
      return parent.id;
    },
    name: parent => {
      return parent.name;
    },
    amount: parent => {
      return parent.amount;
    },
    getProductHolders: async (parent, args, context) => {
      const { authValidated } = context;
      if (authValidated instanceof Error) {
        return new AuthenticationError('authValidated.message;');
      } else if (!authValidated) {
        return new AuthenticationError('must be authenticated as admin');
      }
      return await queries.getProductHolders({ id: parent.id, name: parent.name });
    }
  },
  Mutation: {
    addProduct: async (rootValue, args, context) => {
      const { authValidated } = context;
      if (authValidated instanceof Error) {
        return new AuthenticationError('authValidated.message;');
      } else if (!authValidated) {
        return new AuthenticationError('must be authenticated as admin');
      }
      const { name, amount } = args;

      if (!name || !amount) return new UserInputError('Bad parameters');
      return await queries.addProduct({ name, amount });
    },
    updateProductStock: async (rootValue, args, context) => {
      const { authValidated } = context;
      if (authValidated instanceof Error) {
        return new AuthenticationError('authValidated.message;');
      } else if (!authValidated) {
        return new AuthenticationError('must be authenticated as admin');
      }
      const { productId, amount } = args;
      if (!productId || !amount) return new UserInputError('Bad parameters');
      return await queries.updateProductStock({ productId, amount });
    }
  }
};

export default ProductResolver;
