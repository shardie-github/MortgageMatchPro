import { gql } from 'graphql-yoga';

export const typeDefs = gql`
  type Query {
    hello: String
  }

  type Mutation {
    test: String
  }
`;

export const resolvers = {
  Query: {
    hello: () => 'Hello from GraphQL!',
  },
  Mutation: {
    test: () => 'Test mutation',
  },
};