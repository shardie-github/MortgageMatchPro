import { createYoga } from 'graphql-yoga'
import { createContext } from '../../lib/graphql/context'
import { schema } from '../../lib/graphql/schema'

const yoga = createYoga({
  schema,
  context: createContext,
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://mortgagematchpro.com'] 
      : ['http://localhost:3000'],
    credentials: true,
  },
  graphiql: process.env.NODE_ENV === 'development',
})

export default yoga