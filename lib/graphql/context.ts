import { PrismaClient } from '@prisma/client';

export interface GraphQLContext {
  prisma: PrismaClient;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const createContext = (): GraphQLContext => ({
  prisma: new PrismaClient(),
});